import type { BaseEntity } from '@sdkwork/openchat-pc-contracts';

export type FileType = 'folder' | 'image' | 'video' | 'audio' | 'doc' | 'pdf' | 'xls' | 'ppt' | 'zip' | 'code' | 'unknown';

export interface FileNode extends BaseEntity {
  parentId: string | null;
  name: string;
  type: FileType;
  size?: number;
  url?: string;
  thumbnail?: string;
  mimeType?: string;
  isStarred?: boolean;
  isShared?: boolean;
}

export interface FileFilter {
  type?: FileType;
  search?: string;
  isStarred?: boolean;
}

export interface StorageStats {
  total: number;
  used: number;
  available: number;
  byType: Record<FileType, number>;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}


