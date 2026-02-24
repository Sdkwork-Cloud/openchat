
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';
import { smartRecommendShuffle } from '../../../utils/algorithms';

export type GigType = 'delivery' | 'ride' | 'clean' | 'repair' | 'errand' | 'design' | 'video_edit';
export type GigStatus = 'available' | 'taken' | 'submitted' | 'completed';

export interface GigOrder extends BaseEntity {
    type: GigType;
    title: string;
    subTitle: string;
    price: number;
    distance: number; // km from user (0 for remote)
    location: string;
    destination?: string;
    status: GigStatus;
    tags: string[];
    urgency: 'normal' | 'high';
    requirements?: string; // Specific prompt requirements for AI
    
    // Delivery Artifacts
    deliverableUrl?: string;
    deliverableType?: 'image' | 'video' | 'file';
    submissionTime?: number;
}

const SEED_GIGS: Partial<GigOrder>[] = [
    // Creative Gigs (New)
    { id: 'gig_c1', type: 'design', title: '品牌 Logo 设计', subTitle: '科技感，蓝色主调，极简风格', price: 500.00, distance: 0, location: '线上任务', status: 'available', tags: ['高价', 'AI绘图'], urgency: 'normal', requirements: 'A minimalist tech logo, blue theme, vector style, white background' },
    { id: 'gig_c2', type: 'video_edit', title: '电商短视频制作', subTitle: '口红产品展示，需15秒，动感节奏', price: 800.00, distance: 0, location: '线上任务', status: 'available', tags: ['视频生成', '急单'], urgency: 'high', requirements: 'Cinematic lipstick commercial, dynamic lighting, 15s duration, upbeat mood' },
    { id: 'gig_c3', type: 'design', title: '游戏场景原画', subTitle: '赛博朋克风格街道，夜景', price: 1200.00, distance: 0, location: '线上任务', status: 'available', tags: ['Midjourney', '大额'], urgency: 'normal', requirements: 'Cyberpunk street view at night, neon lights, highly detailed, 8k resolution' },
    
    // Physical Gigs (Existing)
    { id: 'gig_1', type: 'delivery', title: '星巴克代送', subTitle: '2杯拿铁，送至张江微电子港', price: 15.00, distance: 0.8, location: '张江星巴克', destination: '微电子港 3号楼', status: 'available', tags: ['顺路', '小费¥2'], urgency: 'high' },
    { id: 'gig_2', type: 'ride', title: '顺风车行程', subTitle: '浦东软件园 -> 虹桥火车站', price: 58.00, distance: 1.2, location: '浦东软件园', destination: '虹桥站', status: 'available', tags: ['95%顺路', '独享'], urgency: 'normal' },
    { id: 'gig_3', type: 'clean', title: '家庭保洁', subTitle: '2小时日常保洁', price: 100.00, distance: 3.5, location: '碧云国际社区', status: 'available', tags: ['免工具', '日结'], urgency: 'normal' },
    { id: 'gig_4', type: 'delivery', title: '文件急送', subTitle: '重要合同，需30分钟内送达', price: 45.00, distance: 2.0, location: '上海中心', destination: '金茂大厦', status: 'available', tags: ['加急', '高价'], urgency: 'high' },
];

class GigServiceImpl extends AbstractStorageService<GigOrder> {
    protected STORAGE_KEY = 'sys_gig_orders_v2'; 

    constructor() {
        super();
        this.initData();
    }

    private async initData() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            for (const item of SEED_GIGS) {
                await this.save({ ...item, createTime: now, updateTime: now } as GigOrder);
            }
        }
    }

    async getAvailableOrders(filterType: string = 'all'): Promise<Result<GigOrder[]>> {
        const { data } = await this.findAll({ 
            pageRequest: { page: 1, size: 100 }
        });
        
        let list = data?.content || [];
        list = list.filter(o => o.status === 'available');

        if (filterType !== 'all') {
            if (filterType === 'creative') {
                list = list.filter(o => o.type === 'design' || o.type === 'video_edit');
            } else {
                list = list.filter(o => o.type === filterType);
            }
        }

        // Smart Scoring
        list.sort((a, b) => {
            const getScore = (order: GigOrder) => {
                const isCreative = order.type === 'design' || order.type === 'video_edit';
                const urgencyBonus = order.urgency === 'high' ? 50 : 0;
                return isCreative ? (order.price + urgencyBonus) : ((order.price / (order.distance + 0.1)) + urgencyBonus);
            };
            return getScore(b) - getScore(a);
        });

        return { success: true, data: list };
    }

    // Get my orders (Active work)
    async getMyGigs(view: 'active' | 'history' = 'active'): Promise<Result<GigOrder[]>> {
        const { data } = await this.findAll({
            pageRequest: { page: 1, size: 100 },
            sort: { field: 'updateTime', order: 'desc' }
        });
        
        let list = data?.content || [];
        
        if (view === 'active') {
            // Processing includes 'taken' and 'submitted' (waiting for approval)
            list = list.filter(o => o.status === 'taken' || o.status === 'submitted');
        } else {
            list = list.filter(o => o.status === 'completed');
        }
        
        return { success: true, data: list };
    }

    async takeOrder(id: string): Promise<Result<GigOrder>> {
        const { data } = await this.findById(id);
        if (data && data.status === 'available') {
            data.status = 'taken';
            await this.save(data);
            return { success: true, data };
        }
        return { success: false, message: '手慢了，订单已被抢' };
    }

    // New: Submit work for review
    async submitWork(id: string, url: string, type: 'image'|'video'|'file'): Promise<Result<GigOrder>> {
        const { data } = await this.findById(id);
        if (data && data.status === 'taken') {
            data.status = 'submitted';
            data.deliverableUrl = url;
            data.deliverableType = type;
            data.submissionTime = Date.now();
            await this.save(data);
            return { success: true, data };
        }
        return { success: false, message: '订单状态错误' };
    }

    // New: Finalize and pay
    async completeOrder(id: string): Promise<Result<GigOrder>> {
        const { data } = await this.findById(id);
        if (data && (data.status === 'submitted' || data.status === 'taken')) {
            data.status = 'completed';
            await this.save(data);
            return { success: true, data };
        }
        return { success: false, message: '订单状态错误' };
    }

    async getEarnings(): Promise<{ today: number, total: number }> {
        return { today: 628.50, total: 5450.00 };
    }
}

export const GigService = new GigServiceImpl();
