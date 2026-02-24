
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';
import { AppEvents, EVENTS } from '../../../core/events';

export type NotificationType = 'system' | 'social' | 'order' | 'promotion';

export interface Notification extends BaseEntity {
    type: NotificationType;
    title: string;
    content: string;
    icon?: string;
    link?: string;
    isRead: boolean;
    meta?: any;
}

class NotificationServiceImpl extends AbstractStorageService<Notification> {
    protected STORAGE_KEY = 'sys_notifications_v1';

    protected async onInitialize() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            const seeds: Partial<Notification>[] = [
                { id: 'n1', type: 'system', title: '欢迎来到 OpenChat', content: '这是您的 AI 智能助手，点击查看新手指南。', icon: '👋', isRead: false, link: '/general?title=新手指南' },
                { id: 'n2', type: 'social', title: 'Elon 点赞了你的作品', content: '你的作品《赛博朋克 2077》收到一个新的赞。', icon: '❤️', isRead: false, link: '/creation' },
                { id: 'n3', type: 'order', title: '订单已发货', content: '您购买的 Sony WH-1000XM5 已发出，点击查看物流。', icon: '📦', isRead: true, link: '/orders' },
                { id: 'n4', type: 'promotion', title: '限时特惠', content: 'Midjourney 绘图额度限时 5 折，仅剩 3 小时！', icon: '⚡', isRead: false, link: '/commerce/mall' },
            ];
            const items: Notification[] = [];
            for (const s of seeds) {
                items.push({ ...s, createTime: now - Math.random() * 10000000, updateTime: now } as Notification);
            }
            this.cache = items;
            await this.commit();
        }
    }

    async getNotifications(type: 'all' | NotificationType = 'all'): Promise<Result<Notification[]>> {
        const filters = type !== 'all' ? [{ field: 'type', operator: 'eq', value: type }] : [];
        const { data } = await this.findAll({
            filters: filters as any,
            sort: { field: 'createTime', order: 'desc' },
            pageRequest: { page: 1, size: 50 }
        });
        return { success: true, data: data?.content || [] };
    }

    async getUnreadCount(): Promise<number> {
        const list = await this.loadData();
        return list.filter(n => !n.isRead).length;
    }

    async markAllRead(): Promise<Result<void>> {
        const list = await this.loadData();
        const updates = list.filter(n => !n.isRead).map(n => ({ ...n, isRead: true }));
        for (const n of updates) await this.save(n);
        return { success: true };
    }

    async markRead(id: string): Promise<Result<void>> {
        const { data } = await this.findById(id);
        if (data && !data.isRead) {
            data.isRead = true;
            await this.save(data);
        }
        return { success: true };
    }

    async pushNotification(title: string, content: string, type: NotificationType = 'system'): Promise<void> {
        await this.save({ title, content, type, isRead: false, icon: type === 'order' ? '📦' : (type === 'social' ? '💬' : '🔔'), createTime: Date.now(), updateTime: Date.now() });
        AppEvents.emit(EVENTS.DATA_CHANGE, { key: this.STORAGE_KEY });
    }
}

export const NotificationService = new NotificationServiceImpl();
