// IndexedDB storage service for PDF binary files
// Ensures multi-page PDFs persist across browser reloads and tab closures without hitting localStorage quota

const DB_NAME = 'MedNotes_PDF_Storage';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_documents';

// Fast in-memory buffer cache
const memoryBufferCache = new Map<string, ArrayBuffer>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePdfBinary(
  notebookId: string,
  buffer: ArrayBuffer,
  fileName: string
): Promise<void> {
  // 1. Cache in memory
  memoryBufferCache.set(notebookId, buffer);

  // 2. Persist in IndexedDB
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record = {
        id: notebookId,
        fileName,
        buffer,
        updatedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save PDF to IndexedDB, fallback to memory cache only:', err);
  }
}

export async function getPdfBinary(notebookId: string): Promise<ArrayBuffer | null> {
  // 1. Check in-memory cache first
  if (memoryBufferCache.has(notebookId)) {
    return memoryBufferCache.get(notebookId)!;
  }

  // 2. Load from IndexedDB
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(notebookId);

      req.onsuccess = () => {
        if (req.result && req.result.buffer) {
          const buffer = req.result.buffer as ArrayBuffer;
          memoryBufferCache.set(notebookId, buffer);
          resolve(buffer);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load PDF from IndexedDB:', err);
    return null;
  }
}

export async function deletePdfBinary(notebookId: string): Promise<void> {
  memoryBufferCache.delete(notebookId);
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(notebookId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete PDF from IndexedDB:', err);
  }
}
