import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in-app' | 'webhook';
export type NotificationStatus = 'pending' | 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled';

export interface NotificationRecipient {
  id?: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  userId?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject?: string;
  content: string;
  htmlContent?: string;
  data?: Record<string, any>;
  template?: string;
  templateData?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt?: number;
  sentAt?: number;
  deliveredAt?: number;
  error?: string;
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface NotificationOptions {
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  subject?: string;
  content: string;
  htmlContent?: string;
  data?: Record<string, any>;
  template?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: number;
  maxAttempts?: number;
  metadata?: Record<string, any>;
}

export interface NotificationProvider {
  name: string;
  channel: NotificationChannel;
  send(notification: Notification): Promise<boolean>;
}

export interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  byChannel: Record<NotificationChannel, number>;
  byPriority: Record<string, number>;
}

export interface NotificationQuery {
  channel?: NotificationChannel;
  status?: NotificationStatus | NotificationStatus[];
  recipientId?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifications = new Map<string, Notification>();
  private readonly providers = new Map<NotificationChannel, NotificationProvider>();
  private readonly queues = new Map<string, Notification[]>();
  private processingInterval?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('NotificationService initialized');
    this.startProcessing();
  }

  onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider);
    this.logger.log(`Notification provider '${provider.name}' registered for channel '${provider.channel}'`);
  }

  async send(options: NotificationOptions): Promise<Notification> {
    const notification: Notification = {
      id: this.generateNotificationId(),
      channel: options.channel,
      recipient: options.recipient,
      subject: options.subject,
      content: options.content,
      htmlContent: options.htmlContent,
      data: options.data,
      template: options.template,
      templateData: options.templateData,
      priority: options.priority || 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      scheduledAt: options.scheduledAt,
      createdAt: Date.now(),
      metadata: options.metadata,
    };

    this.notifications.set(notification.id, notification);

    if (notification.scheduledAt && notification.scheduledAt > Date.now()) {
      this.scheduleNotification(notification);
    } else {
      await this.processNotification(notification);
    }

    return notification;
  }

  async sendBatch(optionsList: NotificationOptions[]): Promise<Notification[]> {
    const results: Notification[] = [];

    for (const options of optionsList) {
      const notification = await this.send(options);
      results.push(notification);
    }

    return results;
  }

  async cancel(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    if (notification.status === 'pending' || notification.status === 'scheduled') {
      notification.status = 'cancelled';
      return true;
    }

    return false;
  }

  async retry(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.status !== 'failed') return false;

    notification.status = 'pending';
    notification.error = undefined;

    await this.processNotification(notification);
    return true;
  }

  getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  query(query: NotificationQuery): Notification[] {
    let results = Array.from(this.notifications.values());

    if (query.channel) {
      results = results.filter(n => n.channel === query.channel);
    }

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      results = results.filter(n => statuses.includes(n.status));
    }

    if (query.recipientId) {
      results = results.filter(n => n.recipient.id === query.recipientId || n.recipient.userId === query.recipientId);
    }

    if (query.fromTimestamp !== undefined) {
      results = results.filter(n => n.createdAt >= query.fromTimestamp!);
    }

    if (query.toTimestamp !== undefined) {
      results = results.filter(n => n.createdAt <= query.toTimestamp!);
    }

    results.sort((a, b) => b.createdAt - a.createdAt);

    if (query.offset !== undefined) {
      results = results.slice(query.offset);
    }

    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  getStats(): NotificationStats {
    const notifications = Array.from(this.notifications.values());

    const stats: NotificationStats = {
      total: notifications.length,
      pending: notifications.filter(n => n.status === 'pending').length,
      sent: notifications.filter(n => n.status === 'sent').length,
      delivered: notifications.filter(n => n.status === 'delivered').length,
      failed: notifications.filter(n => n.status === 'failed').length,
      byChannel: {
        email: 0,
        sms: 0,
        push: 0,
        'in-app': 0,
        webhook: 0,
      },
      byPriority: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0,
      },
    };

    for (const notification of notifications) {
      stats.byChannel[notification.channel]++;
      stats.byPriority[notification.priority]++;
    }

    return stats;
  }

  getPendingCount(): number {
    return Array.from(this.notifications.values()).filter(n => n.status === 'pending').length;
  }

  createQueue(name: string): void {
    if (!this.queues.has(name)) {
      this.queues.set(name, []);
    }
  }

  addToQueue(queueName: string, options: NotificationOptions): Notification {
    this.createQueue(queueName);

    const notification: Notification = {
      id: this.generateNotificationId(),
      channel: options.channel,
      recipient: options.recipient,
      subject: options.subject,
      content: options.content,
      htmlContent: options.htmlContent,
      data: options.data,
      template: options.template,
      templateData: options.templateData,
      priority: options.priority || 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      scheduledAt: options.scheduledAt,
      createdAt: Date.now(),
      metadata: options.metadata,
    };

    this.notifications.set(notification.id, notification);
    this.queues.get(queueName)!.push(notification);

    return notification;
  }

  async processQueue(queueName: string): Promise<Notification[]> {
    const queue = this.queues.get(queueName);
    if (!queue || queue.length === 0) return [];

    const results: Notification[] = [];

    while (queue.length > 0) {
      const notification = queue.shift()!;
      await this.processNotification(notification);
      results.push(notification);
    }

    return results;
  }

  private async processNotification(notification: Notification): Promise<void> {
    const provider = this.providers.get(notification.channel);

    if (!provider) {
      notification.status = 'failed';
      notification.error = `No provider registered for channel '${notification.channel}'`;
      this.logger.error(notification.error);
      return;
    }

    notification.attempts++;
    notification.status = 'sent';

    try {
      const success = await provider.send(notification);

      if (success) {
        notification.status = 'delivered';
        notification.deliveredAt = Date.now();
        this.logger.debug(`Notification ${notification.id} delivered via ${notification.channel}`);
      } else {
        throw new Error('Provider returned false');
      }
    } catch (error: any) {
      notification.error = error.message;

      if (notification.attempts < notification.maxAttempts) {
        notification.status = 'pending';
        this.scheduleRetry(notification);
        this.logger.warn(`Notification ${notification.id} failed, will retry (attempt ${notification.attempts}/${notification.maxAttempts})`);
      } else {
        notification.status = 'failed';
        this.logger.error(`Notification ${notification.id} failed after ${notification.attempts} attempts: ${error.message}`);
      }
    }
  }

  private scheduleNotification(notification: Notification): void {
    if (!notification.scheduledAt) return;

    const delay = notification.scheduledAt - Date.now();
    if (delay <= 0) {
      this.processNotification(notification);
      return;
    }

    setTimeout(() => {
      if (notification.status === 'pending') {
        this.processNotification(notification);
      }
    }, delay);
  }

  private scheduleRetry(notification: Notification): void {
    const delay = Math.min(1000 * Math.pow(2, notification.attempts - 1), 60000);

    setTimeout(() => {
      if (notification.status === 'pending') {
        this.processNotification(notification);
      }
    }, delay);
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processPendingNotifications();
    }, 5000);
  }

  private async processPendingNotifications(): Promise<void> {
    const pending = Array.from(this.notifications.values())
      .filter(n => n.status === 'pending' && (!n.scheduledAt || n.scheduledAt <= Date.now()))
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    for (const notification of pending.slice(0, 10)) {
      await this.processNotification(notification);
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
