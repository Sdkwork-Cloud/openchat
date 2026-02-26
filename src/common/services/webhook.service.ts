import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventBusService, EventTypeConstants } from '../events/event-bus.service';
import { RetryService } from './retry.service';
import { buildCacheKey } from '../decorators/cache.decorator';
import { createHmac } from 'crypto';

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  secret?: string;
  events: string[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WebhookPayload {
  id: string;
  endpointId: string;
  event: string;
  data: any;
  timestamp: number;
  signature?: string;
}

export interface WebhookDelivery {
  id: string;
  payloadId: string;
  endpointId: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: number;
  nextAttemptAt?: number;
  response?: {
    status: number;
    body?: any;
    headers?: Record<string, string>;
  };
  error?: string;
  createdAt: number;
}

export interface WebhookStats {
  totalSent: number;
  successful: number;
  failed: number;
  pending: number;
  averageResponseTime: number;
}

@Injectable()
export class WebhookService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookService.name);
  private readonly endpoints = new Map<string, WebhookEndpoint>();
  private readonly deliveries = new Map<string, WebhookDelivery>();
  private processInterval?: NodeJS.Timeout;
  private readonly maxAttempts = 5;
  private readonly retryDelays = [1000, 5000, 15000, 60000, 300000];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventBus: EventBusService,
    private readonly retryService: RetryService,
  ) {}

  onModuleInit() {
    this.loadEndpoints();
    this.startProcessing();
    this.logger.log('WebhookService initialized');
  }

  onModuleDestroy() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }

  async registerEndpoint(endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookEndpoint> {
    const id = this.generateId();
    const now = Date.now();

    const newEndpoint: WebhookEndpoint = {
      ...endpoint,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.endpoints.set(id, newEndpoint);
    await this.persistEndpoint(newEndpoint);

    this.logger.debug(`Webhook endpoint registered: ${id}`);
    return newEndpoint;
  }

  async updateEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | null> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return null;

    const updated: WebhookEndpoint = {
      ...endpoint,
      ...updates,
      id,
      updatedAt: Date.now(),
    };

    this.endpoints.set(id, updated);
    await this.persistEndpoint(updated);

    return updated;
  }

  async deleteEndpoint(id: string): Promise<boolean> {
    if (!this.endpoints.has(id)) return false;

    this.endpoints.delete(id);
    await this.redisService.del(buildCacheKey('webhook_endpoint', id));

    return true;
  }

  async getEndpoint(id: string): Promise<WebhookEndpoint | undefined> {
    return this.endpoints.get(id);
  }

  async listEndpoints(): Promise<WebhookEndpoint[]> {
    return Array.from(this.endpoints.values());
  }

  async trigger(event: string, data: any): Promise<string[]> {
    const payloadIds: string[] = [];

    for (const [id, endpoint] of this.endpoints) {
      if (!endpoint.enabled) continue;
      if (!endpoint.events.includes(event) && !endpoint.events.includes('*')) continue;

      const payloadId = await this.createPayload(endpoint, event, data);
      payloadIds.push(payloadId);

      await this.createDelivery(payloadId, endpoint);
    }

    return payloadIds;
  }

  async getDelivery(id: string): Promise<WebhookDelivery | undefined> {
    return this.deliveries.get(id);
  }

  async getStats(): Promise<WebhookStats> {
    let totalSent = 0;
    let successful = 0;
    let failed = 0;
    let pending = 0;

    for (const delivery of this.deliveries.values()) {
      switch (delivery.status) {
        case 'delivered':
          successful++;
          totalSent++;
          break;
        case 'failed':
          failed++;
          totalSent++;
          break;
        case 'pending':
          pending++;
          break;
      }
    }

    return {
      totalSent,
      successful,
      failed,
      pending,
      averageResponseTime: 0, // TODO: 实现响应时间统计
    };
  }

  async retryDelivery(deliveryId: string): Promise<boolean> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery || delivery.status === 'delivered') return false;

    delivery.status = 'pending';
    delivery.nextAttemptAt = Date.now();
    await this.persistDelivery(delivery);

    return true;
  }

  private async createPayload(
    endpoint: WebhookEndpoint,
    event: string,
    data: any,
  ): Promise<string> {
    const payloadId = this.generateId();

    const payload: WebhookPayload = {
      id: payloadId,
      endpointId: endpoint.id,
      event,
      data,
      timestamp: Date.now(),
    };

    if (endpoint.secret) {
      payload.signature = this.generateSignature(payload, endpoint.secret);
    }

    await this.redisService.set(
      buildCacheKey('webhook_payload', payloadId),
      JSON.stringify(payload),
      86400,
    );

    return payloadId;
  }

  private async createDelivery(payloadId: string, endpoint: WebhookEndpoint): Promise<void> {
    const deliveryId = this.generateId();

    const delivery: WebhookDelivery = {
      id: deliveryId,
      payloadId,
      endpointId: endpoint.id,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.maxAttempts,
      createdAt: Date.now(),
      nextAttemptAt: Date.now(),
    };

    this.deliveries.set(deliveryId, delivery);
    await this.persistDelivery(delivery);
  }

  private async processDeliveries(): Promise<void> {
    const now = Date.now();

    for (const [id, delivery] of this.deliveries) {
      if (delivery.status !== 'pending') continue;
      if (delivery.nextAttemptAt && delivery.nextAttemptAt > now) continue;

      await this.attemptDelivery(delivery);
    }
  }

  private async attemptDelivery(delivery: WebhookDelivery): Promise<void> {
    const endpoint = this.endpoints.get(delivery.endpointId);
    if (!endpoint) {
      delivery.status = 'failed';
      delivery.error = 'Endpoint not found';
      await this.persistDelivery(delivery);
      return;
    }

    const payloadData = await this.redisService.get(
      buildCacheKey('webhook_payload', delivery.payloadId),
    );
    if (!payloadData) {
      delivery.status = 'failed';
      delivery.error = 'Payload not found';
      await this.persistDelivery(delivery);
      return;
    }

    const payload = JSON.parse(payloadData) as WebhookPayload;
    delivery.attempts++;
    delivery.lastAttemptAt = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...endpoint.headers,
      };

      if (payload.signature) {
        headers['X-Webhook-Signature'] = payload.signature;
      }

      headers['X-Webhook-Event'] = payload.event;
      headers['X-Webhook-ID'] = payload.id;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers,
          body: JSON.stringify(payload.data),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          delivery.status = 'delivered';
          delivery.response = {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
          };

          await this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, {
            type: 'webhook.delivered',
            deliveryId: delivery.id,
            endpointId: endpoint.id,
            event: payload.event,
          });

          this.logger.debug(`Webhook delivered: ${delivery.id}`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (fetchError: any) {
        clearTimeout(timeout);
        throw fetchError;
      }
    } catch (error: any) {
      delivery.error = error.message;

      if (delivery.attempts >= delivery.maxAttempts) {
        delivery.status = 'failed';

        await this.eventBus.publish(EventTypeConstants.CUSTOM_EVENT, {
          type: 'webhook.failed',
          deliveryId: delivery.id,
          endpointId: endpoint.id,
          event: payload.event,
          error: error.message,
        });

        this.logger.warn(`Webhook failed: ${delivery.id} - ${error.message}`);
      } else {
        delivery.nextAttemptAt = Date.now() + this.retryDelays[delivery.attempts - 1];
      }
    }

    await this.persistDelivery(delivery);
  }

  private generateSignature(payload: WebhookPayload, secret: string): string {
    const data = JSON.stringify({
      id: payload.id,
      event: payload.event,
      data: payload.data,
      timestamp: payload.timestamp,
    });

    // 使用 HMAC-SHA256 替代简单的 SHA256，更安全
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  private async loadEndpoints(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys('webhook_endpoint:*');

      for (const key of keys) {
        const data = await this.redisService.get(key);
        if (data) {
          const endpoint = JSON.parse(data) as WebhookEndpoint;
          this.endpoints.set(endpoint.id, endpoint);
        }
      }

      this.logger.debug(`Loaded ${this.endpoints.size} webhook endpoints`);
    } catch (error) {
      this.logger.error('Failed to load webhook endpoints:', error);
    }
  }

  private async persistEndpoint(endpoint: WebhookEndpoint): Promise<void> {
    await this.redisService.set(
      buildCacheKey('webhook_endpoint', endpoint.id),
      JSON.stringify(endpoint),
    );
  }

  private async persistDelivery(delivery: WebhookDelivery): Promise<void> {
    await this.redisService.set(
      buildCacheKey('webhook_delivery', delivery.id),
      JSON.stringify(delivery),
      86400 * 7,
    );
  }

  private startProcessing(): void {
    this.processInterval = setInterval(() => {
      this.processDeliveries().catch((err) => {
        this.logger.error('Failed to process webhook deliveries:', err);
      });
    }, 5000);
  }

  private generateId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function WebhookTrigger(event: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const webhookService = (this as any).webhookService as WebhookService;
      if (webhookService) {
        await webhookService.trigger(event, result);
      }

      return result;
    };

    return descriptor;
  };
}
