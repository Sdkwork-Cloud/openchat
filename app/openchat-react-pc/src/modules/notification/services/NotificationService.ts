import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result, PageQuery } from '../../../core/types';
import { AppEvents, eventEmitter } from '../../../core/events';
import { Notification, NotificationType, NotificationFilter, NotificationStats, NotificationSettings } from '../types';

class NotificationServiceImpl extends AbstractStorageService<Notification> {
  protected SETTINGS_KEY = 'sys_notification_settings_v1';

  constructor() {
    super('sys_notifications_v1');
  }

  protected async onInitialize() {
    const list = await this.loadData();
    if (list.length === 0) {
      const now = Date.now();
      const seeds: Partial<Notification>[] = [
        { 
          id: 'n1', 
          type: 'system', 
          title: '欢迎来到 OpenChat', 
          content: '这是您的 AI 智能助手，点击查看新手指南，开始探索无限可能。', 
          icon: '👋', 
          isRead: false, 
          link: '/help/guide',
          meta: { action: 'welcome' }
        },
        { 
          id: 'n2', 
          type: 'social', 
          title: 'Elon 点赞了你的作品', 
          content: '你的作品《赛博朋克 2077》收到一个新的赞，快去查看吧！', 
          icon: '❤️', 
          isRead: false, 
          link: '/creation',
          meta: { 
            sender: { id: 'u1', name: 'Elon', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elon' },
            action: 'like'
          }
        },
        { 
          id: 'n3', 
          type: 'order', 
          title: '订单已发货', 
          content: '您购买的 Sony WH-1000XM5 已发出，预计 2-3 天送达，点击查看物流详情。', 
          icon: '📦', 
          isRead: true, 
          link: '/commerce/orders',
          meta: { targetId: 'order_123', targetType: 'order' }
        },
        { 
          id: 'n4', 
          type: 'promotion', 
          title: '限时特惠', 
          content: 'Midjourney 绘图额度限时 5 折，仅剩 3 小时，错过再等一年！', 
          icon: '⚡', 
          isRead: false, 
          link: '/commerce/mall',
          meta: { action: 'promotion', targetId: 'promo_001' }
        },
        { 
          id: 'n5', 
          type: 'message', 
          title: '新消息', 
          content: '张三：你好，关于昨天的项目讨论，我有一些新的想法...', 
          icon: '💬', 
          isRead: false, 
          link: '/chat',
          meta: { 
            sender: { id: 'u2', name: '张三', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang' },
            action: 'message'
          }
        },
        { 
          id: 'n6', 
          type: 'system', 
          title: '系统更新完成', 
          content: 'OpenChat 已更新至 v2.0 版本，新增了 AI 绘图、语音通话等功能。', 
          icon: '🔄', 
          isRead: true, 
          link: '/help/changelog',
          meta: { action: 'update' }
        },
      ];
      const items: Notification[] = [];
      for (const s of seeds) {
        items.push({ ...s, createTime: now - Math.random() * 10000000, updateTime: now } as Notification);
      }
      for (const item of items) {
        await this.saveItem(item);
      }
    }
  }

  async getNotifications(filter: NotificationFilter = {}): Promise<Result<Notification[]>> {
    const list = await this.loadData();
    let filtered = list;

    if (filter.type && filter.type !== 'all') {
      filtered = filtered.filter(n => n.type === filter.type);
    }

    if (filter.isRead !== undefined) {
      filtered = filtered.filter(n => n.isRead === filter.isRead);
    }

    if (filter.startTime) {
      filtered = filtered.filter(n => n.createTime && n.createTime >= filter.startTime!);
    }

    if (filter.endTime) {
      filtered = filtered.filter(n => n.createTime && n.createTime <= filter.endTime!);
    }

    filtered.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));

    return { success: true, data: filtered };
  }

  async getNotificationsPage(filter: NotificationFilter = {}, pageRequest: PageQuery): Promise<Result<{ content: Notification[]; total: number }>> {
    const { data: all } = await this.getNotifications(filter);
    const total = all?.length || 0;
    const page = pageRequest.page || 1;
    const size = pageRequest.pageSize || 10;
    const start = (page - 1) * size;
    const end = start + size;
    const content = all?.slice(start, end) || [];
    return { success: true, data: { content, total } };
  }

  async getUnreadCount(): Promise<number> {
    const list = await this.loadData();
    return list.filter(n => !n.isRead).length;
  }

  async getStats(): Promise<Result<NotificationStats>> {
    const list = await this.loadData();
    const stats: NotificationStats = {
      total: list.length,
      unread: list.filter(n => !n.isRead).length,
      byType: {
        system: list.filter(n => n.type === 'system').length,
        social: list.filter(n => n.type === 'social').length,
        order: list.filter(n => n.type === 'order').length,
        promotion: list.filter(n => n.type === 'promotion').length,
        message: list.filter(n => n.type === 'message').length,
      }
    };
    return { success: true, data: stats };
  }

  async markAllRead(type?: NotificationType): Promise<Result<void>> {
    const list = await this.loadData();
    const updates = list.filter(n => {
      if (!type) return !n.isRead;
      return !n.isRead && n.type === type;
    });
    for (const n of updates) {
      n.isRead = true;
      await this.saveItem(n);
    }
    return { success: true };
  }

  async markRead(id: string): Promise<Result<void>> {
    const { data } = await this.getById(id);
    if (data && !data.isRead) {
      data.isRead = true;
      await this.saveItem(data);
    }
    return { success: true };
  }

  async markUnread(id: string): Promise<Result<void>> {
    const { data } = await this.getById(id);
    if (data && data.isRead) {
      data.isRead = false;
      await this.saveItem(data);
    }
    return { success: true };
  }

  async pushNotification(title: string, content: string, type: NotificationType = 'system', meta?: any): Promise<Result<Notification>> {
    const icons: Record<NotificationType, string> = {
      system: '🔔',
      social: '💬',
      order: '📦',
      promotion: '⚡',
      message: '✉️',
    };
    
    const notification: Notification = {
      id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      type,
      icon: icons[type],
      isRead: false,
      meta,
      createTime: Date.now(),
      updateTime: Date.now(),
    };
    
    await this.saveItem(notification);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true, data: notification };
  }

  async getSettings(): Promise<Result<NotificationSettings>> {
    const settings = localStorage.getItem(this.SETTINGS_KEY);
    if (settings) {
      return { success: true, data: JSON.parse(settings) };
    }
    
    const defaultSettings: NotificationSettings = {
      pushEnabled: true,
      soundEnabled: true,
      desktopEnabled: true,
      emailEnabled: false,
      typeSettings: {
        system: { push: true, sound: true, desktop: true },
        social: { push: true, sound: true, desktop: true },
        order: { push: true, sound: true, desktop: true },
        promotion: { push: false, sound: false, desktop: false },
        message: { push: true, sound: true, desktop: true },
      }
    };
    
    return { success: true, data: defaultSettings };
  }

  async saveSettings(settings: NotificationSettings): Promise<Result<void>> {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    return { success: true };
  }
}

export const NotificationService = new NotificationServiceImpl();
