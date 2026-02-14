import { Injectable, Logger } from '@nestjs/common';
import { WukongIMChannelType } from './wukongim.constants';
import { WukongIMUtils } from './wukongim.utils';
import { WukongIMClient } from './wukongim.client';
import { MetricsService } from '../../common/metrics/metrics.service';

export interface SendMessageOptions {
  channelId: string;
  channelType: WukongIMChannelType;
  fromUid: string;
  payload: string;
  clientMsgNo?: string;
}

export interface CreateChannelOptions {
  channelId: string;
  channelType: WukongIMChannelType;
  name?: string;
  avatar?: string;
}

export interface CreateUserOptions {
  uid: string;
  name?: string;
  avatar?: string;
  token?: string;
}

@Injectable()
export class WukongIMService {
  private readonly logger = new Logger(WukongIMService.name);

  constructor(
    private readonly wukongIMClient: WukongIMClient,
    private readonly metricsService: MetricsService,
  ) {
    this.logger.log('WukongIM Service initialized');
  }

  getConnectionConfig(uid: string) {
    const config = this.wukongIMClient.getConfig();
    return {
      tcpAddr: config.tcpAddr,
      wsUrl: config.wsUrl,
      apiUrl: config.apiUrl,
      managerUrl: config.managerUrl,
      uid,
    };
  }

  // ==================== Message APIs ====================

  async sendMessage(options: SendMessageOptions): Promise<any> {
    return this.executeWithMetrics('sendMessage', options.channelId, async () => {
      return this.wukongIMClient.sendMessage({
        channel_id: options.channelId,
        channel_type: options.channelType,
        from_uid: options.fromUid,
        payload: options.payload,
        client_msg_no: options.clientMsgNo,
      });
    });
  }

  async sendBatchMessages(messages: SendMessageOptions[]): Promise<any> {
    return this.executeWithMetrics('sendBatchMessages', 'batch', async () => {
      const payloads = messages.map(msg => ({
        channel_id: msg.channelId,
        channel_type: msg.channelType,
        from_uid: msg.fromUid,
        payload: msg.payload,
        client_msg_no: msg.clientMsgNo,
      }));
      return this.wukongIMClient.sendBatchMessages(payloads);
    });
  }

  async syncMessages(
    uid: string,
    channelId: string,
    channelType: WukongIMChannelType,
    lastMessageSeq?: number,
    limit: number = 100,
  ): Promise<any> {
    return this.executeWithMetrics('syncMessages', channelId, async () => {
      return this.wukongIMClient.getMessages({
        channelId,
        channelType,
        startMessageSeq: lastMessageSeq,
        limit,
      });
    });
  }

  // ==================== Channel APIs ====================

  async createChannel(options: CreateChannelOptions): Promise<any> {
    return this.executeWithMetrics('createChannel', options.channelId, async () => {
      return this.wukongIMClient.createChannel({
        channel_id: options.channelId,
        channel_type: options.channelType,
        name: options.name,
        avatar: options.avatar,
      });
    });
  }

  async deleteChannel(channelId: string, channelType: WukongIMChannelType): Promise<any> {
    return this.executeWithMetrics('deleteChannel', channelId, async () => {
      return this.wukongIMClient.deleteChannel(channelId, channelType);
    });
  }

  async getChannelInfo(channelId: string, channelType: WukongIMChannelType): Promise<any> {
    return this.executeWithMetrics('getChannelInfo', channelId, async () => {
      return this.wukongIMClient.getChannelInfo(channelId, channelType);
    });
  }

  // ==================== Subscriber APIs ====================

  async addSubscribers(
    channelId: string,
    channelType: WukongIMChannelType,
    subscribers: string[],
  ): Promise<any> {
    return this.executeWithMetrics('addSubscribers', channelId, async () => {
      return this.wukongIMClient.addSubscribers({
        channel_id: channelId,
        channel_type: channelType,
        subscribers: subscribers.map(uid => ({ uid })),
      });
    }, subscribers.join(','));
  }

  async removeSubscribers(
    channelId: string,
    channelType: WukongIMChannelType,
    subscribers: string[],
  ): Promise<any> {
    return this.executeWithMetrics('removeSubscribers', channelId, async () => {
      return this.wukongIMClient.removeSubscribers(channelId, channelType, subscribers);
    }, subscribers.join(','));
  }

  async getSubscribers(channelId: string, channelType: WukongIMChannelType): Promise<any> {
    return this.executeWithMetrics('getSubscribers', channelId, async () => {
      return this.wukongIMClient.getSubscribers(channelId, channelType);
    });
  }

