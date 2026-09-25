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

// Cache loaded PDF documents in memory
const pdfDocCache = new Map<string, pdfjsLib.PDFDocumentProxy>();
const activeRenderTasks = new WeakMap<HTMLCanvasElement, { cancel: () => void }>();
const thumbnailCache = new Map<string, string>();

export async function getPdfDocument(
  source: string | ArrayBuffer | Uint8Array,
  notebookId?: string
): Promise<pdfjsLib.PDFDocumentProxy> {
  // 1. Check notebookId cache first if available
  if (notebookId && pdfDocCache.has(notebookId)) {
    return pdfDocCache.get(notebookId)!;
  }

  // 2. Check string/buffer cache key
  const cacheKey = typeof source === 'string' && source ? source : notebookId || 'active_pdf_buffer';
  if (pdfDocCache.has(cacheKey)) {
    return pdfDocCache.get(cacheKey)!;
  }

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

  const pdfDoc = await loadingTask.promise;
  pdfDocCache.set(cacheKey, pdfDoc);
  if (notebookId) {
    pdfDocCache.set(notebookId, pdfDoc);
  }
  return pdfDoc;
}

export async function renderPdfPageToContext(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  dpr: number = 1
): Promise<void> {
  // Cancel previous render on this canvas if active
  const existingTask = activeRenderTasks.get(canvas);
  if (existingTask) {
    try {
      existingTask.cancel();
    } catch {
      // Ignore cancellation
    }
    activeRenderTasks.delete(canvas);
  }

  try {
    const page = await pdfDoc.getPage(pageNumber);

    const pixelWidth = Math.round(targetWidth * dpr);
    const pixelHeight = Math.round(targetHeight * dpr);

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

// Generate miniature thumbnail data URL for a specific PDF page
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

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = thumbWidth / unscaledViewport.width;
    const thumbHeight = Math.round(unscaledViewport.height * scale);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = thumbWidth;
    canvas.height = thumbHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, thumbWidth, thumbHeight);

    const renderTask = (page as unknown as {
      render: (ctx: unknown) => { promise: Promise<void> };
    }).render({
      canvasContext: ctx,
      viewport,
    });

    await renderTask.promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    thumbnailCache.set(thumbKey, dataUrl);
    return dataUrl;
  } catch (e) {
    console.warn(`Failed to generate thumbnail for page ${pageNumber}:`, e);
    return '';
  }
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
