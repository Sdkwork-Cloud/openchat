import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { BotEntity, BotIntent } from '../entities/bot.entity';

/**
 * Webhook 事件载荷
 */
export interface WebhookPayload {
  eventId: string;               // 事件唯一标识（幂等性）
  eventType: string;             // 事件类型
  timestamp: number;             // 时间戳（毫秒）
  botId: string;                 // Bot ID
  data: any;                     // 事件数据
}

/**
 * Webhook 发送结果
 */
export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  retryCount: number;
  latency: number;
}

/**
 * Webhook 重试任务
 */
interface WebhookRetryTask {
  botId: string;
  payload: WebhookPayload;
  attempt: number;
  nextRetryAt: number;
}

/**
 * Webhook 服务
 * 负责事件签名、推送、重试
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private retryQueue: WebhookRetryTask[] = [];
  private isProcessingQueue = false;

  constructor(
    @InjectRepository(BotEntity)
    private botRepository: Repository<BotEntity>,
  ) {
    // 启动重试队列处理器
    this.startRetryProcessor();
  }

  /**
   * 发送 Webhook 事件
   */
  async sendEvent(botId: string, eventType: string, data: any): Promise<WebhookResult> {
    const bot = await this.botRepository.findOne({ where: { id: botId } });

    if (!bot || bot.status !== 'active') {
      return {
        success: false,
        error: 'Bot not found or inactive',
        retryCount: 0,
        latency: 0
      };
    }

    // 检查是否配置了 Webhook
    if (!bot.webhook) {
      return {
        success: false,
        error: 'Webhook not configured',
        retryCount: 0,
        latency: 0
      };
    }

    // 检查是否订阅了该事件
    if (!this.isEventSubscribed(bot, eventType)) {
      return {
        success: true,
        retryCount: 0,
        latency: 0
      };
    }

    // 检查事件过滤
    if (!this.passesFilters(bot, eventType, data)) {
      return {
        success: true,
        retryCount: 0,
        latency: 0
      };
    }

    // 构建事件载荷
    const payload: WebhookPayload = {
      eventId: this.generateEventId(),
      eventType,
      timestamp: Date.now(),
      botId,
      data
    };

    // 发送 Webhook
    return this.deliverWebhook(bot, payload);
  }

  /**
   * 批量发送事件
   */
  async sendEventBatch(botId: string, events: Array<{ type: string; data: any }>): Promise<WebhookResult[]> {
    const results: WebhookResult[] = [];

    for (const event of events) {
      const result = await this.sendEvent(botId, event.type, event.data);
      results.push(result);
    }

    return results;
  }

  /**
   * 验证 Webhook 签名
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证时间戳（防重放攻击）
   */
  verifyTimestamp(timestamp: number, tolerance: number = 5 * 60 * 1000): boolean {
    const now = Date.now();
    return Math.abs(now - timestamp) < tolerance;
  }

  // ========== 私有方法 ==========

  /**
   * 发送 Webhook
   */
  private async deliverWebhook(bot: BotEntity, payload: WebhookPayload): Promise<WebhookResult> {
    const startTime = Date.now();
    const webhook = bot.webhook!;

    // 签名载荷
    const signature = this.signPayload(JSON.stringify(payload), webhook.secret);

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-OpenChat-Signature': signature,
          'X-OpenChat-Timestamp': payload.timestamp.toString(),
          'X-OpenChat-Version': 'v1',
          'User-Agent': 'OpenChat-Webhook/1.0'
        },
        timeout: webhook.timeout,
        validateStatus: () => true // 允许任何状态码
      });

      const latency = Date.now() - startTime;

      // 2xx 状态码视为成功
      if (response.status >= 200 && response.status < 300) {
        this.logger.debug(`Webhook delivered: ${bot.username} - ${payload.eventType} (${latency}ms)`);

        return {
          success: true,
          statusCode: response.status,
          retryCount: 0,
          latency
        };
      }

      // 4xx 错误不重试（客户端错误）
      if (response.status >= 400 && response.status < 500) {
        this.logger.warn(`Webhook client error: ${bot.username} - ${response.status}`);

        return {
          success: false,
          statusCode: response.status,
          error: `Client error: ${response.status}`,
          retryCount: 0,
          latency
        };
      }

      // 5xx 错误需要重试
      throw new Error(`Server error: ${response.status}`);

    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Webhook delivery failed: ${bot.username} - ${errorMessage}`);

      // 添加到重试队列
      this.scheduleRetry(bot.id, payload, webhook.retryPolicy.maxRetries);

      return {
        success: false,
        error: errorMessage,
        retryCount: 0,
        latency
      };
    }
  }

  /**
   * 签名载荷
   */
  private signPayload(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * 生成事件 ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * 检查是否订阅了事件
   */
  private isEventSubscribed(bot: BotEntity, eventType: string): boolean {
    if (!bot.webhook) return false;

    // 检查事件类型是否匹配
    return bot.webhook.events.some(pattern => {
      // 支持通配符匹配
      if (pattern === '*') return true;
      if (pattern === eventType) return true;
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        return eventType.startsWith(prefix + '.');
      }
      return false;
    });
  }

  /**
   * 检查是否通过过滤器
   */
  private passesFilters(bot: BotEntity, eventType: string, data: any): boolean {
    if (!bot.webhook?.filters) return true;

    const filters = bot.webhook.filters;

    // 会话过滤
    if (filters.conversations && data.conversationId) {
      if (!filters.conversations.includes(data.conversationId)) {
        return false;
      }
    }

    // 用户过滤
    if (filters.users && data.userId) {
      if (!filters.users.includes(data.userId)) {
        return false;
      }
    }

    // 群组过滤
    if (filters.groups && data.groupId) {
      if (!filters.groups.includes(data.groupId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 安排重试
   */
  private scheduleRetry(botId: string, payload: WebhookPayload, maxRetries: number): void {
    const task: WebhookRetryTask = {
      botId,
      payload,
      attempt: 1,
      nextRetryAt: this.calculateNextRetryTime(1)
    };

    this.retryQueue.push(task);
    this.logger.debug(`Webhook retry scheduled: ${botId} - attempt ${task.attempt}`);
  }

  /**
   * 计算下次重试时间
   */
  private calculateNextRetryTime(attempt: number): number {
    // 指数退避：1s, 2s, 4s, 8s, 16s...
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
    return Date.now() + delay;
  }

  /**
   * 启动重试处理器
   */
  private startRetryProcessor(): void {
    setInterval(async () => {
      if (this.isProcessingQueue || this.retryQueue.length === 0) {
        return;
      }

      this.isProcessingQueue = true;

      try {
        const now = Date.now();
        const tasksToProcess = this.retryQueue.filter(task => task.nextRetryAt <= now);

        for (const task of tasksToProcess) {
          await this.processRetryTask(task);
        }

        // 移除已处理或超过重试次数的任务
        const validTasks: typeof this.retryQueue = [];
        for (const task of this.retryQueue) {
          try {
            const bot = await this.botRepository.findOne({ where: { id: task.botId } });
            const maxRetries = bot?.webhook?.retryPolicy.maxRetries || 3;
            if (task.attempt < maxRetries) {
              validTasks.push(task);
            }
          } catch (error) {
            this.logger.error(`Error checking retry task for bot ${task.botId}:`, error);
            // 出错时保留任务，避免丢失
            validTasks.push(task);
          }
        }
        this.retryQueue = validTasks;

      } finally {
        this.isProcessingQueue = false;
      }
    }, 1000); // 每秒检查一次
  }

  /**
   * 处理重试任务
   */
  private async processRetryTask(task: WebhookRetryTask): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id: task.botId } });

    if (!bot || bot.status !== 'active' || !bot.webhook) {
      return;
    }

    const maxRetries = bot.webhook.retryPolicy.maxRetries;

    if (task.attempt >= maxRetries) {
      this.logger.error(`Webhook max retries exceeded: ${bot.username} - ${task.payload.eventType}`);
      return;
    }

    try {
      const signature = this.signPayload(JSON.stringify(task.payload), bot.webhook.secret);

      const response = await axios.post(bot.webhook.url, task.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-OpenChat-Signature': signature,
          'X-OpenChat-Timestamp': task.payload.timestamp.toString(),
          'X-OpenChat-Version': 'v1',
          'User-Agent': 'OpenChat-Webhook/1.0'
        },
        timeout: bot.webhook.timeout,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.debug(`Webhook retry succeeded: ${bot.username} - attempt ${task.attempt}`);
        task.attempt = maxRetries; // 标记为完成
      } else if (response.status >= 400 && response.status < 500) {
        // 客户端错误，不再重试
        this.logger.warn(`Webhook retry client error: ${bot.username} - ${response.status}`);
        task.attempt = maxRetries;
      } else {
        // 继续重试
        task.attempt++;
        task.nextRetryAt = this.calculateNextRetryTime(task.attempt);
      }

    } catch (error) {
      this.logger.error(`Webhook retry failed: ${bot.username} - attempt ${task.attempt}`);
      task.attempt++;
      task.nextRetryAt = this.calculateNextRetryTime(task.attempt);
    }
  }

  /**
   * 获取 Webhook 统计
   */
  async getWebhookStats(botId: string): Promise<{
    configured: boolean;
    url?: string;
    events: string[];
    pendingRetries: number;
  }> {
    const bot = await this.botRepository.findOne({ where: { id: botId } });

    if (!bot || !bot.webhook) {
      return {
        configured: false,
        events: [],
        pendingRetries: 0
      };
    }

    const pendingRetries = this.retryQueue.filter(task => task.botId === botId).length;

    return {
      configured: true,
      url: bot.webhook.url,
      events: bot.webhook.events,
      pendingRetries
    };
  }
}
