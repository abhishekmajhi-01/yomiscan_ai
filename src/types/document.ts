export type DocumentCategory =
  | 'ID'
  | 'Receipt'
  | 'Invoice'
  | 'Certificate'
  | 'Assignment'
  | 'Notes'
  | 'Book page'
  | 'Bill'
  | 'Bank document'
  | 'Business card'
  | 'Legal document'
  | 'Personal document'
  | 'Other';

export interface Point {
  x: number;
  y: number;
}

export interface QuadCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface FilterSettings {
  filter: 'original' | 'auto' | 'bw' | 'grayscale' | 'color' | 'high-contrast';
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  saturation: number; // -50 to 50
  sharpness: number; // 0 to 50
  shadowRemoval: boolean;
  noiseReduction: boolean;
  backgroundCleanup: boolean;
}

export interface AnnotationItem {
  id: string;
  type: 'pen' | 'highlighter' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'underline' | 'strikethrough';
  color: string;
  strokeWidth: number;
  points?: Point[];
  startPoint?: Point;
  endPoint?: Point;
  text?: string;
  fontSize?: number;
  opacity?: number;
}

export interface PlacedSignature {
  id: string;
  signatureId: string;
  dataUrl: string;
  x: number; // percentage of page width (0 to 100)
  y: number; // percentage of page height (0 to 100)
  width: number; // percentage of page width
  height: number; // percentage of page height
  rotation: number; // degrees
}

export interface DocumentPage {
  id: string;
  pageNumber: number;
  originalImage: string; // base64 or blob URL
  processedImage: string; // post-crop & enhanced base64
  thumbnail: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  corners?: QuadCorners;
  filters: FilterSettings;
  ocrText?: string;
  annotations?: AnnotationItem[];
  signatures?: PlacedSignature[];
}

export interface ExtractedField {
  label: string;
  key: string;
  value: string;
  confidence?: number;
}

export interface TableRowData {
  [column: string]: string;
}

export interface ExtractedTable {
  id: string;
  tableName: string;
  headers: string[];
  rows: string[][];
  summary?: string;
}

export interface DocumentVersion {
  versionNumber: number;
  timestamp: string;
  title: string;
  pageCount: number;
  thumbnail: string;
  note?: string;
  pages: DocumentPage[];
}

export interface SavedSignature {
  id: string;
  title: string;
  dataUrl: string;
  createdAt: string;
  type: 'draw' | 'type' | 'upload';
}

export interface DocumentFolder {
  id: string;
  name: string;
  color?: string;
  parentId?: string | null;
  createdAt: string;
}

export interface ScannedDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  tags: string[];
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
  fileSize: number; // approximate bytes
  isFavorite: boolean;
  isTrash: boolean;
  trashedAt?: string | null;
  passwordProtected?: boolean;
  passwordHash?: string;
  pages: DocumentPage[];
  thumbnail: string;
  ocrText: string;
  ocrEntities?: {
    headings: string[];
    lists: string[];
    numbers: string[];
    dates: string[];
    names: string[];
    languages: string[];
  };
  structuredData?: {
    fields: ExtractedField[];
    type: string;
    raw?: Record<string, any>;
  };
  tables?: ExtractedTable[];
  versions: DocumentVersion[];
  aiClassification?: {
    confidence: number;
    reasoning?: string;
  };
}

export type ScanMode = 'document' | 'idcard' | 'receipt' | 'businesscard';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultScanMode: ScanMode;
  defaultPdfQuality: 'high' | 'medium' | 'small';
  defaultPageSize: 'A4' | 'Letter' | 'Legal' | 'Original';
  autoSuggestFilename: boolean;
  ocrLanguages: string[]; // ['English', 'Hindi', 'Telugu']
  localProcessingOnly: boolean; // Privacy setting
  pinLockEnabled: boolean;
  pinCode?: string;
  biometricsEnabled: boolean;
  cloudBackupEnabled: boolean;
  cloudProvider?: 'google_drive' | 'onedrive' | 'dropbox';
  autoCloudBackup: boolean;
  lastBackupTime?: string;
  storageUsedBytes: number;
  hasCompletedOnboarding: boolean;
}
