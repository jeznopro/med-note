import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  Page,
  Notebook,
  Folder,
  ToolType,
  PageTemplate,
  CanvasTransform,
  AppViewMode,
  NotebookCoverStyle,
  LibraryWallpaperConfig,
} from './types/document';
import type { ToolState } from './types/tools';
import { MEDICAL_PEN_COLORS, MEDICAL_HIGHLIGHTER_COLORS } from './types/tools';
import { PageHistory } from './engine/history';
import { TopToolbar } from './components/Toolbar/TopToolbar';
import { PageSidebar } from './components/Sidebar/PageSidebar';
import { NoteCanvas } from './components/Canvas/NoteCanvas';
import { VirtualizedPageList } from './components/Canvas/VirtualContinuousPage';
import { DocumentLibrary } from './components/Library/DocumentLibrary';
import { createNotebookFromPdf } from './pdf/pdfLoader';
import { GoogleDriveService, type CloudAccount, type SyncStatusInfo } from './services/googleDrive';
import { CloudSettingsModal } from './components/Modals/CloudSettingsModal';
import { BottomPageNav } from './components/Toolbar/BottomPageNav';
import { deletePdfBinary, saveNotebooksToIdb, loadNotebooksFromIdb } from './services/pdfStorage';

const STORAGE_KEY_FOLDERS = 'mednotes_library_folders_v2';
const STORAGE_KEY_NOTEBOOKS = 'mednotes_library_notebooks_v2';
const STORAGE_KEY_OPEN_TABS = 'mednotes_open_tabs_v2';
const STORAGE_KEY_ACTIVE_NB = 'mednotes_active_notebook_v2';
const STORAGE_KEY_WALLPAPER = 'mednotes_library_wallpaper_v2';

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
  { id: 'f_anatomy', name: 'Giải phẫu học (Anatomy)', color: '#90CAF9', icon: 'bone', createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 86400000 * 3 },
  { id: 'f_physiology', name: 'Sinh lý học (Physiology)', color: '#A7F3D0', icon: 'heart', createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 * 2 },
  { id: 'f_pharmacology', name: 'Dược lý học (Pharmacology)', color: '#FED7AA', icon: 'pill', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
  { id: 'f_pathology', name: 'Bệnh lý học (Pathology)', color: '#DDD6FE', icon: 'microscope', createdAt: Date.now(), updatedAt: Date.now() },
];

