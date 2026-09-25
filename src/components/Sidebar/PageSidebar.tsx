import React from 'react';
import type { Page } from '../../types/document';
import { Plus, Trash2, Copy, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface PageSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pages: Page[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  isDarkMode: boolean;
}

export const PageSidebar: React.FC<PageSidebarProps> = ({
  isOpen,
  onToggle,
  pages,
  currentPageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  isDarkMode,
}) => {
  return (
    <aside
      className={`h-[calc(100vh-3.5rem)] border-r flex flex-col z-20 select-none transition-all duration-200 ${
        isDarkMode
          ? 'bg-zinc-900/95 border-zinc-800 text-zinc-300'
          : 'bg-white border-slate-200 text-slate-700'
      } ${isOpen ? 'w-60' : 'w-12'}`}
    >
      <div className="h-12 border-b flex items-center justify-between px-3 border-inherit">
        {isOpen && (
          <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-600 dark:text-zinc-400">
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Trang ghi chú ({pages.length})</span>
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
                onClick={() => onSelectPage(index)}
                className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2 ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                }`}
              >
                <div
                  className={`w-full aspect-[1/1.414] rounded-md border flex items-center justify-center relative overflow-hidden ${
                    isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <span className="text-[11px] font-mono text-zinc-400 font-bold">
                    Trang {index + 1}
                  </span>
                  {page.strokes.length > 0 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 font-mono">
                      {page.strokes.length} nét
                    </span>
                  )}
                </div>

                <div className="w-full flex items-center justify-between text-xs px-1">
                  <span className="font-medium truncate capitalize text-zinc-500">
                    {page.template}
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
        <div className="flex-1 flex flex-col items-center py-3 gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => onSelectPage(index)}
              className={`w-7 h-7 rounded-lg text-xs font-mono font-semibold flex items-center justify-center transition-colors cursor-pointer ${
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
            className="w-7 h-7 mt-2 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-400 flex items-center justify-center text-zinc-400 hover:text-blue-500 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
};
