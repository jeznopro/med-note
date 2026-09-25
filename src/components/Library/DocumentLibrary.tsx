import React, { useState, useRef, useEffect } from 'react';
import type { Notebook, Folder, LibrarySortBy, PageTemplate } from '../../types/document';
import {
  Folder as FolderIcon,
  FolderUp,
  Star,
  Plus,
  Search,
  Upload,
  BookOpen,
  Trash2,
  Copy,
  Download,
  Edit2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Bookmark,
  LayoutGrid,
  Palette,
  Sparkles,
  Activity,
  Heart,
} from 'lucide-react';
import { GoogleDriveIcon } from '../Icons/GoogleIcons';
import type { CloudAccount } from '../../services/googleDrive';
import { exportNotebookAsPdf } from '../../pdf/pdfExporter';
import { NewNotebookModal } from '../Modals/NewNotebookModal';
import { EditCoverModal, COVER_ICONS } from '../Modals/EditCoverModal';
import { EditFolderModal, FOLDER_COLORS, FOLDER_ICONS } from '../Modals/EditFolderModal';
import { WallpaperModal } from '../Modals/WallpaperModal';
import { LibraryBackground } from './LibraryBackground';
import type { NotebookCoverStyle, LibraryWallpaperConfig } from '../../types/document';

interface DocumentLibraryProps {
  notebooks: Notebook[];
  folders: Folder[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onOpenNotebook: (notebook: Notebook) => void;
  onCreateNotebook: (title: string, template: PageTemplate, folderId: string | null, coverColor: string) => void;
  onCreateFolder: (name: string) => void;
  onImportPdf: (file: File, folderId?: string | null) => void;
  onImportFolder?: (files: File[], folderId?: string | null) => void;
  onImportMultiplePdfs?: (files: File[], folderId?: string | null) => void;
  onDuplicateNotebook: (notebookId: string) => void;
  onDeleteNotebook: (notebookId: string) => void;
  onRenameNotebook: (notebookId: string, newTitle: string) => void;
  onToggleFavorite: (notebookId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveNotebook?: (notebookId: string, folderId: string | null) => void;
  onUpdateNotebookCover?: (
    notebookId: string,
    coverColor: string,
    coverStyle: NotebookCoverStyle,
    coverIcon?: string,
    coverLabel?: string,
    coverImage?: string
  ) => void;
  onUpdateFolder?: (
    folderId: string,
    name: string,
    color?: string,
    icon?: string,
    coverImage?: string
  ) => void;
  wallpaperConfig: LibraryWallpaperConfig;
  onSaveWallpaperConfig: (config: LibraryWallpaperConfig) => void;
  isDarkMode: boolean;
  isCloudConnected: boolean;
  cloudAccount?: CloudAccount | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  onOpenCloudSettings: () => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  notebooks,
  folders,
  currentFolderId,
  onSelectFolder,
  onOpenNotebook,
  onCreateNotebook,
  onCreateFolder,
  onImportPdf,
  onImportFolder,
  onImportMultiplePdfs,
  onDuplicateNotebook,
  onDeleteNotebook,
  onRenameNotebook,
  onToggleFavorite,
  onDeleteFolder,
  onMoveNotebook,
  onUpdateNotebookCover,
  onUpdateFolder,
  wallpaperConfig,
  onSaveWallpaperConfig,
  isDarkMode,
  isCloudConnected,
  cloudAccount,
  syncStatus,
  onOpenCloudSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [navFilter, setNavFilter] = useState<'all' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<LibrarySortBy>('date');
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [isNewNotebookModalOpen, setIsNewNotebookModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [editingCoverNotebook, setEditingCoverNotebook] = useState<Notebook | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<string | null>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
      setActiveFolderMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Dialog states
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Filter notebooks
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  const filteredNotebooks = notebooks
    .filter((nb) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          nb.title.toLowerCase().includes(q) ||
          (nb.subject && nb.subject.toLowerCase().includes(q))
        );
      }
      if (navFilter === 'favorites') {
        return !!nb.isFavorite;
      }
      if (currentFolderId) {
        return nb.folderId === currentFolderId;
      }
      // When at root "Documents", only show notebooks that DO NOT belong to any valid folder
      const inValidFolder = !!(nb.folderId && folders.some((f) => f.id === nb.folderId));
      return !inValidFolder;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return b.updatedAt - a.updatedAt;
      return a.title.localeCompare(b.title);
    });

