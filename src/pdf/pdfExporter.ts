import { jsPDF } from 'jspdf';
import type { Notebook, Page } from '../types/document';
import { generateStrokeOutline, drawOutline } from '../engine/stroke';
import { renderPageBackground } from '../engine/pageTemplate';
import { getPdfDocument, renderPdfPageToContext } from './pdfLoader';
import { getPdfBinary } from '../services/pdfStorage';

export async function renderFullPageToCanvas(
  page: Page,
  pdfDataUrl?: string,
  isDarkMode: boolean = false,
  notebookId?: string
): Promise<HTMLCanvasElement> {
  const dpr = 2; // high-resolution export
  const canvas = document.createElement('canvas');
  canvas.width = page.width * dpr;
  canvas.height = page.height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2d context for export');

  // 1. Render background (PDF page or Template)
  if (page.pdfPageNumber) {
    try {
      const pdfDoc = await getPdfDocument(pdfDataUrl || '', notebookId);
      await renderPdfPageToContext(pdfDoc, page.pdfPageNumber, canvas, page.width, page.height, dpr);
    } catch (err) {
      console.warn('Failed to load PDF page background:', err);
      ctx.save();
      ctx.scale(dpr, dpr);
      renderPageBackground(ctx, page.width, page.height, page.template, isDarkMode);
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.scale(dpr, dpr);
    renderPageBackground(ctx, page.width, page.height, page.template, isDarkMode);
    ctx.restore();
  }

  ctx.save();
  ctx.scale(dpr, dpr);

  // 2. Render Highlighters
  for (const stroke of page.strokes) {
    if (stroke.tool === 'highlighter') {
      const outline = generateStrokeOutline(stroke.points, 'highlighter', stroke.size);
      drawOutline(ctx, outline, stroke.color, stroke.opacity, true);
    }
  }

  // 3. Render Pen strokes
  for (const stroke of page.strokes) {
    if (stroke.tool === 'pen') {
      const outline = generateStrokeOutline(stroke.points, 'pen', stroke.size);
      drawOutline(ctx, outline, stroke.color, stroke.opacity, false);
    }
  }

  ctx.restore();

  return canvas;
}

export async function exportCurrentPageAsPng(
  page: Page,
  title: string,
  pdfDataUrl?: string,
  isDarkMode: boolean = false,
  notebookId?: string
) {
  const canvas = await renderFullPageToCanvas(page, pdfDataUrl, isDarkMode, notebookId);
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${title}_Trang_${page.pageNumber}.png`;
  link.href = dataUrl;
  link.click();
}

export async function generateNotebookPdfBlob(
  notebook: Notebook,
  isDarkMode: boolean = false,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (!notebook.pages || notebook.pages.length === 0) {
    return new Blob([], { type: 'application/pdf' });
  }

  // 1. Instant pristine PDF export for imported PDFs with no handwritten strokes:
  // If the user hasn't written any strokes, return the exact original PDF from IndexedDB in 0ms!
  const hasStrokes = notebook.pages.some((p) => p.strokes && p.strokes.length > 0);
  if (!hasStrokes) {
    try {
      const storedBuffer = await getPdfBinary(notebook.id);
      if (storedBuffer && storedBuffer.byteLength > 0) {
        return new Blob([storedBuffer], { type: 'application/pdf' });
      }
    } catch (e) {
      console.warn('Could not read stored PDF binary, falling back to canvas export:', e);
    }
  }

  // 2. High-quality vector + canvas composition for drawn notes or custom templates
  const firstPage = notebook.pages[0];
  const orientation = firstPage.width > firstPage.height ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: [firstPage.width, firstPage.height],
  });

  const total = notebook.pages.length;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);

    const page = notebook.pages[i];
    if (i > 0) {
      doc.addPage([page.width, page.height], page.width > page.height ? 'landscape' : 'portrait');
    }

    const canvas = await renderFullPageToCanvas(page, notebook.pdfDataUrl, isDarkMode, notebook.id);
    const imgData = canvas.toDataURL('image/jpeg', 0.90);

    doc.addImage(imgData, 'JPEG', 0, 0, page.width, page.height);
  }

  return doc.output('blob');
}

export async function exportNotebookAsPdf(
  notebook: Notebook,
  isDarkMode: boolean = false,
  onProgress?: (current: number, total: number) => void
) {
  const blob = await generateNotebookPdfBlob(notebook, isDarkMode, onProgress);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${notebook.title || 'MedNotes'}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
