import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ScrollText, FileText, ChevronDown } from 'lucide-react';

interface BottomPageNavProps {
  currentPageIndex: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onSelectPage: (index: number) => void;
  scrollMode: 'continuous' | 'single';
  onToggleScrollMode: () => void;
  isDarkMode: boolean;
}

export const BottomPageNav: React.FC<BottomPageNavProps> = ({
  currentPageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  onAddPage,
  onSelectPage,
  scrollMode,
  onToggleScrollMode,
  isDarkMode,
}) => {
  const [showJumpMenu, setShowJumpMenu] = useState(false);

  return (
    <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 select-none pb-[env(safe-area-inset-bottom)] max-w-[calc(100vw-1.5rem)]">
      <div
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-300 ${
          isDarkMode
            ? 'bg-zinc-900/90 border-zinc-700 text-zinc-100 shadow-black/40'
            : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-300/40'
        }`}
      >
        {/* Previous Page Button */}
        <button
          onClick={onPrevPage}
          disabled={currentPageIndex <= 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          title="Trang trước (phím ←)"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Page Indicator & Select */}
        <button
          onClick={() => setShowJumpMenu(!showJumpMenu)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs font-bold font-mono cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
          title="Bấm để chọn trang nhanh"
        >
          <span className="text-blue-600 dark:text-blue-400">{currentPageIndex + 1}</span>
          <span className="text-slate-400">/</span>
          <span>{totalPages}</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
        </button>

        {/* Next Page Button */}
        <button
          onClick={onNextPage}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            currentPageIndex >= totalPages - 1
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
          title={
            currentPageIndex >= totalPages - 1
              ? 'Đang ở trang cuối • Bấm để thêm trang mới'
              : 'Trang tiếp theo (phím →)'
          }
        >
          <span className="hidden sm:inline">Tiếp</span>
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

        {/* View Mode Toggle: Continuous Scroll vs Single Page */}
        <button
          onClick={onToggleScrollMode}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            scrollMode === 'continuous'
              ? 'bg-blue-600 text-white font-semibold'
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
          }`}
          title={
            scrollMode === 'continuous'
              ? 'Đang bật: Cuộn dọc liên tục (như GoodNotes) • Bấm để đổi sang từng trang'
              : 'Đang bật: Từng trang • Bấm để đổi sang cuộn dọc liên tục'
          }
        >
          {scrollMode === 'continuous' ? (
            <>
              <ScrollText className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Cuộn dọc</span>
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Từng trang</span>
            </>
          )}
        </button>

        {/* Add Page Button */}
        <button
          onClick={onAddPage}
          className="p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
          title="Thêm trang ghi chú mới"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Quick Jump Dropdown Menu */}
      {showJumpMenu && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 rounded-2xl border shadow-2xl z-40 w-52 max-h-64 overflow-y-auto ${
            isDarkMode
              ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="text-[10px] font-bold px-2 py-1 text-slate-400 uppercase tracking-wider">
            Nhảy tới trang ({totalPages} trang)
          </div>
          <div className="grid grid-cols-4 gap-1.5 p-1">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectPage(idx);
                  setShowJumpMenu(false);
                }}
                className={`h-7 rounded-lg font-mono text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                  idx === currentPageIndex
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