  // ==================== User APIs ====================

  async createOrUpdateUser(options: CreateUserOptions): Promise<any> {
    return this.executeWithMetrics('createOrUpdateUser', options.uid, async () => {
      return this.wukongIMClient.createUser({
        uid: options.uid,
        name: options.name,
        avatar: options.avatar,
        token: options.token,
      });
    });
  }

  async getUserToken(uid: string): Promise<string> {
    return this.executeWithMetrics('getUserToken', uid, async () => {
      const result = await this.wukongIMClient.getUserToken(uid);
      return result.token;
    });
  }

  async getUserInfo(uid: string): Promise<any> {
    return this.executeWithMetrics('getUserInfo', uid, async () => {
      return this.wukongIMClient.getUserInfo(uid);
    });
  }

  // ==================== Blacklist/Whitelist APIs ====================

  async addToBlacklist(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.executeWithMetrics('addToBlacklist', channelId, async () => {
      return this.wukongIMClient.addToBlacklist(channelId, channelType, uids);
    }, uids.join(','));
  }

  async removeFromBlacklist(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.executeWithMetrics('removeFromBlacklist', channelId, async () => {
      return this.wukongIMClient.removeFromBlacklist(channelId, channelType, uids);
    }, uids.join(','));
  }

  async addToWhitelist(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.executeWithMetrics('addToWhitelist', channelId, async () => {
      return this.wukongIMClient.addToWhitelist(channelId, channelType, uids);
    }, uids.join(','));
  }

  async removeFromWhitelist(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.executeWithMetrics('removeFromWhitelist', channelId, async () => {
      return this.wukongIMClient.removeFromWhitelist(channelId, channelType, uids);
    }, uids.join(','));
  }

  async getBlacklist(channelId: string, channelType: WukongIMChannelType): Promise<string[]> {
    try {
      const result = await this.wukongIMClient.get('/channel/blacklist', {
        channel_id: channelId,
        channel_type: channelType,
      });
      return result?.uids || [];
    } catch (error) {
      this.logger.error('Failed to get blacklist', error);
      return [];
    }
  }

  async getWhitelist(channelId: string, channelType: WukongIMChannelType): Promise<string[]> {
    try {
      const result = await this.wukongIMClient.get('/channel/whitelist', {
        channel_id: channelId,
        channel_type: channelType,
      });
      return result?.uids || [];
    } catch (error) {
      this.logger.error('Failed to get whitelist', error);
      return [];
    }
  }

  async setBlacklistMode(channelId: string, channelType: WukongIMChannelType, mode: 0 | 1 | 2): Promise<any> {
    return this.executeWithMetrics('setBlacklistMode', channelId, async () => {
      return this.wukongIMClient.post('/channel/blacklist/mode', {
        channel_id: channelId,
        channel_type: channelType,
        mode,
      });
    });
  }

  // ==================== Utility Methods ====================

  generatePersonalChannelId(userId1: string, userId2: string): string {
    return WukongIMUtils.generatePersonalChannelId(userId1, userId2);
  }

  encodePayload(content: any): string {
    return WukongIMUtils.encodePayload(content);
  }

  decodePayload(payload: string): any {
    return WukongIMUtils.decodePayload(payload);
  }

  // ==================== System APIs ====================

  async healthCheck(): Promise<boolean> {
    return this.wukongIMClient.healthCheck();
  }

  async getSystemInfo(): Promise<any> {
    return this.wukongIMClient.getSystemInfo();
  }

  // ==================== Private Methods ====================

  private async executeWithMetrics<T>(
    operation: string,
    resourceId: string,
    fn: () => Promise<T>,
    extraId?: string,
  ): Promise<T> {
    const timerKey = `wukongim:${operation}:${Date.now()}`;
    this.metricsService.startTimer(timerKey);
    let success = false;

    try {
      this.logger.debug(`Starting ${operation}: ${resourceId}`);
      const result = await fn();
      success = true;
      this.logger.log(`${operation} completed: ${resourceId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`${operation} failed: ${resourceId}`, error.message);
      throw error;
    } finally {
      this.metricsService.endTimer(timerKey, `wukongim.${operation}.duration`, {
        resource_id: resourceId,
        extra_id: extraId || '',
        success: success.toString(),
      });

      this.metricsService.recordMetric('wukongim.operation.count', 1, {
        operation,
        success: success.toString(),
      });

      if (!success) {
        this.metricsService.recordMetric('wukongim.operation.error', 1, { operation });
      }
    }
  }
}
