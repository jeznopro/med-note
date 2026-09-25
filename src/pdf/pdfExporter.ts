import { jsPDF } from 'jspdf';
import type { Notebook, Page } from '../types/document';
import { generateStrokeOutline, drawOutline } from '../engine/stroke';
import { renderPageBackground } from '../engine/pageTemplate';
import { getPdfDocument, renderPdfPageToContext } from './pdfLoader';

export async function renderFullPageToCanvas(
  page: Page,
  pdfDataUrl?: string,
  isDarkMode: boolean = false
): Promise<HTMLCanvasElement> {
  const dpr = 2; // high-resolution export
  const canvas = document.createElement('canvas');
  canvas.width = page.width * dpr;
  canvas.height = page.height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2d context for export');

  // 1. Render background (PDF page or Template)
  if (pdfDataUrl && page.pdfPageNumber) {
    try {
      const pdfDoc = await getPdfDocument(pdfDataUrl);
      await renderPdfPageToContext(pdfDoc, page.pdfPageNumber, canvas, page.width, page.height, dpr);
    } catch {
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

  return canvas;
}

export async function exportCurrentPageAsPng(
  page: Page,
  title: string,
  pdfDataUrl?: string,
  isDarkMode: boolean = false
) {
  const canvas = await renderFullPageToCanvas(page, pdfDataUrl, isDarkMode);
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${title}_Trang_${page.pageNumber}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportNotebookAsPdf(
  notebook: Notebook,
  isDarkMode: boolean = false,
  onProgress?: (current: number, total: number) => void
) {
  if (notebook.pages.length === 0) return;

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

    const canvas = await renderFullPageToCanvas(page, notebook.pdfDataUrl, isDarkMode);
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    doc.addImage(imgData, 'JPEG', 0, 0, page.width, page.height);
  }

  doc.save(`${notebook.title || 'MedNotes'}.pdf`);
}

export async function generateNotebookPdfBlob(
  notebook: Notebook,
  isDarkMode: boolean = false,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (notebook.pages.length === 0) return new Blob([], { type: 'application/pdf' });

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

    const canvas = await renderFullPageToCanvas(page, notebook.pdfDataUrl, isDarkMode);
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    doc.addImage(imgData, 'JPEG', 0, 0, page.width, page.height);
  }

  return doc.output('blob');
}

