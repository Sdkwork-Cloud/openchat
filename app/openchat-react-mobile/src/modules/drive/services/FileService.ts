
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, FilterCriterion } from '../../../core/types';

export type FileType = 'folder' | 'image' | 'video' | 'doc' | 'audio' | 'pdf' | 'xls' | 'ppt' | 'zip' | 'unknown';

export interface FileNode extends BaseEntity {
    parentId: string | null; // null for root
    name: string;
    type: FileType;
    size?: number; // bytes
    url?: string;
    thumbnail?: string;
}

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

    // Root files for demo
    { id: 'f_root_img', parentId: null, name: 'Avatar_Final.png', type: 'image', size: 1200000, url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', updateTime: Date.now() - 800000 },
    { id: 'f_root_zip', parentId: null, name: 'Archive_Backup.zip', type: 'zip', size: 88000000, updateTime: Date.now() - 900000 },
];

class FileServiceImpl extends AbstractStorageService<FileNode> {
    protected STORAGE_KEY = 'sys_cloud_drive_v1';

    constructor() {
        super();
        this.initData();
    }

    private async initData() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            for (const item of SEED_FILES) {
                await this.save({ ...item, createTime: now } as FileNode); // preserve custom updateTime
            }
        }
    }

    async getFilesByParent(parentId: string | null): Promise<Result<FileNode[]>> {
        const filters: FilterCriterion[] = [
            { field: 'parentId', operator: 'eq', value: parentId }
        ];

        const { data } = await this.findAll({
            filters,
            pageRequest: { page: 1, size: 1000 }
        });

        const files = data?.content || [];
        return { success: true, data: files };
    }

    async createFolder(parentId: string | null, name: string): Promise<Result<FileNode>> {
        return await this.save({
            parentId,
            name,
            type: 'folder',
            createTime: Date.now(),
            updateTime: Date.now()
        });
    }

    async uploadFile(parentId: string | null, file: { name: string, size: number, type: FileType, url?: string }): Promise<Result<FileNode>> {
        return await this.save({
            parentId,
            name: file.name,
            type: file.type,
            size: file.size,
            url: file.url,
            createTime: Date.now(),
            updateTime: Date.now()
        });
    }

    async renameFile(id: string, newName: string): Promise<Result<void>> {
        const { data } = await this.findById(id);
        if (data) {
            data.name = newName;
            data.updateTime = Date.now();
            await this.save(data);
            return { success: true };
        }
        return { success: false, message: 'Not found' };
    }

    async deleteFiles(ids: string[]): Promise<Result<void>> {
        // In a real app, this should recursively delete children if folder
        for (const id of ids) {
            await this.deleteById(id);
        }
        return { success: true };
    }

    async moveFiles(ids: string[], targetParentId: string | null): Promise<Result<void>> {
        // Bulk move
        for (const id of ids) {
             const { data } = await this.findById(id);
             if (data) {
                 // Prevent moving folder into itself (simple check)
                 if (data.id === targetParentId) continue;
                 data.parentId = targetParentId;
                 data.updateTime = Date.now();
                 await this.save(data);
             }
        }
        return { success: true };
    }

    async getBreadcrumbs(folderId: string | null): Promise<FileNode[]> {
        if (!folderId) return [];
        
        const list = await this.loadData();
        const breadcrumbs: FileNode[] = [];
        let current = list.find(f => f.id === folderId);

        let depth = 0;
        while (current && depth < 20) {
            breadcrumbs.unshift(current);
            if (current.parentId) {
                current = list.find(f => f.id === current!.parentId);
            } else {
                current = undefined;
            }
            depth++;
        }
        return breadcrumbs;
    }
}

export const FileService = new FileServiceImpl();