const INITIAL_NOTEBOOKS: Notebook[] = [
  {
    id: 'nb_anatomy',
    title: 'Giải phẫu học lâm sàng (Gray\'s Anatomy)',
    subject: 'Giải phẫu',
    folderId: 'f_anatomy',
    coverColor: '#1E3A8A',
    coverStyle: 'anatomy',
    coverIcon: 'heart',
    coverLabel: 'Gray\'s Anatomy Clinic',
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
    coverColor: '#581C87',
    coverStyle: 'gradient',
    coverIcon: 'brain',
    coverLabel: 'Sinh lý Thần kinh Học',
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
    coverColor: '#065F46',
    coverStyle: 'medical',
    coverIcon: 'dna',
    coverLabel: 'Dược lý & Kháng sinh',
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
    coverColor: '#991B1B',
    coverStyle: 'leather',
    coverIcon: 'pulse',
    coverLabel: 'Bệnh học Tim mạch',
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mednotes_dark_mode');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return false;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [scrollMode, setScrollMode] = useState<'continuous' | 'single'>('continuous');

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

  // Library Wallpaper configuration
  const [wallpaperConfig, setWallpaperConfig] = useState<LibraryWallpaperConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WALLPAPER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { type: 'none', blur: 0, dim: 0 };
  });

  const handleSaveWallpaperConfig = (config: LibraryWallpaperConfig) => {
    setWallpaperConfig(config);
    try {
      localStorage.setItem(STORAGE_KEY_WALLPAPER, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save wallpaper config', e);
    }
  };

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

  // C3: Restore notebooks from IndexedDB if available and newer/larger than localStorage fallback
  useEffect(() => {
    loadNotebooksFromIdb().then((idbNotebooks) => {
      if (idbNotebooks && idbNotebooks.length > 0) {
        setNotebooks((prev) => {
          const isPrevDefault =
            prev.length <= 4 && prev.every((n) => INITIAL_NOTEBOOKS.some((init) => init.id === n.id));
          return isPrevDefault || idbNotebooks.length >= prev.length ? idbNotebooks : prev;
        });
      }
    });
  }, []);

  // C3: Debounce writing notebooks to IndexedDB & LocalStorage (every 1.5s or on tab hide/close)
  // Prevents blocking main thread with JSON serialization every time user lifts the pen!
  const latestNotebooksRef = useRef<Notebook[]>(notebooks);
  latestNotebooksRef.current = notebooks;
  const saveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushNotebooksToStorage = useCallback((dataToSave: Notebook[]) => {
    saveNotebooksToIdb(dataToSave);
    try {
      localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(dataToSave));
    } catch (e) {
      // If localStorage hits 5MB quota, IndexedDB still safely holds the full notebooks state
      console.warn('localStorage quota exceeded, persisted full state in IndexedDB:', e);
    }
  }, []);

  useEffect(() => {
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    saveDebounceTimerRef.current = setTimeout(() => {
      flushNotebooksToStorage(notebooks);
      saveDebounceTimerRef.current = null;
    }, 1500);

    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, [notebooks, flushNotebooksToStorage]);

  // Immediate flush when user switches tab, locks screen, or closes browser
  useEffect(() => {
    const handleVisibilityOrUnload = () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
        saveDebounceTimerRef.current = null;
        flushNotebooksToStorage(latestNotebooksRef.current);
      }
    };
    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);
    return () => {
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
    };
  }, [flushNotebooksToStorage]);

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

  // Auto-restore library on startup if connected to Google Drive and local is still initial sample
  useEffect(() => {
    if (!cloudAccount) return;

    let isMounted = true;

    async function checkAndAutoRestore() {
      try {
        const isLocalSampleOnly =
          notebooks.length <= 4 &&
          notebooks.every((n) => INITIAL_NOTEBOOKS.some((init) => init.id === n.id));

        if (isLocalSampleOnly && cloudAccount) {
          setSyncInfo((prev) => ({ ...prev, status: 'syncing' }));
          const remoteData = await gdrive.downloadLibraryFromDrive(cloudAccount);
          if (isMounted && remoteData && remoteData.notebooks.length > 0) {
            setNotebooks(remoteData.notebooks);
            if (remoteData.folders && remoteData.folders.length > 0) {
              setFolders(remoteData.folders);
            }
            setSyncInfo({
              status: 'success',
              lastSyncTime: Date.now(),
              syncedFilesCount: remoteData.notebooks.length,
            });
          } else {
            setSyncInfo((prev) => ({ ...prev, status: 'idle' }));
          }
        }
      } catch (err) {
        console.warn('Auto restore on startup failed:', err);
        setSyncInfo((prev) => ({ ...prev, status: 'idle' }));
      }
    }

    checkAndAutoRestore();

    return () => {
      isMounted = false;
    };
  }, [cloudAccount]);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfLoadingName, setPdfLoadingName] = useState('');

  const [importProgress, setImportProgress] = useState<{
    isLoading: boolean;
    title: string;
    current: number;
    total: number;
    currentFileName: string;
  }>({
    isLoading: false,
    title: '',
    current: 0,
    total: 0,
    currentFileName: '',
  });

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

  // Apple Pencil Discrimination Mode: Stylus writes with pressure, finger scrolls (Palm Rejection)
  const [isPencilMode, setIsPencilMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mednotes_pencil_mode');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });

  const handleTogglePencilMode = () => {
    setIsPencilMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mednotes_pencil_mode', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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
    try {
      localStorage.setItem('mednotes_dark_mode', JSON.stringify(isDarkMode));
    } catch {}
  }, [isDarkMode]);

  // Track whether active document has pending unsaved user edits
  const hasUnsavedChangesRef = useRef(false);

  // Handle Notebook & Page Changes in Editor
  const handlePageChange = (updatedPage: Page) => {
    hasUnsavedChangesRef.current = true;
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

  const handleSpecificPageChange = (pageIndex: number, updatedPage: Page) => {
    hasUnsavedChangesRef.current = true;
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== activeNotebookId) return nb;
        const updatedPages = [...nb.pages];
        updatedPages[pageIndex] = updatedPage;
        return {
          ...nb,
          pages: updatedPages,
          updatedAt: Date.now(),
        };
      })
    );
  };

  // Google Drive Auto-Sync Debounce (only triggers if user actually modified the document)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cloudAccount || !autoSyncEnabled || !hasUnsavedChangesRef.current) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      if (!activeNotebook || !hasUnsavedChangesRef.current) return;
      setSyncInfo((prev) => ({ ...prev, status: 'syncing' }));
      try {
        let pdfBlob: Blob | undefined;
        try {
          const { generateNotebookPdfBlob } = await import('./pdf/pdfExporter');
          pdfBlob = await generateNotebookPdfBlob(activeNotebook, isDarkMode);
        } catch (pdfErr) {
          console.warn('Could not generate PDF blob for auto-sync', pdfErr);
        }
        const folderName = activeNotebook.folderId ? folders.find((f) => f.id === activeNotebook.folderId)?.name : undefined;
        await gdrive.uploadNotebook(activeNotebook, cloudAccount, pdfBlob, folderName);
        hasUnsavedChangesRef.current = false;
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
  }, [notebooks, folders, cloudAccount, autoSyncEnabled, activeNotebook, gdrive, isDarkMode]);

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
      // 1. Check if user already has notebooks backed up on Google Drive!
      const remoteData = await gdrive.downloadLibraryFromDrive(acc);
      if (remoteData && remoteData.notebooks.length > 0) {
        const isLocalSampleOnly =
          notebooks.length <= 4 &&
          notebooks.every((n) => INITIAL_NOTEBOOKS.some((init) => init.id === n.id));

        if (isLocalSampleOnly) {
          // If this is a new device (like a phone with just default sample notebooks), load user's actual notebooks!
          setNotebooks(remoteData.notebooks);
          if (remoteData.folders && remoteData.folders.length > 0) {
            setFolders(remoteData.folders);
          }
          setSyncInfo({
            status: 'success',
            lastSyncTime: Date.now(),
            syncedFilesCount: remoteData.notebooks.length,
          });
          return;
        } else {
          // Merge remote notebooks that aren't present locally
          const localIds = new Set(notebooks.map((n) => n.id));
          const missingFromLocal = remoteData.notebooks.filter((n) => !localIds.has(n.id));
          if (missingFromLocal.length > 0) {
            setNotebooks((prev) => [...prev, ...missingFromLocal]);
          }
          if (remoteData.folders) {
            const localFolderIds = new Set(folders.map((f) => f.id));
            const missingFolders = remoteData.folders.filter((f) => !localFolderIds.has(f.id));
            if (missingFolders.length > 0) {
              setFolders((prev) => [...prev, ...missingFolders]);
            }
          }
        }
      }

      // 2. Sync local notebooks to Drive
      await gdrive.syncAllNotebooks(
        notebooks,
        acc,
        folders,
        undefined,
        async (nb) => {
          const { generateNotebookPdfBlob } = await import('./pdf/pdfExporter');
          return generateNotebookPdfBlob(nb, isDarkMode);
        }
      );
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
      await gdrive.syncAllNotebooks(
        notebooks,
        cloudAccount,
        folders,
        undefined,
        async (nb) => {
          const { generateNotebookPdfBlob } = await import('./pdf/pdfExporter');
          return generateNotebookPdfBlob(nb, isDarkMode);
        }
      );
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
      if (scrollMode === 'continuous') {
        setTimeout(() => {
          const el = document.getElementById(`page-container-${index}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
    }
  };

  // Keyboard navigation shortcuts: ArrowLeft / ArrowRight / PageUp / PageDown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'editor') return;
      const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') return;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeNotebook.currentPageIndex, activeNotebook.pages.length]);

  const isLastPage = activeNotebook.currentPageIndex >= activeNotebook.pages.length - 1;

  const handleAutoAddNewPage = (navigateNow: boolean = false) => {
    hasUnsavedChangesRef.current = true;
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
    hasUnsavedChangesRef.current = true;
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
    hasUnsavedChangesRef.current = true;
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
    hasUnsavedChangesRef.current = true;
    handlePageChange({
      ...currentPage,
      template,
    });
  };

  const handleClearPage = () => {
    if (currentPage.strokes.length === 0) return;
    hasUnsavedChangesRef.current = true;
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
    hasUnsavedChangesRef.current = false;
    if (!openNotebookIds.includes(notebook.id)) {
      setOpenNotebookIds((prev) => [...prev, notebook.id]);
    }
    setActiveNotebookId(notebook.id);
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      if (screenWidth < 768) {
        setIsSidebarOpen(false);
        const mobileScale = Math.max(0.35, Math.min(1.0, (screenWidth - 24) / 820));
        setTransform({ scale: mobileScale, offsetX: 0, offsetY: 0 });
      } else {
        setTransform({ scale: 1.0, offsetX: 0, offsetY: 0 });
      }
    }
    setViewMode('editor');
  };

  const handleCreateNotebook = (
    title: string = 'Sổ tay Y khoa mới',
    template: PageTemplate = 'cornell',
    folderId: string | null = null,
    coverColor?: string
  ) => {
    const newId = `nb_${Date.now()}`;
    const matchedFolder = folderId ? folders.find((f) => f.id === folderId) : null;
    const newNotebook: Notebook = {
      id: newId,
      title: title || `Sổ tay Y khoa ${notebooks.length + 1}`,
      subject: matchedFolder ? matchedFolder.name : 'Ghi chép',
      folderId: folderId || null,
      coverColor: coverColor || '#1E3A8A',
      coverStyle: 'standard',
      coverLabel: title || `Sổ tay Y khoa ${notebooks.length + 1}`,
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
      setScrollMode('continuous');
      handleOpenNotebook(importedNb);
    } catch (err) {
      console.error('Failed to import PDF:', err);
      alert('Không thể mở file PDF này. Vui lòng kiểm tra định dạng file.');
    } finally {
      setIsPdfLoading(false);
      setPdfLoadingName('');
    }
  };

  const handleImportFolder = async (files: File[], targetFolderId?: string | null) => {
    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      alert('Thư mục được chọn không chứa file PDF nào hợp lệ.');
      return;
    }

    let finalFolderId = targetFolderId;
    let folderName = 'Thư mục tài liệu PDF';

    const relativePath = (pdfFiles[0] as unknown as { webkitRelativePath?: string }).webkitRelativePath;
    if (relativePath) {
      const parts = relativePath.split('/');
      if (parts.length > 1 && parts[0].trim()) {
        folderName = parts[0].trim();
      }
    }

    // If not currently inside a folder, create a new folder with the chosen folder's name
    if (!finalFolderId) {
      finalFolderId = `folder_${Date.now()}`;
      const newFolder: Folder = {
        id: finalFolderId,
        name: folderName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setFolders((prev) => [...prev, newFolder]);
    }

    setImportProgress({
      isLoading: true,
      title: `Đang nhập thư mục: "${folderName}"`,
      current: 0,
      total: pdfFiles.length,
      currentFileName: pdfFiles[0].name,
    });

    const importedNotebooks: Notebook[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setImportProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentFileName: file.name,
      }));

      try {
        const nb = await createNotebookFromPdf(file);
        nb.folderId = finalFolderId;
        importedNotebooks.push(nb);
      } catch (err) {
        console.error(`Lỗi khi nạp file ${file.name}:`, err);
      }
    }

    if (importedNotebooks.length > 0) {
      setNotebooks((prev) => [...importedNotebooks, ...prev]);
      setCurrentFolderId(finalFolderId);
      setViewMode('library');
    }

    setImportProgress({
      isLoading: false,
      title: '',
      current: 0,
      total: 0,
      currentFileName: '',
    });
  };

  const handleImportMultiplePdfs = async (files: File[], folderId?: string | null) => {
    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) return;

    const targetFolder = folderId || currentFolderId || null;

    setImportProgress({
      isLoading: true,
      title: `Đang nạp ${pdfFiles.length} tài liệu PDF...`,
      current: 0,
      total: pdfFiles.length,
      currentFileName: pdfFiles[0].name,
    });

    const importedNotebooks: Notebook[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setImportProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentFileName: file.name,
      }));

      try {
        const nb = await createNotebookFromPdf(file);
        nb.folderId = targetFolder;
        importedNotebooks.push(nb);
      } catch (err) {
        console.error(`Lỗi khi nạp file ${file.name}:`, err);
      }
    }

    if (importedNotebooks.length > 0) {
      setNotebooks((prev) => [...importedNotebooks, ...prev]);
      if (importedNotebooks.length === 1) {
        handleOpenNotebook(importedNotebooks[0]);
      }
    }

    setImportProgress({
      isLoading: false,
      title: '',
      current: 0,
      total: 0,
      currentFileName: '',
    });
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
    deletePdfBinary(notebookId).catch(() => {});
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

  const handleMoveNotebook = (notebookId: string, targetFolderId: string | null) => {
    setNotebooks((prev) =>
      prev.map((nb) => {
        if (nb.id !== notebookId) return nb;
        const targetFolder = targetFolderId ? folders.find((f) => f.id === targetFolderId) : null;
        return {
          ...nb,
          folderId: targetFolderId,
          subject: targetFolder ? targetFolder.name : nb.subject,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const handleUpdateNotebookCover = (
    notebookId: string,
    coverColor: string,
    coverStyle: NotebookCoverStyle,
    coverIcon?: string,
    coverLabel?: string,
    coverImage?: string
  ) => {
    setNotebooks((prev) =>
      prev.map((nb) =>
        nb.id === notebookId
          ? {
              ...nb,
              coverColor,
              coverStyle,
              coverIcon,
              coverLabel,
              coverImage,
              updatedAt: Date.now(),
            }
          : nb
      )
    );
  };

  const handleUpdateFolder = (
    folderId: string,
    name: string,
    color?: string,
    icon?: string,
    coverImage?: string
  ) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              name,
              color,
              icon,
              coverImage,
              updatedAt: Date.now(),
            }
          : f
      )
    );
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
          onImportFolder={handleImportFolder}
          onImportMultiplePdfs={handleImportMultiplePdfs}
          onDuplicateNotebook={handleDuplicateNotebook}
          onDeleteNotebook={handleDeleteNotebook}
          onRenameNotebook={handleRenameNotebook}
          onToggleFavorite={handleToggleFavorite}
          onDeleteFolder={handleDeleteFolder}
          onMoveNotebook={handleMoveNotebook}
          onUpdateNotebookCover={handleUpdateNotebookCover}
          onUpdateFolder={handleUpdateFolder}
          wallpaperConfig={wallpaperConfig}
          onSaveWallpaperConfig={handleSaveWallpaperConfig}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((d) => !d)}
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
            onExportPdf={async () => {
              const { exportNotebookAsPdf } = await import('./pdf/pdfExporter');
              await exportNotebookAsPdf(activeNotebook, isDarkMode);
            }}
            onExportPng={async () => {
              const { exportCurrentPageAsPng } = await import('./pdf/pdfExporter');
              await exportCurrentPageAsPng(
                currentPage,
                activeNotebook.title,
                activeNotebook.pdfDataUrl,
                isDarkMode,
                activeNotebook.id
              );
            }}
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
            onSelectPage={handleSelectPage}
            scrollMode={scrollMode}
            onToggleScrollMode={() => setScrollMode((m) => (m === 'continuous' ? 'single' : 'continuous'))}
            currentTemplate={currentPage.template}
            onTemplateChange={handleTemplateChange}
            zoom={transform.scale}
            onZoomChange={(newZoom) =>
              setTransform((prev) => ({ ...prev, scale: newZoom }))
            }
            onClearPage={handleClearPage}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((d) => !d)}
            isPencilMode={isPencilMode}
            onTogglePencilMode={handleTogglePencilMode}
          />

          {/* Main Workspace: Page Thumbnails Sidebar + Note Canvas Container */}
          <div className="flex-1 flex overflow-hidden relative">
            <PageSidebar
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen((o) => !o)}
              pages={activeNotebook.pages}
              currentPageIndex={activeNotebook.currentPageIndex}
              notebookId={activeNotebook.id}
              pdfDataUrl={activeNotebook.pdfDataUrl}
              onSelectPage={handleSelectPage}
              onAddPage={handleAddPage}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={handleDeletePage}
              isDarkMode={isDarkMode}
            />

            <main
              id="editor-main-container"
              className={`flex-1 overflow-auto relative ${
                isDarkMode ? 'bg-zinc-950' : 'bg-[#EAEFF5]'
              }`}
              style={{
                touchAction: toolState.currentTool === 'pan' ? 'pan-x pan-y' : 'none',
              }}
            >
              {scrollMode === 'continuous' ? (
                <VirtualizedPageList
                  pages={activeNotebook.pages}
                  currentPageIndex={activeNotebook.currentPageIndex}
                  notebookId={activeNotebook.id}
                  pdfDataUrl={activeNotebook.pdfDataUrl}
                  toolState={toolState}
                  transform={transform}
                  isDarkMode={isDarkMode}
                  getPageHistory={getPageHistory}
                  onSpecificPageChange={handleSpecificPageChange}
                  onHistoryChange={notifyHistoryChange}
                  onAutoAddNewPage={handleAutoAddNewPage}
                  isPencilMode={isPencilMode}
                  onSelectPage={(index) => {
                    if (activeNotebook.currentPageIndex !== index) {
                      setNotebooks((prev) =>
                        prev.map((nb) =>
                          nb.id === activeNotebookId ? { ...nb, currentPageIndex: index } : nb
                        )
                      );
                    }
                  }}
                />
              ) : (
                <div className="w-fit min-w-full flex flex-col items-center py-8 pb-36 min-h-full">
                  <div className="relative flex flex-col items-center">
                    <div className="text-[11px] font-mono text-slate-400 font-semibold mb-1 select-none">
                      Trang {activeNotebook.currentPageIndex + 1} / {activeNotebook.pages.length}
                    </div>
                    <NoteCanvas
                      page={currentPage}
                      notebookId={activeNotebook.id}
                      pdfDataUrl={activeNotebook.pdfDataUrl}
                      toolState={toolState}
                      transform={transform}
                      isDarkMode={isDarkMode}
                      history={currentHistory}
                      onPageChange={handlePageChange}
                      onHistoryChange={notifyHistoryChange}
                      isLastPage={isLastPage}
                      onAutoAddNewPage={handleAutoAddNewPage}
                      isPencilMode={isPencilMode}
                    />
                  </div>
                </div>
              )}
            </main>

            {/* Bottom Floating Navigation Toolbar */}
            <BottomPageNav
              currentPageIndex={activeNotebook.currentPageIndex}
              totalPages={activeNotebook.pages.length}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              onAddPage={handleAddPage}
              onSelectPage={handleSelectPage}
              scrollMode={scrollMode}
              onToggleScrollMode={() => setScrollMode((m) => (m === 'continuous' ? 'single' : 'continuous'))}
              isDarkMode={isDarkMode}
            />
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

      {/* PDF Single Loading Overlay */}
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

      {/* Batch / Folder Import Progress Overlay */}
      {importProgress.isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
          <div
            className={`p-6 rounded-2xl border shadow-2xl flex flex-col items-center gap-4 text-center max-w-md w-full ${
              isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-600">
              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>

            <div className="w-full">
              <h3 className="text-sm font-bold truncate">{importProgress.title}</h3>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
                <span>Đang xử lý: {importProgress.current} / {importProgress.total} file</span>
                <span>{Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden mt-1.5 border border-slate-200 dark:border-zinc-700">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}%`,
                  }}
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-2 truncate font-mono">
                {importProgress.currentFileName}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
