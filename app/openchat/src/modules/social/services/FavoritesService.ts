
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';

export type FavoriteType = 'link' | 'file' | 'doc' | 'chat' | 'text' | 'image' | 'video';

export interface FavoriteItem extends BaseEntity {
    title: string;
    type: FavoriteType;
    content?: string; // Text content or description
    url?: string; // For links, images, files
    source: string; // e.g. "Chat", "Moments", "Web"
    size?: string; // For files
    tags?: string[];
}

const SEED_FAVORITES: Partial<FavoriteItem>[] = [
    { id: 'fav_1', title: 'React 核心原理与源码解析', type: 'link', source: '技术圈', content: '深入理解 Fiber 架构...', createTime: Date.now() - 86400000 },
    { id: 'fav_2', title: '2024年 AI 设计趋势报告.pdf', type: 'file', size: '12.5 MB', source: '文件传输助手', createTime: Date.now() - 259200000 },
    { id: 'fav_3', title: '高盛：生成式 AI 的未来经济影响', type: 'doc', source: 'Omni 智能中枢', content: '深度研报', createTime: Date.now() - 604800000 },
    { id: 'fav_4', title: 'Omni Vision: 这里的风景太棒了！', type: 'chat', source: '聊天记录', content: '[图片] [位置]', createTime: Date.now() - 1209600000 },
    { id: 'fav_5', title: '最好的 Prompt 技巧合集', type: 'text', source: '我的笔记', content: '1. 明确角色...', createTime: Date.now() - 2592000000 },
    { id: 'fav_6', title: 'Cyberpunk City Art', type: 'image', source: 'Midjourney 画师', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=200', createTime: Date.now() - 5184000000 },
];

class FavoritesServiceImpl extends AbstractStorageService<FavoriteItem> {
    protected STORAGE_KEY = 'sys_favorites_v1';

    constructor() {
        super();
        this.initData();
    }

    private async initData() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            for (const item of SEED_FAVORITES) {
                await this.save({ ...item, updateTime: now } as FavoriteItem);
            }
        }
    }

    /**
     * Advanced Filter Query
     */
    async getFavorites(category: string, keyword?: string): Promise<Result<Page<FavoriteItem>>> {
        let list = await this.loadData();

        // 1. Category Filter
        if (category !== 'all') {
            if (category === 'image') {
                list = list.filter(i => i.type === 'image' || i.type === 'video');
            } else if (category === 'note') {
                list = list.filter(i => i.type === 'text' || i.type === 'doc');
            } else {
                list = list.filter(i => i.type === category);
            }
        }

        // 2. Keyword Search
        if (keyword && keyword.trim()) {
            const k = keyword.toLowerCase();
            list = list.filter(i => 
                i.title.toLowerCase().includes(k) || 
                i.content?.toLowerCase().includes(k) ||
                i.source.toLowerCase().includes(k)
            );
        }

        // 3. Sort by Create Time Desc
        list.sort((a, b) => b.createTime - a.createTime);

        return {
            success: true,
            data: {
                content: list,
                total: list.length,
                page: 1,
                size: list.length,
                totalPages: 1
            }
        };
    }

    async addFavorite(item: Partial<FavoriteItem>): Promise<Result<FavoriteItem>> {
        return await this.save({
            ...item,
            createTime: Date.now(),
            updateTime: Date.now()
        });
    }
}

export const FavoritesService = new FavoritesServiceImpl();
