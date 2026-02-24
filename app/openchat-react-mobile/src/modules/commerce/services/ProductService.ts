
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';
import { smartRecommendShuffle } from '../../../utils/algorithms';

export type ProductCategory = 'tech' | 'clothing' | 'home' | 'beauty' | 'food';

export interface Product extends BaseEntity {
    title: string;
    subTitle: string;
    price: number;
    originalPrice?: number;
    cover: string; // Main image
    images: string[]; // Gallery
    shopName: string;
    shopAvatar: string;
    sales: number;
    rating: number;
    tags: string[];
    category: ProductCategory;
    detailImages?: string[]; // Rich text description as images
}

const SEED_PRODUCTS: Partial<Product>[] = [
    {
        id: 'mall_p1',
        title: 'Sony WH-1000XM5 头戴式无线降噪耳机',
        subTitle: '双芯驱动，旗舰降噪，30小时超长续航',
        price: 2499,
        originalPrice: 2999,
        cover: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600',
        images: [
            'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800',
            'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800'
        ],
        shopName: 'Sony 官方旗舰店',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sony',
        sales: 5000,
        rating: 4.9,
        tags: ['包邮', '分期免息', '新品'],
        category: 'tech'
    },
    {
        id: 'mall_p2',
        title: 'OpenChat 纪念版极客 T恤 - Tech Blue 限定',
        subTitle: '100% 新疆棉，重磅质感，舒适透气',
        price: 99,
        originalPrice: 129,
        cover: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
        shopName: 'OpenChat 周边店',
        shopAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=OpenChat',
        sales: 1200,
        rating: 4.8,
        tags: ['自营', '限时特价'],
        category: 'clothing'
    },
    {
        id: 'mall_p3',
        title: 'MacBook Pro 14英寸 M3 Max 芯片',
        subTitle: '深空黑色，36GB 统一内存，1TB 固态硬盘',
        price: 16999,
        cover: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=600',
        images: [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=800',
            'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800'
        ],
        shopName: 'Apple 产品专营店',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Apple',
        sales: 300,
        rating: 5.0,
        tags: ['顺丰包邮', '官方正品'],
        category: 'tech'
    },
    {
        id: 'mall_p4',
        title: 'Herman Miller Aeron 人体工学椅',
        subTitle: '久坐神器，全网布设计，护腰护脊',
        price: 8800,
        originalPrice: 12000,
        cover: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=600',
        images: ['https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=800'],
        shopName: '现代家居生活馆',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Home',
        sales: 80,
        rating: 4.7,
        tags: ['大件物流'],
        category: 'home'
    },
    {
        id: 'mall_p5',
        title: '徕卡 LEICA Q3 全画幅数码相机',
        subTitle: '6000万像素，8K视频，无线充电',
        price: 48500,
        cover: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
        shopName: '摄影发烧友',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Camera',
        sales: 20,
        rating: 5.0,
        tags: ['极速发货', '保价'],
        category: 'tech'
    },
    {
        id: 'mall_p6',
        title: '手冲咖啡套装 (含磨豆机 + 手冲壶)',
        subTitle: '入门首选，享受慢生活',
        price: 368,
        originalPrice: 499,
        cover: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
        images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'],
        shopName: '每日咖啡',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Cafe',
        sales: 2200,
        rating: 4.6,
        tags: ['赠豆', '七天无理由'],
        category: 'home'
    },
    {
        id: 'mall_p7',
        title: 'SK-II 神仙水 230ml',
        subTitle: '调节水油平衡，修护肌肤屏障',
        price: 1540,
        originalPrice: 1690,
        cover: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600',
        images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800'],
        shopName: 'SK-II 官方旗舰店',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SKII',
        sales: 8800,
        rating: 4.8,
        tags: ['正品保证', '赠礼盒'],
        category: 'beauty'
    },
    {
        id: 'mall_p8',
        title: 'Nike Air Force 1 \'07 空军一号',
        subTitle: '经典百搭，舒适气垫',
        price: 749,
        cover: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600',
        images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800'],
        shopName: 'Nike 官方商店',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Nike',
        sales: 15000,
        rating: 4.7,
        tags: ['热销', '尺码全'],
        category: 'clothing'
    },
    {
        id: 'mall_p9',
        title: '三只松鼠 坚果大礼包 1588g',
        subTitle: '每日坚果，健康零食，送礼首选',
        price: 128,
        originalPrice: 199,
        cover: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=600',
        images: ['https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=800'],
        shopName: '三只松鼠旗舰店',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Nuts',
        sales: 50000,
        rating: 4.9,
        tags: ['量贩装', '坏单包赔'],
        category: 'food'
    },
    {
        id: 'mall_p10',
        title: 'Dyson V12 Detect Slim 吸尘器',
        subTitle: '激光探测，轻量设计，强劲吸力',
        price: 4499,
        cover: 'https://images.unsplash.com/photo-1558317374-a354d5f6d4da?w=600',
        images: ['https://images.unsplash.com/photo-1558317374-a354d5f6d4da?w=800'],
        shopName: 'Dyson 戴森官方旗舰店',
        shopAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Dyson',
        sales: 3000,
        rating: 4.9,
        tags: ['24期免息', '两年质保'],
        category: 'home'
    }
];

class ProductServiceImpl extends AbstractStorageService<Product> {
    protected STORAGE_KEY = 'sys_mall_products_v2';

    constructor() {
        super();
        this.initData();
    }

    private async initData() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            for (const item of SEED_PRODUCTS) {
                await this.save({ ...item, createTime: now, updateTime: now } as Product);
            }
        }
    }

    async getFeed(category: string = 'all', page: number = 1, size: number = 20): Promise<Result<Page<Product>>> {
        const { data } = await this.findAll({ 
            pageRequest: { page, size } 
        });
        let candidates = data?.content || [];
        
        if (category !== 'all') {
            candidates = candidates.filter(p => p.category === category);
        }
        
        // Random shuffle to simulate personalized feed
        const shuffled = smartRecommendShuffle(candidates, () => Math.random());

        return {
            success: true,
            data: { 
                content: shuffled, 
                total: candidates.length, 
                page, size, 
                totalPages: Math.ceil(candidates.length / size) 
            }
        };
    }

    async getProductById(id: string): Promise<Result<Product>> {
        return await this.findById(id);
    }
}

export const ProductService = new ProductServiceImpl();
