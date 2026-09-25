import React, { useRef, useState, useEffect } from 'react';
import type { Page, CanvasTransform } from '../../types/document';
import type { ToolState } from '../../types/tools';
import type { PageHistory } from '../../engine/history';
import { NoteCanvas } from './NoteCanvas';
import { FileText, Plus } from 'lucide-react';

interface VirtualContinuousPageProps {
  page: Page;
  index: number;
  total: number;
  isActive: boolean;
  notebookId: string;
  pdfDataUrl?: string;
  toolState: ToolState;
  transform: CanvasTransform;
  isDarkMode: boolean;
  history: PageHistory;
  onPageChange: (updatedPage: Page) => void;
  onHistoryChange: () => void;
  isLastPage: boolean;
  onAutoAddNewPage?: (navigateNow?: boolean) => void;
  onSelectPage: (index: number) => void;
}

export const VirtualContinuousPage: React.FC<VirtualContinuousPageProps> = ({
  page,
  index,
  total,
  isActive,
  notebookId,
  pdfDataUrl,
  toolState,
  transform,
  isDarkMode,
  history,
  onPageChange,
  onHistoryChange,
  isLastPage,
  onAutoAddNewPage,
  onSelectPage,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize: First 2 pages or currently active page are mounted immediately.
  // Subsequent pages wait until scrolled near the viewport.
  const [isNearViewport, setIsNearViewport] = useState(() => index <= 1 || isActive);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    // Generous vertical rootMargin (1000px) pre-renders ~1 page before it scrolls into the viewport
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsNearViewport(entry.isIntersecting);
      },
      { rootMargin: '1000px 0px 1000px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Total pages <= 3 will render all pages directly
  const shouldRenderCanvas = isNearViewport || isActive || total <= 3;
  const zoom = transform.scale || 1;
  const scaledWidth = Math.round(page.width * zoom);
  const scaledHeight = Math.round(page.height * zoom);

  return (
    <div
      id={`page-container-${index}`}
      ref={containerRef}
      className="relative flex flex-col items-center"
      onClick={() => onSelectPage(index)}
      style={{
        minWidth: `${scaledWidth}px`,
        minHeight: `${scaledHeight + 28}px`,
      }}
    >
      <div className="text-[11px] font-mono text-slate-400 font-semibold mb-1 select-none">
        Trang {index + 1} / {total}
      </div>

      {shouldRenderCanvas ? (
        <NoteCanvas
          page={page}
          notebookId={notebookId}
          pdfDataUrl={pdfDataUrl}
          toolState={toolState}
          transform={transform}
          isDarkMode={isDarkMode}
          history={history}
          onPageChange={onPageChange}
          onHistoryChange={onHistoryChange}
          isLastPage={isLastPage}
          onAutoAddNewPage={onAutoAddNewPage}
        />
      ) : (
        <div
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
          className={`rounded-xs border shadow-sm flex flex-col items-center justify-center select-none transition-colors ${
            isDarkMode
              ? 'bg-zinc-900/90 border-zinc-800 text-zinc-600'
              : 'bg-white border-slate-200 text-slate-400'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center">
              <FileText className="w-6 h-6 stroke-[1.5] text-slate-400 dark:text-zinc-500" />
            </div>
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-zinc-400">
              Trang {index + 1}
            </span>
            {page.strokes && page.strokes.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400">
                {page.strokes.length} nét vẽ
              </span>
            )}
          </div>
        </div>
      )}

      {/* When virtualized and on the last page, show the new page prompt */}
      {!shouldRenderCanvas && isLastPage && (
        <div className="w-full flex flex-col items-center gap-2 pt-8 pb-14 select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAutoAddNewPage?.(true);
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 shadow-md hover:shadow-lg hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo & viết tiếp trang mới (Trang {page.pageNumber + 1})</span>
          </button>
        </div>
      )}
    </div>
  );
};
