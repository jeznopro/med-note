export type Point = [x: number, y: number, pressure: number];

export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'pan';

export type EraserMode = 'stroke' | 'standard';

export type PageTemplate = 'blank' | 'ruled' | 'grid' | 'dot' | 'cornell';

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  size: number;
  opacity: number;
  points: Point[];
  pathData?: string;
  createdAt: number;
}

export interface Page {
  id: string;
  pageNumber: number;
  width: number;  // standard 820px or PDF page width
  height: number; // standard 1160px or PDF page height
  template: PageTemplate;
  strokes: Stroke[];
  pdfPageNumber?: number; // 1-indexed page in the attached PDF
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  subject?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  pdfDataUrl?: string;     // base64 / blob URL for PDF document
  pdfFileName?: string;
  pages: Page[];
  currentPageIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface CanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export type AppViewMode = 'library' | 'editor';
export type LibrarySortBy = 'date' | 'name';
export type LibraryNavFilter = 'all' | 'favorites' | 'folder';
