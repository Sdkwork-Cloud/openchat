/**
 * 悟空IM 服务模块
 * 封装对悟空IM REST API的调用
 * 文档: https://docs.githubim.com/zh/api/introduction
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SendMessageOptions {
  channelId: string;
  channelType: number; // 1: 个人频道, 2: 群组频道
  fromUid: string;
  payload: string; // Base64编码的消息内容
  clientMsgNo?: string;
}

export interface CreateChannelOptions {
  channelId: string;
  channelType: number;
  name?: string;
  avatar?: string;
}

export interface AddSubscriberOptions {
  channelId: string;
  channelType: number;
  subscribers: string[];
}

@Injectable()
export class WukongIMService {
  private readonly logger = new Logger(WukongIMService.name);
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
    
    this.logger.log(`悟空IM服务初始化完成`);
    this.logger.log(`API地址: ${this.apiUrl}`);
    this.logger.log(`TCP地址: ${this.tcpAddr}`);
    this.logger.log(`WebSocket地址: ${this.wsUrl}`);
  }

  /**
   * 获取悟空IM连接配置（给客户端使用）
   */
  getConnectionConfig() {
    return {
      tcpAddr: this.tcpAddr,
      wsUrl: this.wsUrl,
      apiUrl: this.apiUrl,
      managerUrl: this.managerUrl,
    };
  }

  /**
   * 发送消息
   * POST /message/send
   */
  async sendMessage(options: SendMessageOptions): Promise<any> {
    try {
      const url = `${this.apiUrl}/message/send`;
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
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`消息发送成功: ${response.data.message_id}`);
      return response.data;
    } catch (error) {
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
      const url = `${this.apiUrl}/message/sendbatch`;
      const payload = messages.map(msg => ({
        channel_id: msg.channelId,
        channel_type: msg.channelType,
        from_uid: msg.fromUid,
        payload: msg.payload,
        client_msg_no: msg.clientMsgNo,
      }));

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`批量消息发送成功，共 ${messages.length} 条`);
      return response.data;
    } catch (error) {
      this.logger.error(`批量发送消息失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建频道
   * POST /channel/create
   */
  async createChannel(options: CreateChannelOptions): Promise<any> {
    try {
      const url = `${this.apiUrl}/channel/create`;
      const payload = {
        channel_id: options.channelId,
        channel_type: options.channelType,
        name: options.name,
        avatar: options.avatar,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`频道创建成功: ${options.channelId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`创建频道失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除频道
   * POST /channel/delete
   */
  async deleteChannel(channelId: string, channelType: number): Promise<any> {
    try {
      const url = `${this.apiUrl}/channel/delete`;
      const payload = {
        channel_id: channelId,
        channel_type: channelType,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`频道删除成功: ${channelId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`删除频道失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 添加订阅者
   * POST /channel/subscriber/add
   */
  async addSubscribers(options: AddSubscriberOptions): Promise<any> {
    try {
      const url = `${this.apiUrl}/channel/subscriber/add`;
      const payload = {
        channel_id: options.channelId,
        channel_type: options.channelType,
        subscribers: options.subscribers,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`添加订阅者成功: ${options.channelId}, 共 ${options.subscribers.length} 人`);
      return response.data;
    } catch (error) {
      this.logger.error(`添加订阅者失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 移除订阅者
   * POST /channel/subscriber/remove
   */
  async removeSubscribers(options: AddSubscriberOptions): Promise<any> {
    try {
      const url = `${this.apiUrl}/channel/subscriber/remove`;
      const payload = {
        channel_id: options.channelId,
        channel_type: options.channelType,
        subscribers: options.subscribers,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`移除订阅者成功: ${options.channelId}, 共 ${options.subscribers.length} 人`);
      return response.data;
    } catch (error) {
      this.logger.error(`移除订阅者失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取频道信息
   * GET /channel/info
   */
  async getChannelInfo(channelId: string, channelType: number): Promise<any> {
    try {
      const url = `${this.apiUrl}/channel/info`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            channel_id: channelId,
            channel_type: channelType,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`获取频道信息失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取频道消息
   * GET /message/sync
   */
  async syncMessages(
    uid: string,
    channelId: string,
    channelType: number,
    lastMessageSeq?: number,
    limit: number = 20,
  ): Promise<any> {
    try {
      const url = `${this.apiUrl}/message/sync`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            uid,
            channel_id: channelId,
            channel_type: channelType,
            last_message_seq: lastMessageSeq,
            limit,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`同步消息失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 健康检查
   * GET /health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/health`;
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`悟空IM健康检查失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取系统信息
   * GET /varz
   */
  async getSystemInfo(): Promise<any> {
    try {
      const url = `${this.apiUrl}/varz`;
      const response = await firstValueFrom(
        this.httpService.get(url),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`获取系统信息失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
