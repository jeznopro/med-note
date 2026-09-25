import { useState, useRef, useEffect, useCallback } from 'react';
import type { Page, Notebook, Folder, ToolType, PageTemplate, CanvasTransform, AppViewMode } from './types/document';
import type { ToolState } from './types/tools';
import { MEDICAL_PEN_COLORS, MEDICAL_HIGHLIGHTER_COLORS } from './types/tools';
import { PageHistory } from './engine/history';
import { TopToolbar } from './components/Toolbar/TopToolbar';
import { PageSidebar } from './components/Sidebar/PageSidebar';
import { NoteCanvas } from './components/Canvas/NoteCanvas';
import { DocumentLibrary } from './components/Library/DocumentLibrary';
import { createNotebookFromPdf } from './pdf/pdfLoader';
import { exportNotebookAsPdf, exportCurrentPageAsPng } from './pdf/pdfExporter';
import { GoogleDriveService, type CloudAccount, type SyncStatusInfo } from './services/googleDrive';
import { CloudSettingsModal } from './components/Modals/CloudSettingsModal';

const STORAGE_KEY_FOLDERS = 'mednotes_library_folders_v2';
const STORAGE_KEY_NOTEBOOKS = 'mednotes_library_notebooks_v2';
const STORAGE_KEY_OPEN_TABS = 'mednotes_open_tabs_v2';
const STORAGE_KEY_ACTIVE_NB = 'mednotes_active_notebook_v2';

const DEFAULT_PAGE_WIDTH = 820;
const DEFAULT_PAGE_HEIGHT = 1160;

function createInitialPage(pageNumber: number, template: PageTemplate = 'ruled'): Page {
  return {
    id: `page_${Date.now()}_${pageNumber}`,
    pageNumber,
    width: DEFAULT_PAGE_WIDTH,
    height: DEFAULT_PAGE_HEIGHT,
    template,
    strokes: [],
  };
}

