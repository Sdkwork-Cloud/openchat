
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';
import { Product } from './ProductService';

export interface CartItem extends BaseEntity {
    productId: string;
    title: string;
    price: number;
    image: string;
    quantity: number;
    selected: boolean;
    sku?: string; // e.g. "Color: Black"
    shopName: string;
}

class CartServiceImpl extends AbstractStorageService<CartItem> {
    protected STORAGE_KEY = 'sys_user_cart_v1';

    async addToCart(product: Product, quantity: number = 1, sku: string = '默认规格'): Promise<Result<CartItem>> {
        const list = await this.loadData();
        
        // Check if same product + sku exists
        const existing = list.find(item => item.productId === product.id && item.sku === sku);
        
        if (existing) {
            existing.quantity += quantity;
            existing.updateTime = Date.now();
            await this.save(existing);
            return { success: true, data: existing };
        } else {
            const newItem: Partial<CartItem> = {
                productId: product.id,
                title: product.title,
                price: product.price,
                image: product.cover,
                quantity,
                selected: true,
                sku,
                shopName: product.shopName,
                createTime: Date.now(),
                updateTime: Date.now()
            };
            return await this.save(newItem);
        }
    }

    async getCartItems(): Promise<Result<CartItem[]>> {
        const { data } = await this.findAll({ 
            sort: { field: 'createTime', order: 'desc' } 
        });
        return { success: true, data: data?.content || [] };
    }

    async updateQuantity(id: string, delta: number): Promise<Result<void>> {
        const { data } = await this.findById(id);
        if (data) {
            data.quantity += delta;
            if (data.quantity < 1) data.quantity = 1;
            await this.save(data);
            return { success: true };
        }
        return { success: false };
    }

    async toggleSelection(id: string): Promise<Result<void>> {
        const { data } = await this.findById(id);
        if (data) {
            data.selected = !data.selected;
            await this.save(data);
            return { success: true };
        }
        return { success: false };
    }

    async toggleAll(selected: boolean): Promise<Result<void>> {
        const list = await this.loadData();
        const updates = list.map(item => ({ ...item, selected }));
        // Optimized batch save
        this.cache = updates;
        await this.commit();
        return { success: true };
    }

    async removeItems(ids: string[]): Promise<Result<void>> {
        for (const id of ids) {
            await this.deleteById(id);
        }
        return { success: true };
    }

    async getCartCount(): Promise<number> {
        const list = await this.loadData();
        return list.reduce((acc, item) => acc + item.quantity, 0);
    }
}

export const CartService = new CartServiceImpl();
