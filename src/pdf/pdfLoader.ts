import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Notebook, Page } from '../types/document';

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

export async function getPdfDocument(source: string | ArrayBuffer | Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  const cacheKey = typeof source === 'string' ? source : 'active_pdf_buffer';
  if (pdfDocCache.has(cacheKey)) {
    return pdfDocCache.get(cacheKey)!;
  }

  let loadingTask: pdfjsLib.PDFDocumentLoadingTask;

  if (typeof source === 'string') {
    loadingTask = pdfjsLib.getDocument({
      url: source,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
  } else {
    loadingTask = pdfjsLib.getDocument({
      data: source instanceof Uint8Array ? source : new Uint8Array(source),
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
  }

  const pdfDoc = await loadingTask.promise;
  pdfDocCache.set(cacheKey, pdfDoc);
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

export async function createNotebookFromPdf(file: File): Promise<Notebook> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Create a blob URL for fast zero-overhead loading
  const blobUrl = URL.createObjectURL(new Blob([uint8Array], { type: 'application/pdf' }));

  const pdfDoc = await getPdfDocument(blobUrl);
  const numPages = pdfDoc.numPages;

  const pages: Page[] = [];

  for (let i = 1; i <= numPages; i++) {
    const pdfPage = await pdfDoc.getPage(i);
    const viewport = pdfPage.getViewport({ scale: 1.0 });

    const standardWidth = 820;
    const standardHeight = Math.round((standardWidth * viewport.height) / viewport.width);

    pages.push({
      id: `page_pdf_${Date.now()}_${i}`,
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
    id: `nb_pdf_${Date.now()}`,
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
