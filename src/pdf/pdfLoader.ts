import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Notebook, Page } from '../types/document';
import { savePdfBinary, getPdfBinary } from '../services/pdfStorage';

// Configure pdfjs worker with fallback
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

// Cache loaded PDF documents & in-flight promises
const pdfDocCache = new Map<string, pdfjsLib.PDFDocumentProxy>();
const pdfDocPromiseCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>();

// Cache loaded PDF page proxies (worker communication deduplication)
const pageProxyCache = new Map<string, Promise<pdfjsLib.PDFPageProxy>>();

// High-speed LRU memory cache for rendered PDF pages (instant tab switching & smooth scrolling)
const renderedPageCache = new Map<string, HTMLCanvasElement>();
const MAX_RENDERED_PAGES_CACHE = 24;

// Active render tasks per target canvas
const activeRenderTasks = new WeakMap<HTMLCanvasElement, { cancel: () => void }>();

// Cancel active pdf.js render task on a specific canvas element
export function cancelActiveRender(canvas: HTMLCanvasElement): void {
  const existingTask = activeRenderTasks.get(canvas);
  if (existingTask) {
    try {
      existingTask.cancel();
    } catch {
      // Ignore cancellation exceptions
    }
    activeRenderTasks.delete(canvas);
  }
}

// Miniature thumbnail cache
const thumbnailCache = new Map<string, string>();

// Concurrency queue for background thumbnail generation (max 2 parallel renders)
const MAX_CONCURRENT_THUMBNAILS = 2;
let activeThumbnailCount = 0;
const thumbnailQueue: Array<() => Promise<void>> = [];

function runNextThumbnailTask() {
  if (activeThumbnailCount >= MAX_CONCURRENT_THUMBNAILS || thumbnailQueue.length === 0) {
    return;
  }
  const nextTask = thumbnailQueue.shift();
  if (!nextTask) return;
  activeThumbnailCount++;
  nextTask().finally(() => {
    activeThumbnailCount--;
    runNextThumbnailTask();
  });
}

