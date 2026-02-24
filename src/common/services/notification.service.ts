import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService, EventTypeConstants } from '../events/event-bus.service';
import { QueueService, NotificationJobData } from '../queue/queue.service';

export interface NotificationChannel {
  type: 'push' | 'email' | 'sms' | 'in_app' | 'websocket';
  enabled: boolean;
  priority: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  image?: string;
  badge?: string;
  sound?: string;
  clickAction?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationOptions {
  channels?: NotificationChannel['type'][];
  priority?: 'high' | 'normal' | 'low';
  ttl?: number;
  collapseKey?: string;
  delay?: number;
  userIds?: string[];
  excludeUserIds?: string[];
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  notificationId: string;
  channels: {
    type: NotificationChannel['type'];
    success: boolean;
    error?: string;
  }[];
  timestamp: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationChannel['type'];
  subject?: string;
  body: string;
  variables: string[];
}

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private readonly templates = new Map<string, NotificationTemplate>();
  private readonly userPreferences = new Map<string, Set<NotificationChannel['type']>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
    @Optional() private readonly queueService?: QueueService,
  ) {}

  async onModuleInit() {
    await this.loadTemplates();
    this.logger.log('NotificationService initialized');
  }

  async onModuleDestroy() {
    this.templates.clear();
    this.userPreferences.clear();
    this.logger.log('NotificationService destroyed');
  }

  async send(
    userId: string,
    payload: NotificationPayload,
    options?: NotificationOptions,
  ): Promise<NotificationResult> {
    const notificationId = this.generateNotificationId();
    const channels = options?.channels || ['in_app', 'websocket'];
    const results: NotificationResult['channels'] = [];

    for (const channelType of channels) {
      try {
        const result = await this.sendToChannel(channelType, userId, payload, options);
        results.push({
          type: channelType,
          success: result,
        });
      } catch (error: any) {
        this.logger.error(`Failed to send notification via ${channelType}:`, error);
        results.push({
          type: channelType,
          success: false,
          error: error.message,
        });
      }
    }

    const success = results.some(r => r.success);

    if (success) {
      await this.eventBus.publish(EventTypeConstants.MESSAGE_SENT, {
        notificationId,
        userId,
        payload,
        channels: results,
      });
    }

    return {
      success,
      notificationId,
      channels: results,
      timestamp: new Date(),
    };
  }

  async sendBatch(
    userIds: string[],
    payload: NotificationPayload,
    options?: NotificationOptions,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const batchSize = 50;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(userId => this.send(userId, payload, options)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  async sendToTopic(
    topic: string,
    payload: NotificationPayload,
    options?: NotificationOptions,
  ): Promise<NotificationResult> {
    const notificationId = this.generateNotificationId();

    await this.eventBus.publish(EventTypeConstants.MESSAGE_SENT, {
      notificationId,
      topic,
      payload,
      type: 'topic',
    });

    return {
      success: true,
      notificationId,
      channels: [{ type: 'push', success: true }],
      timestamp: new Date(),
    };
  }

  async sendWithTemplate(
    userId: string,
    templateId: string,
    variables: Record<string, any>,
    options?: NotificationOptions,
  ): Promise<NotificationResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const payload = this.renderTemplate(template, variables);
    return this.send(userId, payload, { ...options, channels: [template.type] });
  }

  async schedule(
    userId: string,
    payload: NotificationPayload,
    scheduledAt: Date,
    options?: NotificationOptions,
  ): Promise<string> {
    const notificationId = this.generateNotificationId();
    const delay = scheduledAt.getTime() - Date.now();

    if (delay <= 0) {
      await this.send(userId, payload, options);
      return notificationId;
    }

    if (this.queueService) {
      await this.queueService.enqueueNotification(
        {
          userIds: [userId],
          event: 'scheduled_notification',
          data: { notificationId, payload, options },
        },
        delay,
      );
    }

    return notificationId;
  }

  async cancel(notificationId: string): Promise<boolean> {
    return true;
  }

  async getUserPreferences(userId: string): Promise<NotificationChannel['type'][]> {
    const prefs = this.userPreferences.get(userId);
    return prefs ? Array.from(prefs) : ['in_app', 'websocket'];
  }

  async setUserPreferences(
    userId: string,
    channels: NotificationChannel['type'][],
  ): Promise<void> {
    this.userPreferences.set(userId, new Set(channels));
  }

  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    this.logger.debug(`Template registered: ${template.id}`);
  }

  private async sendToChannel(
    channelType: NotificationChannel['type'],
    userId: string,
    payload: NotificationPayload,
    options?: NotificationOptions,
  ): Promise<boolean> {
    switch (channelType) {
      case 'websocket':
        return this.sendViaWebSocket(userId, payload);
      case 'in_app':
        return this.sendInApp(userId, payload);
      case 'push':
        return this.sendPush(userId, payload, options);
      case 'email':
        return this.sendEmail(userId, payload);
      case 'sms':
        return this.sendSms(userId, payload);
      default:
        this.logger.warn(`Unknown channel type: ${channelType}`);
        return false;
    }
  }

  private async sendViaWebSocket(userId: string, payload: NotificationPayload): Promise<boolean> {
    await this.eventBus.publish(EventTypeConstants.MESSAGE_SENT, {
      type: 'websocket',
      userId,
      payload,
    });
    return true;
  }

  private async sendInApp(userId: string, payload: NotificationPayload): Promise<boolean> {
    await this.eventBus.publish(EventTypeConstants.MESSAGE_SENT, {
      type: 'in_app',
      userId,
      payload,
      timestamp: Date.now(),
    });
    return true;
  }

  private async sendPush(
    userId: string,
    payload: NotificationPayload,
    options?: NotificationOptions,
  ): Promise<boolean> {
    this.logger.debug(`Push notification sent to user ${userId}: ${payload.title}`);
    return true;
  }

  private async sendEmail(userId: string, payload: NotificationPayload): Promise<boolean> {
    this.logger.debug(`Email sent to user ${userId}: ${payload.title}`);
    return true;
  }

  private async sendSms(userId: string, payload: NotificationPayload): Promise<boolean> {
    this.logger.debug(`SMS sent to user ${userId}: ${payload.body}`);
    return true;
  }

  private renderTemplate(template: NotificationTemplate, variables: Record<string, any>): NotificationPayload {
    let body = template.body;
    let title = template.subject || '';

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { title, body, data: variables };
  }

  private async loadTemplates(): Promise<void> {
    this.registerTemplate({
      id: 'message_received',
      name: '新消息通知',
      type: 'in_app',
      subject: '您有新消息',
      body: '{{senderName}}: {{messagePreview}}',
      variables: ['senderName', 'messagePreview'],
    });

    this.registerTemplate({
      id: 'friend_request',
      name: '好友请求',
      type: 'in_app',
      subject: '新的好友请求',
      body: '{{userName}} 想添加您为好友',
      variables: ['userName'],
    });

    this.registerTemplate({
      id: 'group_invitation',
      name: '群组邀请',
      type: 'in_app',
      subject: '群组邀请',
      body: '{{inviterName}} 邀请您加入群组 {{groupName}}',
      variables: ['inviterName', 'groupName'],
    });
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
