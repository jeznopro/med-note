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
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export type NotebookCoverStyle = 'standard' | 'leather' | 'gradient' | 'minimal' | 'medical' | 'anatomy';

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
  coverColor?: string;
  coverStyle?: NotebookCoverStyle;
  coverIcon?: string;
  coverLabel?: string;
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

export type LibraryWallpaperType =
  | 'default'
  | 'animated_aurora'
  | 'animated_ocean'
  | 'animated_sunset'
  | 'animated_stars'
  | 'animated_pulse'
  | 'static_desk'
  | 'static_library'
  | 'static_greenery'
  | 'static_mountain'
  | 'custom_image';

export interface LibraryWallpaperConfig {
  type: LibraryWallpaperType;
  customImageUrl?: string;
  blurLevel: number;
  dimLevel: number;
}
