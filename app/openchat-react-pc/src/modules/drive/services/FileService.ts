import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result, Page } from '../../../core/types';
import { AppEvents, eventEmitter } from '../../../core/events';
import { FileNode, FileType, FileFilter, StorageStats, BreadcrumbItem } from '../types';

const SEED_FILES: Partial<FileNode>[] = [
  { id: 'f_root_1', parentId: null, name: '工作文档', type: 'folder', updateTime: Date.now() - 100000 },
  { id: 'f_root_2', parentId: null, name: '私人相册', type: 'folder', updateTime: Date.now() - 200000 },
  { id: 'f_root_3', parentId: null, name: '项目资料', type: 'folder', updateTime: Date.now() - 300000 },
  { id: 'f_root_4', parentId: null, name: '设计素材', type: 'folder', updateTime: Date.now() - 400000 },
  
  { id: 'f_sub_1', parentId: 'f_root_1', name: '2024 Q1 财报.pdf', type: 'pdf', size: 2048000, updateTime: Date.now() - 50000 },
  { id: 'f_sub_2', parentId: 'f_root_1', name: '会议录音.mp3', type: 'audio', size: 5048000, updateTime: Date.now() - 60000 },
  
  { id: 'f_sub_3', parentId: 'f_root_2', name: '旅行照片_01.jpg', type: 'image', size: 3048000, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', updateTime: Date.now() },
  { id: 'f_sub_4', parentId: 'f_root_2', name: '旅行照片_02.jpg', type: 'image', size: 3148000, url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400', updateTime: Date.now() - 10000 },
  { id: 'f_sub_5', parentId: 'f_root_2', name: 'Vlog_Draft.mp4', type: 'video', size: 45000000, updateTime: Date.now() - 20000 },

  { id: 'f_root_img', parentId: null, name: 'Avatar_Final.png', type: 'image', size: 1200000, url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', updateTime: Date.now() - 800000 },
  { id: 'f_root_zip', parentId: null, name: 'Archive_Backup.zip', type: 'zip', size: 88000000, updateTime: Date.now() - 900000 },
];

class FileServiceImpl extends AbstractStorageService<FileNode> {
  constructor() {
    super('sys_cloud_drive_pc_v1');
  }

  protected async onInitialize() {
    const list = await this.loadData();
    if (list.length === 0) {
      const now = Date.now();
      for (const item of SEED_FILES) {
        await this.saveItem({ ...item, createTime: now } as FileNode);
      }
    }
  }

  async getFilesByParent(parentId: string | null, filter: FileFilter = {}): Promise<Result<FileNode[]>> {
    let list = await this.loadData();
    list = list.filter(f => f.parentId === parentId);

    if (filter.type) {
      list = list.filter(f => f.type === filter.type);
    }

    if (filter.search) {
      const lowerSearch = filter.search.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(lowerSearch));
    }

    if (filter.isStarred !== undefined) {
      list = list.filter(f => f.isStarred === filter.isStarred);
    }

    // Sort: folders first, then by update time
    list.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return (b.updateTime || 0) - (a.updateTime || 0);
    });

    return { success: true, data: list };
  }

  async getBreadcrumbs(folderId: string | null): Promise<BreadcrumbItem[]> {
    if (!folderId) return [];
    
    const list = await this.loadData();
    const breadcrumbs: BreadcrumbItem[] = [];
    let current = list.find(f => f.id === folderId);

    let depth = 0;
    while (current && depth < 20) {
      breadcrumbs.unshift({ id: current.id, name: current.name });
      if (current.parentId) {
        current = list.find(f => f.id === current!.parentId);
      } else {
        current = undefined;
      }
      depth++;
    }
    return breadcrumbs;
  }

  async createFolder(parentId: string | null, name: string): Promise<Result<FileNode>> {
    const folder: FileNode = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parentId,
      name,
      type: 'folder',
      createTime: Date.now(),
      updateTime: Date.now()
    };
    await this.saveItem(folder);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true, data: folder };
  }

  async uploadFile(parentId: string | null, file: { name: string; size: number; type: FileType; url?: string }): Promise<Result<FileNode>> {
    const fileNode: FileNode = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parentId,
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.url,
      createTime: Date.now(),
      updateTime: Date.now()
    };
    await this.saveItem(fileNode);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true, data: fileNode };
  }

  async renameFile(id: string, newName: string): Promise<Result<void>> {
    const { data } = await this.getById(id);
    if (data) {
      data.name = newName;
      data.updateTime = Date.now();
      await this.saveItem(data);
      eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  }

  async deleteFiles(ids: string[]): Promise<Result<void>> {
    for (const id of ids) {
      await this.delete(id);
    }
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true };
  }

  async moveFiles(ids: string[], targetParentId: string | null): Promise<Result<void>> {
    for (const id of ids) {
      const { data } = await this.getById(id);
      if (data) {
        if (data.id === targetParentId) continue;
        data.parentId = targetParentId;
        data.updateTime = Date.now();
        await this.saveItem(data);
      }
    }
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true };
  }

  async toggleStar(id: string): Promise<Result<void>> {
    const { data } = await this.getById(id);
    if (data) {
      data.isStarred = !data.isStarred;
      await this.saveItem(data);
      eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    }
    return { success: true };
  }

  async getStorageStats(): Promise<Result<StorageStats>> {
    const list = await this.loadData();
    const used = list.reduce((sum, f) => sum + (f.size || 0), 0);
    
    const byType: Record<FileType, number> = {
      folder: 0, image: 0, video: 0, audio: 0, doc: 0, pdf: 0, xls: 0, ppt: 0, zip: 0, code: 0, unknown: 0
    };
    
    list.forEach(f => {
      if (f.size) {
        byType[f.type] = (byType[f.type] || 0) + f.size;
      }
    });

    return {
      success: true,
      data: {
        total: 10737418240, // 10GB
        used,
        available: 10737418240 - used,
        byType
      }
    };
  }

  getFileIcon(type: FileType): { icon: string; color: string; bg: string } {
    const configs: Record<FileType, { icon: string; color: string; bg: string }> = {
      folder: { icon: '📁', color: '#FFCA28', bg: 'rgba(255, 202, 40, 0.15)' },
      image: { icon: '🖼️', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.15)' },
      video: { icon: '🎬', color: '#F44336', bg: 'rgba(244, 67, 54, 0.15)' },
      audio: { icon: '🎵', color: '#E91E63', bg: 'rgba(233, 30, 99, 0.15)' },
      pdf: { icon: '📄', color: '#FF5722', bg: 'rgba(255, 87, 34, 0.15)' },
      xls: { icon: '📊', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.15)' },
      ppt: { icon: '📽️', color: '#FF9800', bg: 'rgba(255, 152, 0, 0.15)' },
      doc: { icon: '📝', color: '#2196F3', bg: 'rgba(33, 150, 243, 0.15)' },
      zip: { icon: '📦', color: '#FFC107', bg: 'rgba(255, 193, 7, 0.15)' },
      code: { icon: '💻', color: '#607D8B', bg: 'rgba(96, 125, 139, 0.15)' },
      unknown: { icon: '📄', color: '#9E9E9E', bg: 'rgba(158, 158, 158, 0.15)' }
    };
    return configs[type] || configs.unknown;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const FileService = new FileServiceImpl();