function queueThumbnailTask(task: () => Promise<void>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    thumbnailQueue.push(async () => {
      try {
        await task();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    runNextThumbnailTask();
  });
}

export async function getPdfDocument(
  source: string | ArrayBuffer | Uint8Array,
  notebookId?: string
): Promise<pdfjsLib.PDFDocumentProxy> {
  const primaryKey = notebookId || (typeof source === 'string' && source ? source : 'active_pdf_buffer');

  // 1. Check resolved document cache
  if (pdfDocCache.has(primaryKey)) {
    return pdfDocCache.get(primaryKey)!;
  }
  if (notebookId && pdfDocCache.has(notebookId)) {
    return pdfDocCache.get(notebookId)!;
  }

  // 2. Check pending promise cache (deduplicates concurrent fetches!)
  if (pdfDocPromiseCache.has(primaryKey)) {
    return pdfDocPromiseCache.get(primaryKey)!;
  }
  if (notebookId && pdfDocPromiseCache.has(notebookId)) {
    return pdfDocPromiseCache.get(notebookId)!;
  }

  // 3. Initiate single loading promise
  const loadPromise = (async () => {
    let binaryData: Uint8Array | null = null;

    if (source instanceof Uint8Array) {
      binaryData = source;
    } else if (source instanceof ArrayBuffer) {
      binaryData = new Uint8Array(source);
    } else if (typeof source === 'string' && source.startsWith('data:')) {
      // Base64 data URL
      const base64 = source.split(',')[1];
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      binaryData = bytes;
    } else if (typeof source === 'string' && source.startsWith('blob:')) {
      // Test if blob URL is still alive
      try {
        const resp = await fetch(source, { method: 'HEAD' });
        if (!resp.ok) {
          throw new Error('Blob URL revoked');
        }
      } catch {
        // Blob URL revoked after refresh! Recover from IndexedDB if notebookId is known
        if (notebookId) {
          const storedBuffer = await getPdfBinary(notebookId);
          if (storedBuffer) {
            binaryData = new Uint8Array(storedBuffer);
          }
        }
      }
    }

    // If still no binary data and we have notebookId, try IndexedDB
    if (!binaryData && notebookId) {
      const storedBuffer = await getPdfBinary(notebookId);
      if (storedBuffer) {
        binaryData = new Uint8Array(storedBuffer);
      }
    }

    let loadingTask: pdfjsLib.PDFDocumentLoadingTask;

    if (binaryData) {
      loadingTask = pdfjsLib.getDocument({
        data: binaryData,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });
    } else if (typeof source === 'string' && source) {
      loadingTask = pdfjsLib.getDocument({
        url: source,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });
    } else {
      throw new Error('No PDF source or stored data found');
    }

    const doc = await loadingTask.promise;
    pdfDocCache.set(primaryKey, doc);
    if (notebookId) {
      pdfDocCache.set(notebookId, doc);
    }
    return doc;
  })().finally(() => {
    pdfDocPromiseCache.delete(primaryKey);
    if (notebookId) {
      pdfDocPromiseCache.delete(notebookId);
    }
  });

  pdfDocPromiseCache.set(primaryKey, loadPromise);
  if (notebookId) {
    pdfDocPromiseCache.set(notebookId, loadPromise);
  }

  return loadPromise;
}

export async function renderPdfPageToContext(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  dpr: number = 1,
  notebookId?: string
): Promise<void> {
  // Cancel previous render on this canvas if active
  cancelActiveRender(canvas);

  const pixelWidth = Math.round(targetWidth * dpr);
  const pixelHeight = Math.round(targetHeight * dpr);
  const cacheKey = `${notebookId || 'pdf'}_p${pageNumber}_${pixelWidth}x${pixelHeight}`;

  // Instant path: reuse cached rendered page offscreen canvas (0.1ms render!)
  if (renderedPageCache.has(cacheKey)) {
    const cachedCanvas = renderedPageCache.get(cacheKey)!;
    const mainCtx = canvas.getContext('2d');
    if (mainCtx) {
      mainCtx.save();
      mainCtx.setTransform(1, 0, 0, 1, 0, 0);
      mainCtx.clearRect(0, 0, canvas.width, canvas.height);
      mainCtx.drawImage(cachedCanvas, 0, 0);
      mainCtx.restore();
    }
    return;
  }

  try {
    const pageProxyKey = `${notebookId || 'doc'}_page_${pageNumber}`;
    let pagePromise = pageProxyCache.get(pageProxyKey);
    if (!pagePromise) {
      pagePromise = pdfDoc.getPage(pageNumber);
      pageProxyCache.set(pageProxyKey, pagePromise);
    }
    const page = await pagePromise;

    // Offscreen rendering to prevent canvas race conditions and flickering
    const offscreen = document.createElement('canvas');
    offscreen.width = pixelWidth;
    offscreen.height = pixelHeight;
    const offscreenCtx = offscreen.getContext('2d', { alpha: false });
    if (!offscreenCtx) return;

    // Fill white background for PDF page
    offscreenCtx.fillStyle = '#FFFFFF';
    offscreenCtx.fillRect(0, 0, pixelWidth, pixelHeight);

    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(
      pixelWidth / unscaledViewport.width,
      pixelHeight / unscaledViewport.height
    );

    const viewport = page.getViewport({ scale });

    // Center page if there is remaining padding
    const offsetX = Math.max(0, (pixelWidth - viewport.width) / 2);
    const offsetY = Math.max(0, (pixelHeight - viewport.height) / 2);

    if (offsetX > 0 || offsetY > 0) {
      offscreenCtx.translate(offsetX, offsetY);
    }

    const renderTask = (page as unknown as {
      render: (ctx: unknown) => { promise: Promise<void>; cancel: () => void };
    }).render({
      canvasContext: offscreenCtx,
      viewport,
    });

    activeRenderTasks.set(canvas, renderTask);
    await renderTask.promise;
    activeRenderTasks.delete(canvas);

    // Save to high-speed LRU memory cache
    if (renderedPageCache.size >= MAX_RENDERED_PAGES_CACHE) {
      const oldestKey = renderedPageCache.keys().next().value;
      if (oldestKey) renderedPageCache.delete(oldestKey);
    }
    renderedPageCache.set(cacheKey, offscreen);

    // Draw offscreen content directly onto the target canvas
    const mainCtx = canvas.getContext('2d');
    if (!mainCtx) return;

    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.clearRect(0, 0, canvas.width, canvas.height);
    mainCtx.drawImage(offscreen, 0, 0);
    mainCtx.restore();
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'RenderingCancelledException') {
      return;
    }
    console.error(`Failed to render PDF page ${pageNumber}:`, err);
    throw err;
  }
}

