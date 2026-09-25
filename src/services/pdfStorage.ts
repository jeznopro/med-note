// IndexedDB storage service using lightweight `idb` wrapper (C1 & C3)
// Stores PDF binary ArrayBuffers once in IndexedDB without keeping duplicate copies in RAM/React state.

import { openDB, type IDBPDatabase } from 'idb';
import type { Notebook } from '../types/document';

const DB_NAME = 'MedNotes_PDF_Storage';
const DB_VERSION = 2;
const PDF_STORE_NAME = 'pdf_documents';
const NOTEBOOKS_STORE_NAME = 'notebooks_state';

interface PdfRecord {
  id: string;
  fileName: string;
  buffer: ArrayBuffer;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
          db.createObjectStore(PDF_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(NOTEBOOKS_STORE_NAME)) {
          db.createObjectStore(NOTEBOOKS_STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * C1: Save original PDF ArrayBuffer once into IndexedDB on import/sync.
 * Does NOT retain a duplicate ArrayBuffer copy in JS memory.
 */
export async function savePdfBinary(
  notebookId: string,
  buffer: ArrayBuffer,
  fileName: string
): Promise<void> {
  try {
    const db = await getDb();
    const record: PdfRecord = {
      id: notebookId,
      fileName,
      buffer,
      updatedAt: Date.now(),
    };
    await db.put(PDF_STORE_NAME, record);
  } catch (err) {
    console.warn('Failed to save PDF to IndexedDB via idb:', err);
  }
}

/**
 * C1: Read PDF ArrayBuffer directly from IndexedDB when pdf.js opens the document.
 */
export async function getPdfBinary(notebookId: string): Promise<ArrayBuffer | null> {
  try {
    const db = await getDb();
    const record = (await db.get(PDF_STORE_NAME, notebookId)) as PdfRecord | undefined;
    if (record && record.buffer) {
      return record.buffer;
    }
    return null;
  } catch (err) {
    console.warn('Failed to load PDF from IndexedDB via idb:', err);
    return null;
  }
}

export async function deletePdfBinary(notebookId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(PDF_STORE_NAME, notebookId);
  } catch (err) {
    console.warn('Failed to delete PDF from IndexedDB via idb:', err);
  }
}

/**
 * C3: Debounced background persistence of Notebooks (including compact Float32 stroke data) to IndexedDB.
 */
export async function saveNotebooksToIdb(notebooks: Notebook[]): Promise<void> {
  try {
    const db = await getDb();
    await db.put(NOTEBOOKS_STORE_NAME, notebooks, 'library_notebooks');
  } catch (err) {
    console.warn('Failed to save notebooks to IndexedDB:', err);
  }
}

export async function loadNotebooksFromIdb(): Promise<Notebook[] | null> {
  try {
    const db = await getDb();
    const saved = await db.get(NOTEBOOKS_STORE_NAME, 'library_notebooks');
    return Array.isArray(saved) ? (saved as Notebook[]) : null;
  } catch {
    return null;
  }
}
