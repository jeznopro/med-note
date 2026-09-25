// pdfWorker.ts - Lazy load pdfjs-dist & configure Web Worker only when needed (A1)

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

export async function initPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsLib = await import('pdfjs-dist');
      if (typeof window !== 'undefined') {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
      }
      return pdfjsLib;
    })();
  }
  return pdfjsPromise;
}