// Generate miniature thumbnail data URL with concurrency limiting and cache
export async function getPdfThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  notebookId: string,
  thumbWidth = 140
): Promise<string> {
  const thumbKey = `${notebookId}_page_${pageNumber}_w${thumbWidth}`;
  if (thumbnailCache.has(thumbKey)) {
    return thumbnailCache.get(thumbKey)!;
  }

  return new Promise<string>((resolve) => {
    queueThumbnailTask(async () => {
      // Re-check cache in case it was resolved while queued
      if (thumbnailCache.has(thumbKey)) {
        resolve(thumbnailCache.get(thumbKey)!);
        return;
      }

      try {
        const pageProxyKey = `${notebookId}_page_${pageNumber}`;
        let pagePromise = pageProxyCache.get(pageProxyKey);
        if (!pagePromise) {
          pagePromise = pdfDoc.getPage(pageNumber);
          pageProxyCache.set(pageProxyKey, pagePromise);
        }
        const page = await pagePromise;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = thumbWidth / unscaledViewport.width;
        const thumbHeight = Math.round(unscaledViewport.height * scale);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          resolve('');
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, thumbWidth, thumbHeight);

        const renderTask = (page as unknown as {
          render: (ctx: unknown) => { promise: Promise<void> };
        }).render({
          canvasContext: ctx,
          viewport,
        });

        await renderTask.promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        thumbnailCache.set(thumbKey, dataUrl);
        resolve(dataUrl);
      } catch (e) {
        console.warn(`Failed to generate thumbnail for page ${pageNumber}:`, e);
        resolve('');
      }
    });
  });
}

export async function createNotebookFromPdf(file: File): Promise<Notebook> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const notebookId = `nb_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // 1. Persist PDF binary in IndexedDB immediately so it never disappears on refresh
  await savePdfBinary(notebookId, arrayBuffer, file.name);

  // 2. Create blob URL for in-memory session access
  const blobUrl = URL.createObjectURL(new Blob([uint8Array], { type: 'application/pdf' }));

  // 3. Load PDF document directly from memory buffer
  const pdfDoc = await getPdfDocument(uint8Array, notebookId);
  pdfDocCache.set(blobUrl, pdfDoc);
  pdfDocCache.set(notebookId, pdfDoc);

  const numPages = pdfDoc.numPages;
  const pages: Page[] = [];

  for (let i = 1; i <= numPages; i++) {
    const pdfPage = await pdfDoc.getPage(i);
    const viewport = pdfPage.getViewport({ scale: 1.0 });

    const standardWidth = 820;
    const standardHeight = Math.round((standardWidth * viewport.height) / viewport.width);

    pages.push({
      id: `page_pdf_${notebookId}_${i}`,
      pageNumber: i,
      width: standardWidth,
      height: standardHeight,
      template: 'blank',
      strokes: [],
      pdfPageNumber: i,
    });
  }

  const cleanTitle = file.name.replace(/\.pdf$/i, '');

  return {
    id: notebookId,
    title: cleanTitle,
    subject: 'Tài liệu PDF',
    pdfDataUrl: blobUrl,
    pdfFileName: file.name,
    pages,
    currentPageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
