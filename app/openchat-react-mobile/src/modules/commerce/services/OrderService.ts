
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page, FilterCriterion } from '../../../core/types';
import { CartItem } from './CartService';
import { Address } from '../../user/services/AddressService';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'refunded' | 'cancelled';

export interface OrderItem {
    productId: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    sku?: string;
}

export interface Order extends BaseEntity {
    orderNo: string;
    status: OrderStatus;
    items: OrderItem[];
    totalAmount: number;
    actualAmount: number;
    freight: number;
    address: Address; // Snapshot of address
    buyerNote?: string;
    trackingNo?: string;
    trackingCompany?: string;
}

class OrderServiceImpl extends AbstractStorageService<Order> {
    protected STORAGE_KEY = 'sys_orders_v2';

    constructor() {
        super();
        // Seed logic handled if empty, usually orders start empty for new user
    }

    async createOrder(items: CartItem[], address: Address, note?: string): Promise<Result<Order>> {
        if (!items || items.length === 0) return { success: false, message: 'No items' };
        if (!address) return { success: false, message: 'No address' };

        const now = Date.now();
        const orderNo = `${now}${Math.floor(Math.random() * 1000)}`;
        
        const orderItems: OrderItem[] = items.map(i => ({
            productId: i.productId,
            name: i.title,
            image: i.image,
            price: i.price,
            quantity: i.quantity,
            sku: i.sku
        }));

        const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        // Mock logic: Free shipping over 100
        const freight = totalAmount > 100 ? 0 : 10;
        const actualAmount = totalAmount + freight;

        const newOrder: Order = {
            id: `ord_${orderNo}`,
            orderNo,
            status: 'pending',
            items: orderItems,
            totalAmount,
            actualAmount,
            freight,
            address: { ...address }, // Snapshot
            buyerNote: note,
            createTime: now,
            updateTime: now
        };

        return await this.save(newOrder);
    }

    async getOrders(status: string = 'all', page: number = 1, size: number = 20): Promise<Result<Page<Order>>> {
        const filters: FilterCriterion[] = [];
        
        if (status !== 'all') {
            filters.push({ field: 'status', operator: 'eq', value: status });
        }

        return await this.findAll({
            pageRequest: { page, size },
            sort: { field: 'createTime', order: 'desc' },
            filters: filters
        });
    }

    async getOrderDetail(id: string): Promise<Result<Order>> {
        return await this.findById(id);
    }

    async payOrder(id: string): Promise<Result<void>> {
        const { data } = await this.findById(id);
        if (data && data.status === 'pending') {
            data.status = 'paid';
            data.updateTime = Date.now();
            await this.save(data);
            
            // Mock auto-ship
            setTimeout(async () => {
                const fresh = await this.findById(id);
                if (fresh.data && fresh.data.status === 'paid') {
                    fresh.data.status = 'shipped';
                    fresh.data.trackingCompany = '顺丰速运';
                    fresh.data.trackingNo = `SF${Date.now()}`;
                    await this.save(fresh.data);
                }
            }, 10000); // 10s auto ship for demo

            return { success: true };
        }
        return { success: false, message: '支付失败' };
    }

    async cancelOrder(id: string): Promise<Result<void>> {
        const { data } = await this.findById(id);
        if (data && data.status === 'pending') {
            data.status = 'cancelled';
            data.updateTime = Date.now();
            await this.save(data);
            return { success: true };
        }
        return { success: false, message: '无法取消' };
    }
}

export const OrderService = new OrderServiceImpl();
