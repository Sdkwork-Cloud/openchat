
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page, FilterCriterion } from '../../../core/types';

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
     * Advanced Filter Query using Criteria API
     */
    async getFavorites(category: string, keyword?: string): Promise<Result<Page<FavoriteItem>>> {
        const filters: FilterCriterion[] = [];

        // 1. Category Filter Strategy
        if (category !== 'all') {
            if (category === 'image') {
                // Special composite case: image OR video. 
                // Since our basic Criteria API is mostly AND based, we handle this composite logic 
                // by manually filtering OR cases *or* we could enhance Criteria API later.
                // For now, let's trust the 'image' type strictly or use a broader filter if needed.
                // To support standard strict mode:
                filters.push({ field: 'type', operator: 'in', value: ['image', 'video'] });
            } else if (category === 'note') {
                filters.push({ field: 'type', operator: 'in', value: ['text', 'doc'] });
            } else {
                filters.push({ field: 'type', operator: 'eq', value: category });
            }
        }

        return await this.findAll({
            filters,
            keywords: keyword, // Uses the standardized full-text search in base class
            sort: { field: 'createTime', order: 'desc' }
        });
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
