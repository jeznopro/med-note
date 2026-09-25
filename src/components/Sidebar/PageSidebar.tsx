import React, { useState, useEffect, useRef } from 'react';
import type { Page } from '../../types/document';
import { Plus, Trash2, Copy, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { getPdfDocument, getPdfThumbnail } from '../../pdf/pdfLoader';

interface PageSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pages: Page[];
  currentPageIndex: number;
  notebookId?: string;
  pdfDataUrl?: string;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  isDarkMode: boolean;
}

const PageThumbnailItem: React.FC<{
  page: Page;
  index: number;
  notebookId?: string;
  pdfDataUrl?: string;
  isDarkMode: boolean;
}> = ({ page, index, notebookId, pdfDataUrl, isDarkMode }) => {
  const [thumbUrl, setThumbUrl] = useState<string>('');
  const itemRef = useRef<HTMLDivElement | null>(null);
  // Only first 5 thumbnails load immediately; others load when scrolled into view
  const [isVisible, setIsVisible] = useState(() => index < 5);

  useEffect(() => {
    const el = itemRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px 0px 250px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    if (isVisible && page.pdfPageNumber && (pdfDataUrl || notebookId)) {
      getPdfDocument(pdfDataUrl || '', notebookId)
        .then((doc) => {
          if (!isCancelled && page.pdfPageNumber) {
            getPdfThumbnail(doc, page.pdfPageNumber, notebookId || 'nb', 160).then((url) => {
              if (!isCancelled && url) setThumbUrl(url);
            });
          }
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [isVisible, page.pdfPageNumber, notebookId, pdfDataUrl]);

  return (
    <div
      ref={itemRef}
      className={`w-full aspect-[1/1.414] rounded-md border flex items-center justify-center relative overflow-hidden ${
        isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200 shadow-2xs'
      }`}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={`Trang ${index + 1}`}
          className="w-full h-full object-contain pointer-events-none bg-white"
          loading="lazy"
        />
      ) : (
        <span className="text-[11px] font-mono text-zinc-400 font-bold">
          Trang {index + 1}
        </span>
      )}

      {/* Floating page number indicator */}
      <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded text-[9px] bg-black/60 text-white font-mono font-bold backdrop-blur-xs">
        {index + 1}
      </span>

      {page.strokes.length > 0 && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[9px] bg-blue-600 text-white font-mono font-semibold shadow-xs">
          {page.strokes.length} nét
        </span>
      )}
    </div>
  );
};

export const PageSidebar: React.FC<PageSidebarProps> = ({
  isOpen,
  onToggle,
  pages,
  currentPageIndex,
  notebookId,
  pdfDataUrl,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  isDarkMode,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-35 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 md:relative md:inset-auto md:z-20 md:h-[calc(100vh-3.5rem)] border-r flex flex-col select-none transition-all duration-300 backdrop-blur-2xl ${
          isDarkMode
            ? 'bg-zinc-900/95 border-zinc-800 text-zinc-300'
            : 'bg-white/95 border-slate-200 text-slate-700'
        } ${
          isOpen
            ? 'translate-x-0 md:w-60'
            : '-translate-x-full md:translate-x-0 md:w-12'
        } shadow-2xl md:shadow-none`}
      >
        <div className="h-12 border-b flex items-center justify-between px-3 border-inherit shrink-0">
          {isOpen && (
            <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-600 dark:text-zinc-400">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Tất cả trang ({pages.length})</span>
            </div>
          )}

          <button
            onClick={onToggle}
            title={isOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer ml-auto"
          >
            {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {isOpen ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pages.map((page, index) => {
              const isSelected = index === currentPageIndex;
              return (
                <div
                  key={page.id}
                  onClick={() => {
                    onSelectPage(index);
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  className={`group relative p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                  }`}
                >
                <PageThumbnailItem
                  page={page}
                  index={index}
                  notebookId={notebookId}
                  pdfDataUrl={pdfDataUrl}
                  isDarkMode={isDarkMode}
                />

                <div className="w-full flex items-center justify-between text-xs px-1">
                  <span className="font-medium truncate text-zinc-500 text-[11px]">
                    {page.pdfPageNumber ? `Trang PDF ${page.pdfPageNumber}` : page.template}
                  </span>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePage(index);
                      }}
                      title="Nhân bản trang"
                      className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-800"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(index);
                        }}
                        title="Xóa trang"
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-950/60 rounded text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={onAddPage}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 text-xs font-medium text-zinc-500 hover:text-blue-500 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm trang mới</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col items-center py-3 gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => onSelectPage(index)}
              title={`Chuyển đến trang ${index + 1}`}
              className={`w-7 h-7 rounded-lg text-xs font-mono font-semibold flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                index === currentPageIndex
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-200 dark:hover:bg-zinc-800 text-zinc-500'
              }`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={onAddPage}
            title="Thêm trang mới"
            className="w-7 h-7 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-500 flex items-center justify-center text-zinc-400 hover:text-blue-500 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
    </>
  );
};