  const visibleFolders = currentFolderId
    ? []
    : folders.filter((f) => {
        if (searchQuery.trim()) {
          return f.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return navFilter === 'all';
      });

  const handlePdfUploadClick = () => {
    setShowNewMenu(false);
    fileInputRef.current?.click();
  };

  const handleFolderUploadClick = () => {
    setShowNewMenu(false);
    folderInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 1) {
      onImportPdf(files[0], currentFolderId);
    } else if (files.length > 1) {
      if (onImportMultiplePdfs) {
        onImportMultiplePdfs(files, currentFolderId);
      } else {
        files.forEach((f) => onImportPdf(f, currentFolderId));
      }
    }
    e.target.value = '';
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    if (onImportFolder) {
      onImportFolder(files, currentFolderId);
    }
    e.target.value = '';
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div
      className={`h-screen w-screen flex select-none overflow-hidden font-sans ${
        isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-[#F7F8FA] text-slate-800'
      }`}
    >
      {/* Individual or Multiple PDF File Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Entire Folder Upload (with webkitdirectory) */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard for folder picker
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFolderChange}
      />

      {/* 1. Left Sidebar (GoodNotes Clean White/Light Sidebar) */}
      <aside
        className={`w-60 border-r flex flex-col shrink-0 transition-colors ${
          isDarkMode
            ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
            : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
        }`}
      >
        {/* macOS Window Controls (Traffic Lights: Red, Yellow, Green) */}
        <div className="h-12 px-4 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
          <span className="font-bold text-xs ml-2 text-slate-800 dark:text-zinc-200">MedNotes</span>
        </div>

        {/* macOS Pill Search Box */}
        <div className="px-3 pt-3 pb-2">
          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
              isDarkMode
                ? 'bg-zinc-800/80 border-zinc-700 text-zinc-200'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="bg-transparent border-none outline-hidden w-full text-xs placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Sidebar Navigation Items (Matching Image 1) */}
        <div className="px-2 py-1 space-y-1 text-xs font-medium">
          <button
            onClick={() => {
              setNavFilter('all');
              onSelectFolder(null);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              navFilter === 'all' && !currentFolderId
                ? isDarkMode
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-2xs'
                : 'hover:bg-slate-100 text-slate-600 dark:text-zinc-400'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <span>Documents</span>
            <span className="ml-auto text-[11px] opacity-60 font-mono">{notebooks.length}</span>
          </button>

          <button
            onClick={() => {
              setNavFilter('favorites');
              onSelectFolder(null);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              navFilter === 'favorites'
                ? isDarkMode
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'bg-amber-50 text-amber-700 font-bold border border-amber-100 shadow-2xs'
                : 'hover:bg-slate-100 text-slate-600 dark:text-zinc-400'
            }`}
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Favorites</span>
            <span className="ml-auto text-[11px] opacity-60 font-mono">
              {notebooks.filter((n) => n.isFavorite).length}
            </span>
          </button>
        </div>

        {/* Medical Folders Section in Sidebar */}
        <div className="mt-4 px-3 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
            Môn học / Folders
          </span>
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
            title="Tạo thư mục môn học mới"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 text-xs">
          {folders.map((folder) => {
            const isSelected = currentFolderId === folder.id;
            const count = notebooks.filter((n) => n.folderId === folder.id).length;

            return (
              <div
                key={folder.id}
                onClick={() => {
                  setNavFilter('all');
                  onSelectFolder(folder.id);
                }}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'bg-[#DDE1E6] text-slate-900 font-semibold'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FolderIcon className="w-3.5 h-3.5 text-sky-400 fill-sky-400/40" />
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] opacity-60 font-mono">{count}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(folder.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500"
                    title="Xóa thư mục"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Google Drive Login / Sync Widget */}
        <div className="p-3 border-t border-black/5 dark:border-white/5 space-y-2">
          <button
            onClick={onOpenCloudSettings}
            className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all shadow-2xs group ${
              isCloudConnected
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-blue-50/90 dark:bg-zinc-800 border-blue-200 dark:border-zinc-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <GoogleDriveIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              <div className="text-left truncate">
                <div className="font-bold text-[11px] truncate">
                  {isCloudConnected ? cloudAccount?.name || 'Google Drive' : 'Đăng nhập Google Drive'}
                </div>
                <div className="text-[9px] opacity-70">
                  {isCloudConnected ? 'Tự động sao lưu đang bật' : 'Sao lưu ngầm mọi nét vẽ'}
                </div>
              </div>
            </div>
            {isCloudConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            ) : (
              <span className="text-[10px] text-blue-600 font-bold shrink-0">Vào →</span>
            )}
          </button>

          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 px-1">
            <span>GoodNotes Engine</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-bold">v2.0</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area (Documents Grid - Exactly matching Image 1) */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Dynamic & Static Wallpaper Engine */}
        <LibraryBackground config={wallpaperConfig} isDarkMode={isDarkMode} />

        {/* Main Content Header */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md relative z-10">
          {/* Header Title (Image 1 Style: Bold "Documents") */}
          <div className="flex items-center gap-3">
            {currentFolderId ? (
              <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <button
                  onClick={() => onSelectFolder(null)}
                  className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"
                >
                  Documents
                </button>
                <ChevronRight className="w-5 h-5 text-slate-400" />
                <span className="text-slate-900 dark:text-zinc-100">{currentFolder?.name}</span>
              </div>
            ) : (
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                {navFilter === 'favorites' ? 'Favorites' : 'Documents'}
              </h1>
            )}
          </div>

          {/* Center / Right Header Controls: [ Date ] [ Name ] Segmented Control (Image 1 replica) */}
          <div className="flex items-center gap-4">
            {/* Pill Segmented Control [ Date ] [ Name ] */}
            <div
              className={`flex items-center p-0.5 rounded-md border text-xs font-semibold ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-[#EAECEF] border-[#DFE2E6]'
              }`}
            >
              <button
                onClick={() => setSortBy('date')}
                className={`px-3 py-1 rounded-sm transition-all cursor-pointer ${
                  sortBy === 'date'
                    ? isDarkMode
                      ? 'bg-zinc-800 text-white shadow-2xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Date
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1 rounded-sm transition-all cursor-pointer ${
                  sortBy === 'name'
                    ? isDarkMode
                      ? 'bg-zinc-800 text-white shadow-2xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Name
              </button>
            </div>

            {/* Google Drive Login / Auto-Sync Button */}
            <button
              onClick={onOpenCloudSettings}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all shadow-2xs group ${
                isCloudConnected
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border-blue-200 dark:border-zinc-700 bg-blue-50/90 dark:bg-zinc-800 hover:bg-blue-100 text-blue-700 dark:text-blue-400'
              }`}
              title={
                isCloudConnected
                  ? `Tài khoản: ${cloudAccount?.email || 'Google Drive'} • Đang tự động sao lưu`
                  : 'Đăng nhập tài khoản Google Drive để tự động sao lưu dữ liệu'
              }
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : (
                <GoogleDriveIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              )}
              <span>
                {syncStatus === 'syncing'
                  ? 'Đang lưu Drive...'
                  : isCloudConnected
                  ? 'Đã kết nối Drive'
                  : 'Đăng nhập Google Drive'}
              </span>
              {isCloudConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>

            {/* Quick New Notebook Button */}
            <button
              onClick={() => setIsNewNotebookModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo sổ tay</span>
            </button>

            {/* Import PDF Button */}
            <button
              onClick={handlePdfUploadClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer transition-colors shadow-2xs"
              title="Nhập 1 hoặc nhiều tài liệu PDF"
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Nhập PDF</span>
            </button>

            {/* Import Folder Button */}
            <button
              onClick={handleFolderUploadClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer transition-colors shadow-2xs"
              title="Nhập toàn bộ thư mục chứa các file PDF từ máy tính"
            >
              <FolderUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Nhập cả thư mục</span>
            </button>

            {/* Wallpaper Button */}
            <button
              onClick={() => setIsWallpaperModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs font-semibold text-purple-700 dark:text-purple-300 cursor-pointer transition-colors shadow-2xs"
              title="Cài đặt hình nền động hoặc ảnh tĩnh cho trang chủ"
            >
              <Palette className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Hình nền</span>
            </button>
          </div>
        </header>

        {/* Grid Cards Container (Image 1 replica: Grid layout of New..., Notebooks, and Folders) */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-10 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-7 max-w-7xl">
            {/* Card 1: [ + ] New... (Exact replica of Image 1) */}
            <div className="relative flex flex-col items-center">
              <div
                onClick={() => setShowNewMenu(!showNewMenu)}
                className={`w-full aspect-[1/1.38] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-102 hover:shadow-md ${
                  isDarkMode
                    ? 'bg-zinc-900/60 border-zinc-800 hover:border-blue-500'
                    : 'bg-[#F9FAFB] border-[#D9DDE2] hover:border-blue-400 shadow-2xs'
                }`}
              >
                {/* Minimalist Blue Plus in the center */}
                <Plus className="w-8 h-8 text-blue-500 stroke-[1.75]" />
              </div>

              {/* Title under New... Card: Blue text with dropdown chevron */}
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer hover:underline"
              >
                <span>New...</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Popover Menu for [ + ] New */}
              {showNewMenu && (
                <div
                  className={`absolute top-full left-0 mt-2 p-1.5 rounded-xl border shadow-2xl z-50 w-52 ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <button
                    onClick={() => {
                      setShowNewMenu(false);
                      setIsNewNotebookModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
                  >
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-semibold">Notebook mới</div>
                      <div className="text-[10px] text-slate-400">Chọn bìa & mẫu giấy Cornell</div>
                    </div>
                  </button>

                  <button
                    onClick={handlePdfUploadClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
                  >
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="font-semibold">Nhập PDF...</div>
                      <div className="text-[10px] text-slate-400">Chọn 1 hoặc nhiều file PDF lẻ</div>
                    </div>
                  </button>

                  <button
                    onClick={handleFolderUploadClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
                  >
                    <FolderUp className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="font-semibold">Nhập cả thư mục...</div>
                      <div className="text-[10px] text-slate-400">Tự tạo folder & nạp tất cả PDF bên trong</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsCreatingFolder(true);
                      setShowNewMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
                  >
                    <FolderIcon className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="font-semibold">Thư mục mới</div>
                      <div className="text-[10px] text-slate-400">Tổ chức theo bộ môn Y</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Folder Cards (GoodNotes Custom Pastel Folder with Icon & Color) */}
            {visibleFolders.map((folder) => {
              const count = notebooks.filter((n) => n.folderId === folder.id).length;
              const colorObj =
                FOLDER_COLORS.find((c) => c.front === folder.color) || {
                  id: 'default',
                  name: 'Mặc định',
                  front: folder.color || '#90CAF9',
                  back: '#64B5F6',
                };
              const FolderIconComp =
                FOLDER_ICONS.find((i) => i.id === folder.icon)?.icon || FolderIcon;

              return (
                <div
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  className="group relative flex flex-col items-center cursor-pointer"
                >
                  {/* Folder Graphic Container */}
                  <div className="w-full aspect-[1/1.38] rounded-xl flex flex-col items-center justify-center relative transition-all group-hover:scale-102">
                    {/* Authentic GoodNotes Custom Pastel Folder SVG Mockup */}
                    <div className="w-4/5 aspect-[1.25/1] relative flex items-center justify-center">
                      <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-sm transition-transform group-hover:scale-103">
                        {/* Folder Back Tab */}
                        <path
                          d="M 5,20 C 5,12 12,5 20,5 L 42,5 C 47,5 50,10 54,14 L 58,18 L 85,18 C 93,18 97,22 97,30 L 97,70 C 97,76 93,80 85,80 L 15,80 C 7,80 3,76 3,70 Z"
                          fill={colorObj.back}
                        />
                        {/* Folder Front Face */}
                        <rect
                          x="3"
                          y="22"
                          width="94"
                          height="56"
                          rx="8"
                          fill={colorObj.front}
                        />
                      </svg>

                      {/* Custom cover photo or icon emblem in folder */}
                      {folder.coverImage ? (
                        <div className="absolute top-[28%] bottom-[6%] left-[4.5%] right-[4.5%] rounded-lg overflow-hidden border border-white/50 shadow-inner z-10">
                          <img
                            src={folder.coverImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        folder.icon && folder.icon !== 'folder' && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/70 dark:bg-black/30 backdrop-blur-xs text-slate-800 dark:text-white shadow-xs z-10">
                            <FolderIconComp className="w-5 h-5 stroke-[2]" />
                          </div>
                        )
                      )}

                      {/* Item count pill inside folder */}
                      <span className="absolute bottom-2 font-mono text-[10px] font-bold text-slate-800/80 bg-white/75 px-2 py-0.2 rounded-full shadow-2xs">
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>

                  {/* Folder Title in Blue with Dropdown Chevron (Image 1 style) */}
                  <div className="w-full text-center mt-1 px-1 relative">
                    <div className="inline-flex items-center gap-0.5 justify-center max-w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFolder(folder.id);
                        }}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline truncate cursor-pointer"
                      >
                        {folder.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
                        }}
                        className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-blue-600 dark:text-blue-400 cursor-pointer"
                        title="Tùy chọn thư mục"
                      >
                        <ChevronDown className="w-3 h-3 shrink-0" />
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 truncate">
                      {formatDate(folder.updatedAt)}
                    </div>

                    {/* Folder dropdown menu */}
                    {activeFolderMenuId === folder.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 p-1.5 rounded-xl border shadow-2xl z-50 w-48 text-left ${
                          isDarkMode
                            ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setEditingFolder(folder);
                            setActiveFolderMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-blue-600 dark:text-blue-400 font-medium"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>Đổi màu & icon...</span>
                        </button>

                        <button
                          onClick={() => {
                            const newName = window.prompt('Nhập tên mới cho thư mục:', folder.name);
                            if (newName && newName.trim() && onUpdateFolder) {
                              onUpdateFolder(folder.id, newName.trim(), folder.color, folder.icon);
                            }
                            setActiveFolderMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Đổi tên thư mục</span>
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Xóa thư mục "${folder.name}"? Các sổ tay bên trong sẽ được chuyển ra ngoài Documents.`)) {
                              onDeleteFolder(folder.id);
                            }
                            setActiveFolderMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-950/50 text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa thư mục</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Notebook Document Cards (Image 1 Style: Pure Bright Paper preview or Custom Cover) */}
            {filteredNotebooks.map((nb) => {
              const isPdf = !!nb.pdfDataUrl;
              const hasCustomCover = !!(nb.coverImage || nb.coverColor);

              return (
                <div
                  key={nb.id}
                  onClick={() => onOpenNotebook(nb)}
                  className="group relative flex flex-col items-center cursor-pointer"
                >
                  {/* Card Body: Either Custom Notebook Cover or Portrait paper sheet */}
                  <div
                    className={`w-full aspect-[1/1.38] rounded-xl border flex flex-col relative overflow-hidden transition-all group-hover:scale-102 group-hover:shadow-lg ${
                      hasCustomCover
                        ? 'border-white/20 text-white shadow-md'
                        : isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md'
                        : 'bg-white border-[#E2E6EA] text-slate-800 shadow-sm'
                    }`}
                    style={
                      hasCustomCover && !nb.coverImage
                        ? {
                            backgroundColor: nb.coverColor,
                            backgroundImage:
                              nb.coverStyle === 'gradient'
                                ? `linear-gradient(135deg, ${nb.coverColor} 0%, #0f172a 100%)`
                                : nb.coverStyle === 'leather'
                                ? `radial-gradient(circle at 50% 30%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.35) 100%)`
                                : undefined,
                          }
                        : undefined
                    }
                  >
                    {/* Custom Cover Photo if set */}
                    {nb.coverImage && (
                      <img
                        src={nb.coverImage}
                        alt="Cover"
                        className="absolute inset-0 w-full h-full object-cover z-0"
                      />
                    )}
                    {nb.coverImage && (
                      <div className="absolute inset-0 bg-black/25 z-0" />
                    )}

                    {/* Top Bookmark Star */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(nb.id);
                      }}
                      className={`absolute top-2 right-2 p-1 rounded-full z-20 transition-colors ${
                        nb.isFavorite
                          ? 'text-amber-400 opacity-100'
                          : hasCustomCover
                          ? 'text-white/60 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                          : 'text-slate-300 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${nb.isFavorite ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* PDF Badge if PDF file */}
                    {isPdf && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white font-mono shadow-2xs z-20">
                        PDF
                      </span>
                    )}

                    {hasCustomCover ? (
                      /* CUSTOM COVER RENDERING */
                      <>
                        {/* Left Spine Ribbon Binding Effect */}
                        <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-black/35 border-r border-white/15 z-10" />

                        {/* Embossed Stitching for Leather */}
                        {!nb.coverImage && nb.coverStyle === 'leather' && (
                          <div className="absolute inset-1.5 border border-dashed border-amber-300/40 rounded-lg pointer-events-none z-10" />
                        )}

                        {/* Watermark anatomy / medical symbol background */}
                        {!nb.coverImage && (nb.coverStyle === 'medical' || nb.coverStyle === 'anatomy') && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                            {nb.coverStyle === 'medical' ? (
                              <Activity className="w-24 h-24 text-white stroke-[1]" />
                            ) : (
                              <Heart className="w-24 h-24 text-white stroke-[1]" />
                            )}
                          </div>
                        )}

                        {/* Cover Content */}
                        <div className="flex-1 p-2.5 pl-4 flex flex-col justify-between relative select-none z-10">
                          {/* Top Header Label */}
                          <div className="flex items-center justify-between text-[8px] font-bold text-white/90 tracking-wider uppercase drop-shadow-sm">
                            <span>MedNotes</span>
                            {nb.coverIcon && (
                              <div className="p-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs">
                                {React.createElement(
                                  COVER_ICONS.find((i) => i.id === nb.coverIcon)?.icon || Sparkles,
                                  { className: 'w-3 h-3' }
                                )}
                              </div>
                            )}
                          </div>

                          {/* Center Title Badge */}
                          <div className="my-auto py-1">
                            <div
                              className={`p-2 rounded-lg text-center backdrop-blur-md transition-all ${
                                nb.coverImage
                                  ? 'bg-black/60 text-white border border-white/30 shadow-lg'
                                  : nb.coverStyle === 'minimal'
                                  ? 'bg-amber-100/95 text-amber-950 border border-amber-300 shadow-xs'
                                  : nb.coverStyle === 'leather'
                                  ? 'bg-amber-950/80 text-amber-100 border border-amber-500/50 shadow-inner'
                                  : 'bg-white/90 dark:bg-zinc-900/90 text-slate-900 dark:text-white border border-white/40 shadow-xs'
                              }`}
                            >
                              <p className="text-[10px] font-black leading-tight line-clamp-2">
                                {nb.coverLabel || nb.title}
                              </p>
                              <p className="text-[8px] opacity-75 font-medium mt-0.5">
                                {nb.pages.length} trang
                              </p>
                            </div>
                          </div>

                          {/* Bottom Spine Detail */}
                          <div className="flex items-center justify-between text-[7px] text-white/80 font-mono drop-shadow-sm">
                            <span>VOL. I</span>
                            <span>{nb.subject || 'Y khoa'}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* STANDARD PAPER PREVIEW */
                      <div className="flex-1 p-3.5 flex flex-col justify-between relative select-none">
                        {/* Title Header line */}
                        <div>
                          <div className="text-[10px] font-bold text-slate-800 dark:text-zinc-200 truncate border-b border-slate-100 dark:border-zinc-800 pb-1">
                            {nb.title}
                          </div>
                          {/* Faint Cornell / Ruled Notes lines simulation */}
                          <div className="mt-2 space-y-1.5 opacity-50">
                            <div className="h-1 bg-slate-300 dark:bg-zinc-600 rounded-full w-5/6" />
                            <div className="h-1 bg-slate-200 dark:bg-zinc-700 rounded-full w-full" />
                            <div className="h-1 bg-slate-200 dark:bg-zinc-700 rounded-full w-3/4" />
                            <div className="h-1 bg-blue-300 rounded-full w-2/3 opacity-80" />
                          </div>
                        </div>

                        {/* Faint sketch diagram simulation */}
                        <div className="my-auto py-1 flex items-center justify-center opacity-40">
                          <div className="w-10 h-10 rounded-full border border-blue-400 border-dashed flex items-center justify-center text-[7px] text-blue-600 font-bold bg-blue-50/40">
                            Anatomy
                          </div>
                        </div>

                        {/* Page count pill */}
                        <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono">
                          <span className="capitalize">{nb.pages[0]?.template || 'Cornell'}</span>
                          <span>{nb.pages.length} trang</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title Under Card: Blue text with dropdown chevron (Image 1 style) */}
                  <div className="w-full text-center mt-1.5 px-1 relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === nb.id ? null : nb.id);
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 max-w-full cursor-pointer"
                    >
                      <span className="truncate">{nb.title}</span>
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>

                    <div className="text-[10px] text-slate-400 truncate">
                      {formatDate(nb.updatedAt)}
                    </div>

                    {/* Folder Badge if searching or in favorites */}
                    {(searchQuery.trim() || navFilter === 'favorites') && nb.folderId && (
                      <div className="mt-0.5 flex items-center justify-center">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1 max-w-[90%] truncate">
                          <FolderIcon className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{folders.find((f) => f.id === nb.folderId)?.name}</span>
                        </span>
                      </div>
                    )}

                    {/* Dropdown Action Menu */}
                    {activeMenuId === nb.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 p-1.5 rounded-xl border shadow-2xl z-50 w-52 text-left ${
                          isDarkMode
                            ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setEditingCoverNotebook(nb);
                            setActiveMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>Đổi bìa sổ tay...</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsRenaming(nb.id);
                            setNewTitleInput(nb.title);
                            setActiveMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Đổi tên</span>
                        </button>

                        <button
                          onClick={() => {
                            onDuplicateNotebook(nb.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Nhân bản</span>
                        </button>

                        <button
                          onClick={() => {
                            exportNotebookAsPdf(nb, isDarkMode);
                            setActiveMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-500" />
                          <span>Xuất ra PDF</span>
                        </button>

                        {/* Move to folder */}
                        {onMoveNotebook && folders.length > 0 && (
                          <div className="py-1 border-t border-slate-100 dark:border-zinc-800 my-1">
                            <div className="text-[10px] text-zinc-400 font-semibold px-2 py-0.5">
                              Chuyển vào thư mục:
                            </div>
                            <div className="max-h-28 overflow-y-auto space-y-0.5">
                              {nb.folderId && (
                                <button
                                  onClick={() => {
                                    onMoveNotebook(nb.id, null);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>🏠 Ngoài Documents (Gốc)</span>
                                </button>
                              )}
                              {folders.map((f) => (
                                <button
                                  key={f.id}
                                  disabled={nb.folderId === f.id}
                                  onClick={() => {
                                    onMoveNotebook(nb.id, f.id);
                                    setActiveMenuId(null);
                                  }}
                                  className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center gap-1.5 truncate ${
                                    nb.folderId === f.id
                                      ? 'text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/40'
                                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer'
                                  }`}
                                >
                                  <FolderIcon className="w-3 h-3 text-blue-400 shrink-0" />
                                  <span className="truncate">{f.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

                        <button
                          onClick={() => {
                            const folder = folders.find((f) => f.id === nb.folderId);
                            const msg = folder
                              ? `Xóa sổ tay "${nb.title}"?\nLưu ý: Sổ tay này đang nằm trong thư mục "${folder.name}". Xóa sẽ xóa hoàn toàn khỏi thư mục này.`
                              : `Xóa sổ tay "${nb.title}"?`;
                            if (window.confirm(msg)) {
                              onDeleteNotebook(nb.id);
                            }
                            setActiveMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-950/50 text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa sổ tay</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* New Notebook Modal */}
      <NewNotebookModal
        isOpen={isNewNotebookModalOpen}
        onClose={() => setIsNewNotebookModalOpen(false)}
        folders={folders}
        currentFolderId={currentFolderId}
        onCreate={onCreateNotebook}
        isDarkMode={isDarkMode}
      />

      {/* Rename Dialog Modal */}
      {isRenaming && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50">
          <div
            className={`p-5 rounded-2xl border shadow-2xl w-80 ${
              isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-sm font-bold mb-3">Đổi tên tài liệu</h3>
            <input
              type="text"
              value={newTitleInput}
              onChange={(e) => setNewTitleInput(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden mb-4 ${
                isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'
              }`}
              autoFocus
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsRenaming(null)}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (newTitleInput.trim()) {
                    onRenameNotebook(isRenaming, newTitleInput.trim());
                  }
                  setIsRenaming(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50">
          <div
            className={`p-5 rounded-2xl border shadow-2xl w-80 ${
              isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-sm font-bold mb-3">Tạo thư mục môn học mới</h3>
            <input
              type="text"
              value={newFolderNameInput}
              onChange={(e) => setNewFolderNameInput(e.target.value)}
              placeholder="VD: Dược lý học, Bệnh học..."
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden mb-4 ${
                isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'
              }`}
              autoFocus
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderNameInput('');
                }}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (newFolderNameInput.trim()) {
                    onCreateFolder(newFolderNameInput.trim());
                  }
                  setIsCreatingFolder(false);
                  setNewFolderNameInput('');
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer"
              >
                Tạo thư mục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cover Modal */}
      {editingCoverNotebook && (
        <EditCoverModal
          isOpen={!!editingCoverNotebook}
          onClose={() => setEditingCoverNotebook(null)}
          notebook={editingCoverNotebook}
          onSaveCover={(id, color, style, icon, label, coverImage) => {
            if (onUpdateNotebookCover) {
              onUpdateNotebookCover(id, color, style, icon, label, coverImage);
            }
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Edit Folder Modal */}
      {editingFolder && (
        <EditFolderModal
          isOpen={!!editingFolder}
          onClose={() => setEditingFolder(null)}
          folder={editingFolder}
          onSaveFolder={(id, name, color, icon, coverImage) => {
            if (onUpdateFolder) {
              onUpdateFolder(id, name, color, icon, coverImage);
            }
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Library Wallpaper Modal */}
      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        config={wallpaperConfig}
        onSaveConfig={onSaveWallpaperConfig}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
