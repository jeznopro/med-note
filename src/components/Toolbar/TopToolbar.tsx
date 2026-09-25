import React, { useState } from 'react';
import {
  PenLine,
  Highlighter,
  Eraser,
  Hand,
  Undo2,
  Redo2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Trash2,
  LayoutTemplate,
  ChevronDown,
  X,
  Share2,
  Download,
  Image as ImageIcon,
  RefreshCw,
  ScrollText,
  FileText,
  Pencil,
} from 'lucide-react';
import { GoogleDriveIcon } from '../Icons/GoogleIcons';
import type { CloudAccount } from '../../services/googleDrive';
import type { ToolState } from '../../types/tools';
import { MEDICAL_PEN_COLORS, MEDICAL_HIGHLIGHTER_COLORS, PEN_SIZE_PRESETS, HIGHLIGHTER_SIZE_PRESETS } from '../../types/tools';
import type { PageTemplate, ToolType } from '../../types/document';

export interface OpenTab {
  id: string;
  title: string;
}

interface TopToolbarProps {
  onBackToLibrary: () => void;
  openTabs: OpenTab[];
  activeNotebookId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  toolState: ToolState;
  onToolChange: (tool: ToolType) => void;
  onPenColorChange: (color: string) => void;
  onPenSizeChange: (size: number) => void;
  onHighlighterColorChange: (color: string) => void;
  onHighlighterSizeChange: (size: number) => void;
  onEraserSizeChange: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  currentPageIndex: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onSelectPage?: (index: number) => void;
  scrollMode?: 'continuous' | 'single';
  onToggleScrollMode?: () => void;
  currentTemplate: PageTemplate;
  onTemplateChange: (template: PageTemplate) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onClearPage: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isCloudConnected: boolean;
  cloudAccount?: CloudAccount | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  onOpenCloudSettings: () => void;
  isPencilMode?: boolean;
  onTogglePencilMode?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  onBackToLibrary,
  openTabs,
  activeNotebookId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onExportPdf,
  onExportPng,
  isCloudConnected,
  cloudAccount,
  syncStatus,
  onOpenCloudSettings,
  toolState,
  onToolChange,
  onPenColorChange,
  onPenSizeChange,
  onHighlighterColorChange,
  onHighlighterSizeChange,
  onEraserSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  currentPageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  onAddPage,
  onSelectPage,
  scrollMode = 'continuous',
  onToggleScrollMode,
  currentTemplate,
  onTemplateChange,
  zoom,
  onZoomChange,
  onClearPage,
  isDarkMode,
  onToggleDarkMode,
  isPencilMode = true,
  onTogglePencilMode,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPageJump, setShowPageJump] = useState(false);
  const [showMobileTabPicker, setShowMobileTabPicker] = useState(false);

  const activeTab = openTabs.find((t) => t.id === activeNotebookId);

  const activeColor =
    toolState.currentTool === 'highlighter'
      ? toolState.highlighter.color
      : toolState.pen.color;

  const activeSize =
    toolState.currentTool === 'highlighter'
      ? toolState.highlighter.size
      : toolState.currentTool === 'pen'
      ? toolState.pen.size
      : toolState.eraser.size;

  const templates: { id: PageTemplate; label: string; desc: string }[] = [
    { id: 'ruled', label: 'Kẻ ngang (Ruled)', desc: 'Tiêu chuẩn cho ghi chép bài giảng' },
    { id: 'grid', label: 'Ô ly (Grid 5mm)', desc: 'Vẽ sơ đồ giải phẫu, đồ thị' },
    { id: 'dot', label: 'Chấm lưới (Dot Grid)', desc: 'Bullet journal, diagram' },
    { id: 'cornell', label: 'Cornell Notes', desc: 'Lý tưởng ôn thi y khoa (Cue + Notes + Summary)' },
    { id: 'blank', label: 'Trắng trơn (Blank)', desc: 'Tự do phác thảo' },
  ];

  return (
    <header className="flex flex-col z-30 select-none shadow-xs font-sans">
      {/* 1. TOP NAV BAR (Crisp Apple/GoodNotes Responsive Header) */}
      <div
        className={`h-11 px-2.5 sm:px-3 border-b flex items-center justify-between text-xs transition-colors ${
          isDarkMode
            ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
            : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        {/* Left: Back to Documents Library */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onBackToLibrary}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
              isDarkMode
                ? 'hover:bg-zinc-800 text-blue-400'
                : 'hover:bg-slate-100 text-blue-600'
            }`}
            title="Quay lại Thư viện tài liệu (Documents)"
          >
            <ChevronLeft className="w-4 h-4 text-blue-600 stroke-[2.5]" />
            <span className="tracking-tight text-xs text-slate-800 dark:text-zinc-200 hidden sm:inline">Documents</span>
            <span className="tracking-tight text-xs text-slate-800 dark:text-zinc-200 sm:hidden font-semibold">Docs</span>
          </button>
        </div>

        {/* Center: Open Document Tabs on Desktop (md:flex) vs Dropdown Switcher on Mobile (flex md:hidden) */}
        {/* Desktop Tabs */}
        <div className="hidden md:flex flex-1 items-center overflow-x-auto px-4 gap-1.5 scrollbar-none max-w-2xl">
          {openTabs.map((tab) => {
            const isActive = tab.id === activeNotebookId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg max-w-[200px] cursor-pointer text-xs transition-all ${
                  isActive
                    ? isDarkMode
                      ? 'bg-zinc-800 text-white font-bold shadow-xs'
                      : 'bg-blue-50/90 text-blue-700 font-bold border border-blue-200/80 shadow-2xs'
                    : isDarkMode
                    ? 'hover:bg-zinc-800/60 text-zinc-400'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 font-medium'
                }`}
              >
                <span className="truncate text-xs">{tab.title}</span>
                {openTabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className={`p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ${
                      isActive ? 'opacity-60 hover:opacity-100' : 'opacity-40 hover:opacity-80'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* New Tab Button */}
          <button
            onClick={onNewTab}
            title="Mở thêm sổ tay mới"
            className={`p-1.5 rounded-lg cursor-pointer transition-colors shrink-0 ${
              isDarkMode
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Mobile Active Notebook Title & Dropdown Switcher */}
        <div className="flex md:hidden items-center relative gap-1 max-w-[150px] sm:max-w-[220px]">
          <button
            onClick={() => setShowMobileTabPicker(!showMobileTabPicker)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-xs font-semibold cursor-pointer truncate max-w-full"
            title="Bấm để chuyển sổ tay đang mở"
          >
            <span className="truncate">{activeTab?.title || 'Sổ tay'}</span>
            {openTabs.length > 1 && <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />}
          </button>

          {showMobileTabPicker && openTabs.length > 1 && (
            <div className="absolute top-full left-0 mt-1 p-1.5 rounded-xl border shadow-2xl z-50 w-52 backdrop-blur-2xl bg-white/95 dark:bg-zinc-900/95 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-zinc-100">
              <div className="text-[10px] font-bold px-2 py-1 text-slate-400 uppercase">Sổ tay đang mở</div>
              {openTabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setShowMobileTabPicker(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                    tab.id === activeNotebookId
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{tab.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cloud Sync, Export Menu & Dark mode */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Google Drive Login / Auto-Sync Button */}
          <button
            onClick={onOpenCloudSettings}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-2xs group ${
              isCloudConnected
                ? isDarkMode
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isDarkMode
                ? 'bg-zinc-850 hover:bg-zinc-800 text-blue-400 border border-zinc-700 hover:border-blue-500'
                : 'bg-blue-50/90 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-400'
            }`}
            title={
              isCloudConnected
                ? `Tài khoản Google: ${cloudAccount?.email || 'Google Drive'} • Đang tự động sao lưu`
                : 'Đăng nhập Google Drive để tự động sao lưu dữ liệu'
            }
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            ) : (
              <GoogleDriveIcon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110" />
            )}
            <span className="text-[11px] font-bold hidden sm:inline">
              {syncStatus === 'syncing'
                ? 'Đang lưu Drive...'
                : isCloudConnected
                ? 'Đã kết nối Drive'
                : 'Đăng nhập Drive'}
            </span>
            {isCloudConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>

          {/* Share / Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                isDarkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title="Xuất file (PDF / PNG)"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline text-xs">Export</span>
            </button>

            {showExportMenu && (
              <div
                className={`absolute top-full right-0 mt-1 p-1.5 rounded-xl border shadow-2xl z-50 w-52 ${
                  isDarkMode
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-slate-200 text-slate-800 shadow-xl'
                }`}
              >
                <button
                  onClick={() => {
                    onExportPdf();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
                >
                  <Download className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-semibold">Xuất PDF hoàn chỉnh</div>
                    <div className="text-[10px] text-slate-400">Gộp trang PDF gốc + nét vẽ</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onExportPng();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-semibold">Xuất trang ra ảnh PNG</div>
                    <div className="text-[10px] text-slate-400">Độ nét cao để chèn Anki</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
            className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* 2. SECOND TOOLBAR: The Drawing Toolbar (Apple Minimalist Pure White - Exact Image 2 Style) */}
      <div
        className={`h-12 border-b flex items-center justify-between px-2 sm:px-4 text-xs transition-colors overflow-x-auto scrollbar-none gap-2 sm:gap-3 shrink-0 ${
          isDarkMode
            ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
            : 'bg-white border-slate-200/90 text-slate-700'
        }`}
      >
        {/* Left: Undo / Redo */}
        <div className="flex items-center gap-1 mr-2 shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Hoàn tác (Ctrl+Z)"
            className={`p-1.5 rounded-lg transition-all ${
              canUndo
                ? 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer'
                : 'opacity-30 cursor-not-allowed text-slate-400'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Làm lại (Ctrl+Y)"
            className={`p-1.5 rounded-lg transition-all ${
              canRedo
                ? 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer'
                : 'opacity-30 cursor-not-allowed text-slate-400'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Main GoodNotes Drawing Tools (Image 2 Style) */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center p-0.5 rounded-xl border ${
              isDarkMode
                ? 'bg-zinc-800/80 border-zinc-700/60'
                : 'bg-slate-100/90 border-slate-200/80'
            }`}
          >
            {/* Pen */}
            <button
              onClick={() => onToolChange('pen')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                toolState.currentTool === 'pen'
                  ? 'bg-white dark:bg-zinc-700 shadow-xs text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Bút mực (Pen)"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Bút</span>
            </button>

            {/* Highlighter */}
            <button
              onClick={() => onToolChange('highlighter')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                toolState.currentTool === 'highlighter'
                  ? 'bg-white dark:bg-zinc-700 shadow-xs text-amber-500 font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Bút dạ quang (Highlighter)"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Highlight</span>
            </button>

            {/* Eraser */}
            <button
              onClick={() => onToolChange('eraser')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                toolState.currentTool === 'eraser'
                  ? 'bg-white dark:bg-zinc-700 shadow-xs text-red-500 font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Cục tẩy (Eraser)"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tẩy</span>
            </button>

            {/* Pan */}
            <button
              onClick={() => onToolChange('pan')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                toolState.currentTool === 'pan'
                  ? 'bg-white dark:bg-zinc-700 shadow-xs text-emerald-600 font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
              title="Cuộn trang (Hand/Pan)"
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cuộn</span>
            </button>
          </div>

          {/* Apple Pencil Discrimination Mode Toggle */}
          {onTogglePencilMode && (
            <button
              onClick={onTogglePencilMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isPencilMode
                  ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                  : 'bg-slate-100/70 dark:bg-zinc-800/70 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
              title={
                isPencilMode
                  ? 'Chế độ Bút Apple Pencil: Bút để viết, Ngón tay để cuộn trang (Tự động chống tì đè tay)'
                  : 'Chế độ cảm ứng thường: Ngón tay cũng vẽ được mực'
              }
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isPencilMode ? 'Bút iPad' : 'Ngón tay'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPencilMode ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-zinc-600'
                }`}
              />
            </button>
          )}

          {/* Color Palette Quick Buttons (Image 2 style: 3 round circles + color picker chevron) */}
          {toolState.currentTool !== 'eraser' && toolState.currentTool !== 'pan' && (
            <div className="relative flex items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                {(toolState.currentTool === 'pen'
                  ? MEDICAL_PEN_COLORS.slice(0, 4)
                  : MEDICAL_HIGHLIGHTER_COLORS.slice(0, 4)
                ).map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      if (toolState.currentTool === 'pen') onPenColorChange(c.value);
                      else onHighlighterColorChange(c.value);
                    }}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      activeColor === c.value
                        ? 'scale-115 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-900 shadow-xs'
                        : 'hover:scale-105 border-slate-300 dark:border-zinc-700'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>

              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs text-slate-500 cursor-pointer"
                title="Mở rộng bảng màu Y khoa"
              >
                <ChevronDown className="w-3 h-3" />
              </button>

              {showColorPicker && (
                <div
                  className={`absolute top-9 left-0 p-3 rounded-xl border shadow-2xl z-50 w-64 ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold mb-2 text-slate-400 uppercase tracking-wider">
                    Bảng màu Y khoa chuẩn
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(toolState.currentTool === 'pen'
                      ? MEDICAL_PEN_COLORS
                      : MEDICAL_HIGHLIGHTER_COLORS
                    ).map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          if (toolState.currentTool === 'pen') onPenColorChange(c.value);
                          else onHighlighterColorChange(c.value);
                          setShowColorPicker(false);
                        }}
                        className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer text-[10px]"
                      >
                        <div
                          className={`w-6 h-6 rounded-full border ${
                            activeColor === c.value
                              ? 'ring-2 ring-blue-500 ring-offset-1 shadow-2xs'
                              : 'border-slate-300 dark:border-zinc-700'
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                        <span className="truncate w-full text-center">{c.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

              {/* Stroke Size Presets (Image 2 style: 3 size presets) */}
              <div className="flex items-center gap-1">
                {(toolState.currentTool === 'pen'
                  ? PEN_SIZE_PRESETS
                  : HIGHLIGHTER_SIZE_PRESETS
                ).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      if (toolState.currentTool === 'pen') onPenSizeChange(size);
                      else onHighlighterSizeChange(size);
                    }}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      activeSize === size
                        ? 'bg-slate-200 dark:bg-zinc-700 text-blue-600'
                        : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500'
                    }`}
                    title={`${size}px`}
                  >
                    <div
                      className="rounded-full bg-current"
                      style={{
                        width: `${Math.max(3, Math.min(12, size * 1.5))}px`,
                        height: `${Math.max(3, Math.min(12, size * 1.5))}px`,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {toolState.currentTool === 'eraser' && (
            <div className="flex items-center gap-1 ml-2">
              {[14, 26, 42].map((size) => (
                <button
                  key={size}
                  onClick={() => onEraserSizeChange(size)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    toolState.eraser.size === size
                      ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900'
                      : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500'
                  }`}
                >
                  {size === 14 ? 'Nhỏ' : size === 26 ? 'Vừa' : 'Lớn'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Template, Pagination, Zoom, Clear */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Template Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer shadow-2xs"
              title="Chọn mẫu giấy (Template)"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden lg:inline capitalize">
                {currentTemplate === 'ruled' ? 'Kẻ ngang' : currentTemplate === 'grid' ? 'Ô ly' : currentTemplate === 'cornell' ? 'Cornell' : currentTemplate === 'dot' ? 'Chấm bi' : 'Trắng'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showTemplatePicker && (
              <div
                className={`absolute top-9 right-0 p-2 rounded-xl border shadow-2xl z-50 w-64 ${
                  isDarkMode
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-[10px] font-bold px-2 py-1 text-slate-400 uppercase">
                  Mẫu trang ghi chú Y khoa
                </div>
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      onTemplateChange(tpl.id);
                      setShowTemplatePicker(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex flex-col gap-0.5 cursor-pointer transition-colors ${
                      currentTemplate === tpl.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>{tpl.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{tpl.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scroll Mode Toggle (Continuous Vertical vs Single Page) */}
          {onToggleScrollMode && (
            <button
              onClick={onToggleScrollMode}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs cursor-pointer transition-all shadow-2xs ${
                scrollMode === 'continuous'
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'
              }`}
              title={
                scrollMode === 'continuous'
                  ? 'Đang ở chế độ: Cuộn dọc liên tục (như GoodNotes) • Bấm để chuyển sang từng trang'
                  : 'Đang ở chế độ: Từng trang • Bấm để chuyển sang cuộn dọc liên tục'
              }
            >
              {scrollMode === 'continuous' ? (
                <>
                  <ScrollText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden xl:inline text-[11px]">Cuộn liên tục</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px]">Từng trang</span>
                </>
              )}
            </button>
          )}

          {/* Page navigation with Quick Jump popup */}
          <div className="relative">
            <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-zinc-800 px-2 py-0.5 rounded-lg text-xs">
              <button
                onClick={onPrevPage}
                disabled={currentPageIndex <= 0}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Trang trước (←)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowPageJump(!showPageJump)}
                className="font-mono px-1 font-bold text-[11px] hover:text-blue-600 cursor-pointer hover:underline flex items-center gap-0.5"
                title="Bấm để chọn nhanh trang"
              >
                <span>
                  {currentPageIndex + 1} / {totalPages}
                </span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>
              <button
                onClick={onNextPage}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  currentPageIndex >= totalPages - 1
                    ? 'hover:bg-blue-100 text-blue-600 font-bold'
                    : 'hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                }`}
                title={
                  currentPageIndex >= totalPages - 1
                    ? 'Đang ở trang cuối • Bấm để tự động tạo và sang trang mới'
                    : 'Trang tiếp theo (→)'
                }
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onAddPage}
                title="Thêm trang mới"
                className="p-1 ml-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 rounded cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Page Jump Dropdown */}
            {showPageJump && onSelectPage && (
              <div
                className={`absolute top-9 right-0 p-2 rounded-xl border shadow-2xl z-50 w-44 max-h-60 overflow-y-auto ${
                  isDarkMode
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-[10px] font-bold px-2 py-1 text-slate-400 uppercase">
                  Nhảy tới trang ({totalPages} trang)
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectPage(idx);
                        setShowPageJump(false);
                      }}
                      className={`h-7 rounded-md font-mono text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                        idx === currentPageIndex
                          ? 'bg-blue-600 text-white font-bold'
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

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-zinc-800 px-1.5 py-0.5 rounded-lg text-xs">
            <button
              onClick={() => onZoomChange(Math.max(0.4, zoom - 0.1))}
              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onZoomChange(1.0)}
              className="font-mono text-[11px] px-1 hover:underline cursor-pointer"
              title="Khôi phục 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clear Page */}
          <button
            onClick={onClearPage}
            title="Xóa toàn bộ nét vẽ trên trang"
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded-lg cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