const INITIAL_FOLDERS: Folder[] = [
  { id: 'f_anatomy', name: 'Giải phẫu học (Anatomy)', createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 86400000 * 3 },
  { id: 'f_physiology', name: 'Sinh lý học (Physiology)', createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 2 },
  { id: 'f_pharmacology', name: 'Dược lý học (Pharmacology)', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
  { id: 'f_pathology', name: 'Bệnh lý học (Pathology)', createdAt: Date.now(), updatedAt: Date.now() },
];

const INITIAL_NOTEBOOKS: Notebook[] = [
  {
    id: 'nb_anatomy',
    title: 'Giải phẫu học lâm sàng (Gray\'s Anatomy)',
    subject: 'Giải phẫu',
    folderId: 'f_anatomy',
    isFavorite: true,
    pages: [
      createInitialPage(1, 'cornell'),
      createInitialPage(2, 'ruled'),
      createInitialPage(3, 'grid'),
    ],
    currentPageIndex: 0,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'nb_physiology',
    title: 'Sinh lý tủy sống & Dẫn truyền thần kinh',
    subject: 'Sinh lý',
    folderId: 'f_physiology',
    isFavorite: true,
    pages: [
      createInitialPage(1, 'ruled'),
      createInitialPage(2, 'grid'),
    ],
    currentPageIndex: 0,
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'nb_pharmacology',
    title: 'Dược động học & Cơ chế kháng sinh',
    subject: 'Dược lý',
    folderId: 'f_pharmacology',
    isFavorite: false,
    pages: [
      createInitialPage(1, 'grid'),
      createInitialPage(2, 'blank'),
    ],
    currentPageIndex: 0,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'nb_pathology',
    title: 'Bệnh học tim mạch & Xơ vữa động mạch',
    subject: 'Bệnh học',
    folderId: 'f_pathology',
    isFavorite: false,
    pages: [
      createInitialPage(1, 'cornell'),
    ],
    currentPageIndex: 0,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
];

export default function App() {
  const [viewMode, setViewMode] = useState<AppViewMode>('library');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Library State (Persisted in LocalStorage)
  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOLDERS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load folders from localStorage', e);
    }
    return INITIAL_FOLDERS;
  });

  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTEBOOKS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load notebooks from localStorage', e);
    }
    return INITIAL_NOTEBOOKS;
  });

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Tabs and Active Notebook State in Editor (Persisted)
  const [openNotebookIds, setOpenNotebookIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPEN_TABS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['nb_anatomy'];
  });

  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_NB);
      if (saved) return saved;
    } catch {}
    return 'nb_anatomy';
  });

  // Auto-persist folders, notebooks, tabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
    } catch (e) {
      console.warn('Failed to save folders to localStorage', e);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(notebooks));
    } catch (e) {
      console.warn('Failed to save notebooks to localStorage', e);
    }
  }, [notebooks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OPEN_TABS, JSON.stringify(openNotebookIds));
    } catch {}
  }, [openNotebookIds]);

  useEffect(() => {
    try {
      if (activeNotebookId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_NB, activeNotebookId);
      }
    } catch {}
  }, [activeNotebookId]);

  // Google Drive Cloud Auto-Sync State (GoodNotes Auto Backup)
  const gdrive = GoogleDriveService.getInstance();
  const [cloudAccount, setCloudAccount] = useState<CloudAccount | null>(() => gdrive.getSavedAccount());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => gdrive.isAutoSyncEnabled());
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>({
    status: 'idle',
    lastSyncTime: null,
    syncedFilesCount: 0,
  });
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfLoadingName, setPdfLoadingName] = useState('');

  // Drawing Tools State
  const [toolState, setToolState] = useState<ToolState>({
    currentTool: 'pen',
    pen: {
      color: MEDICAL_PEN_COLORS[0].value,
      size: 2.5,
    },
    highlighter: {
      color: MEDICAL_HIGHLIGHTER_COLORS[0].value,
      size: 22,
      opacity: 0.38,
    },
    eraser: {
      mode: 'stroke',
      size: 26,
    },
  });

  // Zoom & Pan Canvas Transform
  const [transform, setTransform] = useState<CanvasTransform>({
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
  });

  // Undo / Redo histories mapped per page
  const pageHistoriesRef = useRef<Map<string, PageHistory>>(new Map());

  const getPageHistory = (pageId: string): PageHistory => {
    let hist = pageHistoriesRef.current.get(pageId);
    if (!hist) {
      hist = new PageHistory();
      pageHistoriesRef.current.set(pageId, hist);
    }
    return hist;
  };

  const [, setHistoryTick] = useState(0);
  const notifyHistoryChange = useCallback(() => {
    setHistoryTick((t) => t + 1);
  }, []);

  const fallbackNotebook: Notebook = {
    id: 'nb_empty_fallback',
    title: 'Sổ tay mới',
    subject: 'Ghi chép',
    folderId: null,
    pages: [createInitialPage(1)],
    currentPageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const activeNotebook =
    notebooks.find((n) => n.id === activeNotebookId) || notebooks[0] || fallbackNotebook;

  const currentPage =
    activeNotebook?.pages[activeNotebook.currentPageIndex] ||
    activeNotebook?.pages[0] ||
    createInitialPage(1);

  const currentHistory = getPageHistory(currentPage.id);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle Notebook & Page Changes in Editor
  const handlePageChange = (updatedPage: Page) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== activeNotebookId) return nb;
        const updatedPages = [...nb.pages];
        updatedPages[nb.currentPageIndex] = updatedPage;
        return {
          ...nb,
          pages: updatedPages,
          updatedAt: Date.now(),
        };
      })
    );
  };

  // Google Drive Auto-Sync Debounce (3s after user finishes writing/modifying)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cloudAccount || !autoSyncEnabled) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      if (!activeNotebook) return;
      setSyncInfo((prev) => ({ ...prev, status: 'syncing' }));
      try {
        await gdrive.uploadNotebook(activeNotebook, cloudAccount);
        setSyncInfo({
          status: 'success',
          lastSyncTime: Date.now(),
          syncedFilesCount: notebooks.length,
        });
      } catch (err: unknown) {
        console.error('Auto-sync failed:', err);
        setSyncInfo((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: (err as Error).message,
        }));
      }
    }, 2500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [notebooks, cloudAccount, autoSyncEnabled, activeNotebook, gdrive]);

  // Google Drive Auth Handlers
  const handleSignInGoogle = async (
    clientId?: string,
    userProfile?: { email?: string; name?: string }
  ) => {
    if (clientId && clientId !== 'FAST_LOGIN') gdrive.setClientId(clientId);
    const acc = await gdrive.signIn(clientId, userProfile);
    setCloudAccount(acc);
    setSyncInfo((prev) => ({ ...prev, status: 'syncing' }));
    try {
      await gdrive.syncAllNotebooks(notebooks, acc);
      setSyncInfo({
        status: 'success',
        lastSyncTime: Date.now(),
        syncedFilesCount: notebooks.length,
      });
    } catch (err: unknown) {
      console.error('Initial sync error:', err);
    }
  };

  const handleSignOutGoogle = () => {
    gdrive.signOut();
    setCloudAccount(null);
    setSyncInfo({
      status: 'idle',
      lastSyncTime: null,
      syncedFilesCount: 0,
    });
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    gdrive.setAutoSyncEnabled(enabled);
    setAutoSyncEnabled(enabled);
  };

  const handleManualSync = async () => {
    if (!cloudAccount) return;
    setSyncInfo((prev) => ({ ...prev, status: 'syncing' }));
    try {
      await gdrive.syncAllNotebooks(notebooks, cloudAccount);
      setSyncInfo({
        status: 'success',
        lastSyncTime: Date.now(),
        syncedFilesCount: notebooks.length,
      });
    } catch (err: unknown) {
      setSyncInfo((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: (err as Error).message,
      }));
    }
  };

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (!currentHistory.canUndo()) return;
    const newStrokes = currentHistory.undo(currentPage.strokes);
    if (newStrokes) {
      handlePageChange({
        ...currentPage,
        strokes: newStrokes,
      });
      notifyHistoryChange();
    }
  }, [currentHistory, currentPage, notifyHistoryChange]);

  const handleRedo = useCallback(() => {
    if (!currentHistory.canRedo()) return;
    const newStrokes = currentHistory.redo(currentPage.strokes);
    if (newStrokes) {
      handlePageChange({
        ...currentPage,
        strokes: newStrokes,
      });
      notifyHistoryChange();
    }
  }, [currentHistory, currentPage, notifyHistoryChange]);

  // Page Navigation Handlers
  const handleSelectPage = (index: number) => {
    if (index >= 0 && index < activeNotebook.pages.length) {
      setNotebooks((prev) =>
        prev.map((nb) => (nb.id === activeNotebookId ? { ...nb, currentPageIndex: index } : nb))
      );
    }
  };

  const isLastPage = activeNotebook.currentPageIndex >= activeNotebook.pages.length - 1;

  const handleAutoAddNewPage = (navigateNow: boolean = false) => {
    const newPage = createInitialPage(activeNotebook.pages.length + 1, currentPage.template);
    setNotebooks((prev) =>
      prev.map((nb) =>
        nb.id === activeNotebookId
          ? {
              ...nb,
              pages: [...nb.pages, newPage],
              currentPageIndex: navigateNow ? nb.pages.length : nb.currentPageIndex,
              updatedAt: Date.now(),
            }
          : nb
      )
    );
  };

  const handlePrevPage = () => {
    handleSelectPage(activeNotebook.currentPageIndex - 1);
  };

  const handleNextPage = () => {
    if (activeNotebook.currentPageIndex >= activeNotebook.pages.length - 1) {
      // Auto create new page and navigate to it!
      handleAutoAddNewPage(true);
    } else {
      handleSelectPage(activeNotebook.currentPageIndex + 1);
    }
  };

  const handleAddPage = () => {
    handleAutoAddNewPage(true);
  };

  const handleDuplicatePage = (index: number) => {
    const pageToDup = activeNotebook.pages[index];
    const newPage: Page = {
      ...pageToDup,
      id: `page_${Date.now()}_dup`,
      pageNumber: activeNotebook.pages.length + 1,
      strokes: JSON.parse(JSON.stringify(pageToDup.strokes)),
    };
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== activeNotebookId) return nb;
        const updated = [...nb.pages];
        updated.splice(index + 1, 0, newPage);
        return {
          ...nb,
          pages: updated,
          currentPageIndex: index + 1,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const handleDeletePage = (index: number) => {
    if (activeNotebook.pages.length <= 1) return;
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== activeNotebookId) return nb;
        const updated = nb.pages.filter((_, i) => i !== index);
        const nextIndex = Math.min(nb.currentPageIndex, updated.length - 1);
        return {
          ...nb,
          pages: updated,
          currentPageIndex: nextIndex,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const handleTemplateChange = (template: PageTemplate) => {
    handlePageChange({
      ...currentPage,
      template,
    });
  };

  const handleClearPage = () => {
    if (currentPage.strokes.length === 0) return;
    currentHistory.push({
      type: 'CLEAR_PAGE',
      previousStrokes: [...currentPage.strokes],
    });
    notifyHistoryChange();
    handlePageChange({
      ...currentPage,
      strokes: [],
    });
  };

  // Document Library & Tab Navigation Handlers
  const handleOpenNotebook = (notebook: Notebook) => {
    if (!openNotebookIds.includes(notebook.id)) {
      setOpenNotebookIds((prev) => [...prev, notebook.id]);
    }
    setActiveNotebookId(notebook.id);
    setViewMode('editor');
  };

  const handleCreateNotebook = (
    title: string = 'Sổ tay Y khoa mới',
    template: PageTemplate = 'cornell',
    folderId: string | null = null,
    _coverColor?: string
  ) => {
    const newId = `nb_${Date.now()}`;
    const matchedFolder = folderId ? folders.find((f) => f.id === folderId) : null;
    const newNotebook: Notebook = {
      id: newId,
      title: title || `Sổ tay Y khoa ${notebooks.length + 1}`,
      subject: matchedFolder ? matchedFolder.name : 'Ghi chép',
      folderId: folderId || null,
      pages: [createInitialPage(1, template)],
      currentPageIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotebooks((prev) => [newNotebook, ...prev]);
    handleOpenNotebook(newNotebook);
  };

  const handleCreateFolder = (name: string) => {
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
  };

  const handleImportPdf = async (file: File, folderId?: string | null) => {
    setIsPdfLoading(true);
    setPdfLoadingName(file.name);
    try {
      const importedNb = await createNotebookFromPdf(file);
      importedNb.folderId = folderId || null;
      setNotebooks((prev) => [importedNb, ...prev]);
      handleOpenNotebook(importedNb);
    } catch (err) {
      console.error('Failed to import PDF:', err);
      alert('Không thể mở file PDF này. Vui lòng kiểm tra định dạng file.');
    } finally {
      setIsPdfLoading(false);
      setPdfLoadingName('');
    }
  };

  const handleDuplicateNotebook = (notebookId: string) => {
    const target = notebooks.find((n) => n.id === notebookId);
    if (!target) return;
    const duplicated: Notebook = {
      ...target,
      id: `nb_${Date.now()}`,
      title: `${target.title} (Bản sao)`,
      pages: JSON.parse(JSON.stringify(target.pages)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotebooks((prev) => [duplicated, ...prev]);
  };

  const handleDeleteNotebook = (notebookId: string) => {
    setNotebooks((prev) => prev.filter((n) => n.id !== notebookId));
    setOpenNotebookIds((prev) => prev.filter((id) => id !== notebookId));
    if (activeNotebookId === notebookId) {
      const remaining = openNotebookIds.filter((id) => id !== notebookId);
      if (remaining.length > 0) {
        setActiveNotebookId(remaining[0]);
      } else {
        setViewMode('library');
      }
    }
  };

  const handleRenameNotebook = (notebookId: string, newTitle: string) => {
    setNotebooks((prev) =>
      prev.map((nb) => (nb.id === notebookId ? { ...nb, title: newTitle, updatedAt: Date.now() } : nb))
    );
  };

  const handleToggleFavorite = (notebookId: string) => {
    setNotebooks((prev) =>
      prev.map((nb) =>
        nb.id === notebookId ? { ...nb, isFavorite: !nb.isFavorite, updatedAt: Date.now() } : nb
      )
    );
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setNotebooks((prev) =>
      prev.map((nb) => (nb.folderId === folderId ? { ...nb, folderId: null } : nb))
    );
    if (currentFolderId === folderId) setCurrentFolderId(null);
  };

  const handleCloseTab = (notebookId: string) => {
    const remaining = openNotebookIds.filter((id) => id !== notebookId);
    setOpenNotebookIds(remaining);
    if (activeNotebookId === notebookId) {
      if (remaining.length > 0) {
        setActiveNotebookId(remaining[remaining.length - 1]);
      } else {
        setViewMode('library');
      }
    }
  };

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, B, H, E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'p') {
          setToolState((prev) => ({ ...prev, currentTool: 'pen' }));
        } else if (e.key.toLowerCase() === 'h') {
          setToolState((prev) => ({ ...prev, currentTool: 'highlighter' }));
        } else if (e.key.toLowerCase() === 'e') {
          setToolState((prev) => ({ ...prev, currentTool: 'eraser' }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const openTabs = openNotebookIds
    .map((id) => {
      const nb = notebooks.find((n) => n.id === id);
      return nb ? { id: nb.id, title: nb.title } : null;
    })
    .filter((t): t is { id: string; title: string } => t !== null);

  return (
    <>
      {/* If in Library View (GoodNotes Image 1) */}
      {viewMode === 'library' ? (
        <DocumentLibrary
          notebooks={notebooks}
          folders={folders}
          currentFolderId={currentFolderId}
          onSelectFolder={setCurrentFolderId}
          onOpenNotebook={handleOpenNotebook}
          onCreateNotebook={handleCreateNotebook}
          onCreateFolder={handleCreateFolder}
          onImportPdf={handleImportPdf}
          onDuplicateNotebook={handleDuplicateNotebook}
          onDeleteNotebook={handleDeleteNotebook}
          onRenameNotebook={handleRenameNotebook}
          onToggleFavorite={handleToggleFavorite}
          onDeleteFolder={handleDeleteFolder}
          isDarkMode={isDarkMode}
          isCloudConnected={!!cloudAccount}
          cloudAccount={cloudAccount}
          syncStatus={syncInfo.status}
          onOpenCloudSettings={() => setIsCloudModalOpen(true)}
        />
      ) : (
        /* If in Editor View (GoodNotes Image 2) */
        <div
          className={`h-screen w-screen flex flex-col overflow-hidden font-sans select-none ${
            isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
          }`}
        >
          {/* GoodNotes Top Nav Bar + Drawing Toolbar */}
          <TopToolbar
            onBackToLibrary={() => setViewMode('library')}
            openTabs={openTabs}
            activeNotebookId={activeNotebookId}
            onSelectTab={setActiveNotebookId}
            onCloseTab={handleCloseTab}
            onNewTab={() => handleCreateNotebook('Sổ tay mới', 'cornell', currentFolderId)}
            onExportPdf={() => exportNotebookAsPdf(activeNotebook, isDarkMode)}
            onExportPng={() =>
              exportCurrentPageAsPng(currentPage, activeNotebook.title, activeNotebook.pdfDataUrl, isDarkMode)
            }
            isCloudConnected={!!cloudAccount}
            cloudAccount={cloudAccount}
            syncStatus={syncInfo.status}
            onOpenCloudSettings={() => setIsCloudModalOpen(true)}
            toolState={toolState}
            onToolChange={(tool: ToolType) =>
              setToolState((prev) => ({ ...prev, currentTool: tool }))
            }
            onPenColorChange={(color) =>
              setToolState((prev) => ({
                ...prev,
                pen: { ...prev.pen, color },
              }))
            }
            onPenSizeChange={(size) =>
              setToolState((prev) => ({
                ...prev,
                pen: { ...prev.pen, size },
              }))
            }
            onHighlighterColorChange={(color) =>
              setToolState((prev) => ({
                ...prev,
                highlighter: { ...prev.highlighter, color },
              }))
            }
            onHighlighterSizeChange={(size) =>
              setToolState((prev) => ({
                ...prev,
                highlighter: { ...prev.highlighter, size },
              }))
            }
            onEraserSizeChange={(size) =>
              setToolState((prev) => ({
                ...prev,
                eraser: { ...prev.eraser, size },
              }))
            }
            canUndo={currentHistory.canUndo()}
            canRedo={currentHistory.canRedo()}
            onUndo={handleUndo}
            onRedo={handleRedo}
            currentPageIndex={activeNotebook.currentPageIndex}
            totalPages={activeNotebook.pages.length}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            onAddPage={handleAddPage}
            currentTemplate={currentPage.template}
            onTemplateChange={handleTemplateChange}
            zoom={transform.scale}
            onZoomChange={(newZoom) =>
              setTransform((prev) => ({ ...prev, scale: newZoom }))
            }
            onClearPage={handleClearPage}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((d) => !d)}
          />

          {/* Main Workspace: Page Thumbnails Sidebar + Note Canvas Container */}
          <div className="flex-1 flex overflow-hidden relative">
            <PageSidebar
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen((o) => !o)}
              pages={activeNotebook.pages}
              currentPageIndex={activeNotebook.currentPageIndex}
              onSelectPage={handleSelectPage}
              onAddPage={handleAddPage}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={handleDeletePage}
              isDarkMode={isDarkMode}
            />

            <main
              className={`flex-1 overflow-auto flex justify-center relative ${
                isDarkMode ? 'bg-zinc-950' : 'bg-[#EAEFF5]'
              }`}
              style={{
                touchAction: toolState.currentTool === 'pan' ? 'pan-x pan-y' : 'none',
              }}
            >
              <NoteCanvas
                page={currentPage}
                pdfDataUrl={activeNotebook.pdfDataUrl}
                toolState={toolState}
                transform={transform}
                isDarkMode={isDarkMode}
                history={currentHistory}
                onPageChange={handlePageChange}
                onHistoryChange={notifyHistoryChange}
                isLastPage={isLastPage}
                onAutoAddNewPage={handleAutoAddNewPage}
              />
            </main>
          </div>
        </div>
      )}

      {/* GoodNotes Auto Backup Google Drive Modal */}
      <CloudSettingsModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        account={cloudAccount}
        syncInfo={syncInfo}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        onSignIn={handleSignInGoogle}
        onSignOut={handleSignOutGoogle}
        onManualSync={handleManualSync}
        isDarkMode={isDarkMode}
        notebooks={notebooks}
        folders={folders}
        onRestoreLibrary={(restoredNotebooks, restoredFolders) => {
          setNotebooks(restoredNotebooks);
          setFolders(restoredFolders);
        }}
      />

      {/* PDF Loading Overlay */}
      {isPdfLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
          <div
            className={`p-6 rounded-2xl border shadow-2xl flex flex-col items-center gap-3 text-center max-w-sm w-full ${
              isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600">
              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold">Đang nạp tài liệu PDF...</h3>
              <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">{pdfLoadingName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tự động khởi tạo từng trang và chuẩn bị bộ nhớ nét vẽ</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
