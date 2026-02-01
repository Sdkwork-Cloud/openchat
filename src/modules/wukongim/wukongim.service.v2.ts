/**
 * 悟空IM 服务模块 V2
 * 修复版 - 使用正确的API端点和消息格式
 * 文档: https://githubim.com
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  WUKONGIM_ENDPOINTS,
  WukongIMChannelType,
} from './wukongim.constants';

export interface SendMessageOptions {
  channelId: string;
  channelType: WukongIMChannelType;
  fromUid: string;
  payload: string; // Base64编码的消息内容
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

export interface WebhookPayload {
  event: string;
  data: any;
}

@Injectable()
export class WukongIMServiceV2 {
  private readonly logger = new Logger(WukongIMServiceV2.name);
  private readonly apiUrl: string;
  private readonly tcpAddr: string;
  private readonly wsUrl: string;
  private readonly managerUrl: string;
  private readonly tokenAuth: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('WUKONGIM_API_URL') ||
                  this.configService.get<string>('im.wukongim.apiUrl') ||
                  'http://localhost:5001';
    this.tcpAddr = this.configService.get<string>('WUKONGIM_TCP_ADDR') ||
                   this.configService.get<string>('im.wukongim.tcpAddr') ||
                   'localhost:5100';
    this.wsUrl = this.configService.get<string>('WUKONGIM_WS_URL') ||
                 this.configService.get<string>('im.wukongim.wsUrl') ||
                 'ws://localhost:5200';
    this.managerUrl = this.configService.get<string>('WUKONGIM_MANAGER_URL') ||
                      this.configService.get<string>('im.wukongim.managerUrl') ||
                      'http://localhost:5300';
    this.tokenAuth = this.configService.get<boolean>('im.wukongim.tokenAuth') || false;

    this.logger.log('悟空IM V2服务初始化完成');
    this.logger.log(`API地址: ${this.apiUrl}`);
    this.logger.log(`TCP地址: ${this.tcpAddr}`);
    this.logger.log(`WebSocket地址: ${this.wsUrl}`);
  }

  /**
   * 获取悟空IM连接配置（给客户端使用）
   */
  getConnectionConfig(uid: string) {
    return {
      tcpAddr: this.tcpAddr,
      wsUrl: this.wsUrl,
      apiUrl: this.apiUrl,
      managerUrl: this.managerUrl,
      tokenAuth: this.tokenAuth,
      uid,
    };
  }

  // ==================== 消息相关 ====================

  /**
   * 发送消息
   * POST /message/send
   */
  async sendMessage(options: SendMessageOptions): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.MESSAGE_SEND}`;
      const payload = {
        channel_id: options.channelId,
        channel_type: options.channelType,
        from_uid: options.fromUid,
        payload: options.payload,
        client_msg_no: options.clientMsgNo,
      };

      this.logger.debug(`发送消息: ${JSON.stringify(payload)}`);

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      );

      this.logger.log(`消息发送成功: ${response.data?.message_id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`发送消息失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量发送消息
   * POST /message/sendbatch
   */
  async sendBatchMessages(messages: SendMessageOptions[]): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.MESSAGE_SEND_BATCH}`;
      const payload = messages.map(msg => ({
        channel_id: msg.channelId,
        channel_type: msg.channelType,
        from_uid: msg.fromUid,
        payload: msg.payload,
        client_msg_no: msg.clientMsgNo,
      }));

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000, // 批量发送超时更长
        }),
      );

      this.logger.log(`批量消息发送成功，共 ${messages.length} 条`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`批量发送消息失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 同步消息
   * GET /message/sync
   */
  async syncMessages(
    uid: string,
    channelId?: string,
    channelType?: WukongIMChannelType,
    lastMessageSeq?: number,
    limit: number = 100,
  ): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.MESSAGE_SYNC}`;
      const params: any = {
        uid,
        limit,
      };

      if (channelId) params.channel_id = channelId;
      if (channelType) params.channel_type = channelType;
      if (lastMessageSeq) params.last_message_seq = lastMessageSeq;

      const response = await firstValueFrom(
        this.httpService.get(url, { params, timeout: 10000 }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`同步消息失败: ${error.message}`);
      throw error;
    }
  }

  // ==================== 频道相关 ====================

  /**
   * 创建频道
   * POST /channel/create
   */
  async createChannel(options: CreateChannelOptions): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.CHANNEL_CREATE}`;
      const payload = {
        channel_id: options.channelId,
        channel_type: options.channelType,
        name: options.name,
        avatar: options.avatar,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      );

      this.logger.log(`频道创建成功: ${options.channelId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`创建频道失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除频道
   * POST /channel/delete
   */
  async deleteChannel(
    channelId: string,
    channelType: WukongIMChannelType,
  ): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.CHANNEL_DELETE}`;
      const payload = {
        channel_id: channelId,
        channel_type: channelType,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      );

      this.logger.log(`频道删除成功: ${channelId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`删除频道失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 添加订阅者到频道
   * POST /channel/subscriber/add
   */
  async addSubscribers(
    channelId: string,
    channelType: WukongIMChannelType,
    subscribers: string[],
  ): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.SUBSCRIBER_ADD}`;
      const payload = {
        channel_id: channelId,
        channel_type: channelType,
        subscribers,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      );

      this.logger.log(`添加订阅者成功: ${channelId}, 用户: ${subscribers.join(',')}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`添加订阅者失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 从频道移除订阅者
   * POST /channel/subscriber/remove
   */
  async removeSubscribers(
    channelId: string,
    channelType: WukongIMChannelType,
    subscribers: string[],
  ): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.SUBSCRIBER_REMOVE}`;
      const payload = {
        channel_id: channelId,
        channel_type: channelType,
        subscribers,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      );

      this.logger.log(`移除订阅者成功: ${channelId}, 用户: ${subscribers.join(',')}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`移除订阅者失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== 用户相关 ====================

  /**
   * 创建或更新用户
   * POST /user/create
   */
  async createOrUpdateUser(options: CreateUserOptions): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.USER_CREATE}`;
      const payload = {
        uid: options.uid,
        name: options.name,
        avatar: options.avatar,
        token: options.token,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      );

      this.logger.log(`用户创建/更新成功: ${options.uid}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`创建/更新用户失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取用户Token
   * POST /user/token
   */
  async getUserToken(uid: string, expireSeconds: number = 86400): Promise<string> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.USER_TOKEN}`;
      const payload = {
        uid,
        expire: expireSeconds,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      );

      return response.data.token;
    } catch (error: any) {
      this.logger.error(`获取用户Token失败: ${error.message}`);
      throw error;
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 生成单聊频道ID
   * 按字典序排序确保双向一致
   */
  generatePersonalChannelId(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * 编码消息内容
   */
  encodePayload(content: any): string {
    return Buffer.from(JSON.stringify(content)).toString('base64');
  }

  /**
   * 解码消息内容
   */
  decodePayload(payload: string): any {
    try {
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch {
      return null;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.HEALTH}`;
      await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 }),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<any> {
    try {
      const url = `${this.apiUrl}${WUKONGIM_ENDPOINTS.VARZ}`;
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 10000 }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`获取系统信息失败: ${error.message}`);
      throw error;
    }
  }
}
