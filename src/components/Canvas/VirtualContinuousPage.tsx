import React, { useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  notebookTitle?: string;
  pdfFileName?: string;
  drivePdfFileId?: string;
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
  isPencilMode?: boolean;
}

const VirtualContinuousPageComponent: React.FC<VirtualContinuousPageProps> = ({
  page,
  index,
  total,
  isActive,
  notebookId,
  notebookTitle,
  pdfFileName,
  drivePdfFileId,
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
  isPencilMode = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize: First 2 pages or currently active page are mounted immediately.
  const [isNearViewport, setIsNearViewport] = useState(() => index <= 1 || isActive);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

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

  const shouldRenderCanvas = isNearViewport || isActive || total <= 3;
  const zoom = transform.scale || 1;
  const scaledWidth = Math.round(page.width * zoom);
  const scaledHeight = Math.round(page.height * zoom);

  return (
    <div
      id={`page-container-${index}`}
      ref={containerRef}
      className="relative flex flex-col items-center mx-auto"
      onClick={() => onSelectPage(index)}
      style={{
        width: `${scaledWidth}px`,
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
          notebookTitle={notebookTitle}
          pdfFileName={pdfFileName}
          drivePdfFileId={drivePdfFileId}
          pdfDataUrl={pdfDataUrl}
          toolState={toolState}
          transform={transform}
          isDarkMode={isDarkMode}
          history={history}
          onPageChange={onPageChange}
          onHistoryChange={onHistoryChange}
          isLastPage={isLastPage}
          onAutoAddNewPage={onAutoAddNewPage}
          isPencilMode={isPencilMode}
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

// A3: Memoize individual VirtualContinuousPage by page reference, scale, and tool state
export const VirtualContinuousPage = React.memo(VirtualContinuousPageComponent, (prev, next) => {
  return (
    prev.page === next.page &&
    prev.index === next.index &&
    prev.total === next.total &&
    prev.isActive === next.isActive &&
    prev.isLastPage === next.isLastPage &&
    prev.notebookId === next.notebookId &&
    prev.notebookTitle === next.notebookTitle &&
    prev.pdfFileName === next.pdfFileName &&
    prev.drivePdfFileId === next.drivePdfFileId &&
    prev.pdfDataUrl === next.pdfDataUrl &&
    prev.transform.scale === next.transform.scale &&
    prev.transform.offsetX === next.transform.offsetX &&
    prev.transform.offsetY === next.transform.offsetY &&
    prev.isDarkMode === next.isDarkMode &&
    prev.isPencilMode === next.isPencilMode &&
    prev.toolState === next.toolState
  );
});

// A2: Virtualized Continuous Page List powered by @tanstack/react-virtual
interface VirtualizedPageListProps {
  pages: Page[];
  currentPageIndex: number;
  notebookId: string;
  notebookTitle?: string;
  pdfFileName?: string;
  drivePdfFileId?: string;
  pdfDataUrl?: string;
  toolState: ToolState;
  transform: CanvasTransform;
  isDarkMode: boolean;
  getPageHistory: (pageId: string) => PageHistory;
  onSpecificPageChange: (index: number, updatedPage: Page) => void;
  onHistoryChange: () => void;
  onAutoAddNewPage: (navigateNow?: boolean) => void;
  onSelectPage: (index: number) => void;
  isPencilMode: boolean;
}

export const VirtualizedPageList: React.FC<VirtualizedPageListProps> = ({
  pages,
  currentPageIndex,
  notebookId,
  notebookTitle,
  pdfFileName,
  drivePdfFileId,
  pdfDataUrl,
  toolState,
  transform,
  isDarkMode,
  getPageHistory,
  onSpecificPageChange,
  onHistoryChange,
  onAutoAddNewPage,
  onSelectPage,
  isPencilMode,
}) => {
  const zoom = transform.scale || 1;
  const GAP_PX = 32;

  // For notebooks with > 15 pages, use @tanstack/react-virtual windowing so DOM never bloats
  const useWindowVirtualizer = pages.length > 15;

  const rowVirtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => document.getElementById('editor-main-container'),
    estimateSize: (index) => {
      const p = pages[index];
      const h = p ? Math.round(p.height * zoom) : Math.round(1160 * zoom);
      const isLast = index === pages.length - 1;
      return h + 28 + GAP_PX + (isLast ? 110 : 0);
    },
    overscan: 2,
    enabled: useWindowVirtualizer,
  });

  // Compute maximum scaled width across all pages (or fallback to standard 820 * zoom)
  const maxScaledWidth = React.useMemo(() => {
    return pages.reduce((max, p) => Math.max(max, Math.round(p.width * zoom)), Math.round(820 * zoom));
  }, [pages, zoom]);

  if (!useWindowVirtualizer) {
    return (
      <div
        className="w-full min-w-full flex flex-col items-center gap-8 py-8 pb-36 min-h-full mx-auto"
        style={{
          minWidth: `max(100%, ${maxScaledWidth + 32}px)`,
        }}
      >
        {pages.map((p, idx) => (
          <VirtualContinuousPage
            key={p.id}
            page={p}
            index={idx}
            total={pages.length}
            isActive={currentPageIndex === idx}
            notebookId={notebookId}
            notebookTitle={notebookTitle}
            pdfFileName={pdfFileName}
            drivePdfFileId={drivePdfFileId}
            pdfDataUrl={pdfDataUrl}
            toolState={toolState}
            transform={transform}
            isDarkMode={isDarkMode}
            history={getPageHistory(p.id)}
            onPageChange={(updatedPage) => onSpecificPageChange(idx, updatedPage)}
            onHistoryChange={onHistoryChange}
            isLastPage={idx === pages.length - 1}
            onAutoAddNewPage={onAutoAddNewPage}
            isPencilMode={isPencilMode}
            onSelectPage={onSelectPage}
          />
        ))}
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      className="w-full min-w-full flex flex-col items-center py-8 pb-36 relative mx-auto"
      style={{
        height: `${rowVirtualizer.getTotalSize() + 140}px`,
        minWidth: `max(100%, ${maxScaledWidth + 32}px)`,
        width: '100%',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const idx = virtualRow.index;
        const p = pages[idx];
        if (!p) return null;
        return (
          <div
            key={p.id}
            data-index={idx}
            ref={rowVirtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start + 32}px)`,
            }}
            className="flex flex-col items-center justify-center w-full"
          >
            <VirtualContinuousPage
              page={p}
              index={idx}
              total={pages.length}
              isActive={currentPageIndex === idx}
              notebookId={notebookId}
              notebookTitle={notebookTitle}
              pdfFileName={pdfFileName}
              drivePdfFileId={drivePdfFileId}
              pdfDataUrl={pdfDataUrl}
              toolState={toolState}
              transform={transform}
              isDarkMode={isDarkMode}
              history={getPageHistory(p.id)}
              onPageChange={(updatedPage) => onSpecificPageChange(idx, updatedPage)}
              onHistoryChange={onHistoryChange}
              isLastPage={idx === pages.length - 1}
              onAutoAddNewPage={onAutoAddNewPage}
              isPencilMode={isPencilMode}
              onSelectPage={onSelectPage}
            />
          </div>
        );
      })}
    </div>
  );
};
