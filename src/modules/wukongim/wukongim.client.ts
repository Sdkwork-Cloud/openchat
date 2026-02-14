import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  WUKONGIM_ENDPOINTS,
  WUKONGIM_DEFAULTS,
  WukongIMChannelType,
} from './wukongim.constants';
import { WukongIMUtils } from './wukongim.utils';

export interface WukongIMConfig {
  apiUrl: string;
  tcpAddr: string;
  wsUrl: string;
  managerUrl: string;
  timeout: number;
}

export interface SendMessagePayload {
  channel_id: string;
  channel_type: WukongIMChannelType;
  from_uid: string;
  payload: string;
  client_msg_no?: string;
}

export interface CreateUserPayload {
  uid: string;
  name?: string;
  avatar?: string;
  token?: string;
}

export interface CreateChannelPayload {
  channel_id: string;
  channel_type: WukongIMChannelType;
  name?: string;
  avatar?: string;
  large?: boolean;
  ban?: boolean;
}

export interface AddSubscriberPayload {
  channel_id: string;
  channel_type: WukongIMChannelType;
  subscribers: Array<{
    uid: string;
    avatar?: string;
    nickname?: string;
  }>;
}

export interface GetMessagesOptions {
  channelId: string;
  channelType: WukongIMChannelType;
  startMessageSeq?: number;
  endMessageSeq?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}

@Injectable()
export class WukongIMClient implements OnModuleInit {
  private readonly logger = new Logger(WukongIMClient.name);
  private axiosInstance!: AxiosInstance;
  private config!: WukongIMConfig;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.config = {
      apiUrl: this.configService.get<string>('WUKONGIM_API_URL') ||
              this.configService.get<string>('im.wukongim.apiUrl') ||
              WUKONGIM_DEFAULTS.API_URL,
      tcpAddr: this.configService.get<string>('WUKONGIM_TCP_ADDR') ||
               this.configService.get<string>('im.wukongim.tcpAddr') ||
               WUKONGIM_DEFAULTS.TCP_ADDR,
      wsUrl: this.configService.get<string>('WUKONGIM_WS_URL') ||
             this.configService.get<string>('im.wukongim.wsUrl') ||
             WUKONGIM_DEFAULTS.WS_URL,
      managerUrl: this.configService.get<string>('WUKONGIM_MANAGER_URL') ||
                  this.configService.get<string>('im.wukongim.managerUrl') ||
                  WUKONGIM_DEFAULTS.MANAGER_URL,
      timeout: this.configService.get<number>('WUKONGIM_TIMEOUT') ||
               WUKONGIM_DEFAULTS.TIMEOUT,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      maxRedirects: 5,
      maxContentLength: 5 * 1024 * 1024,
    });

    this.logger.log(`WukongIM Client initialized with API URL: ${this.config.apiUrl}`);
  }

  getConfig(): WukongIMConfig {
    return this.config;
  }

  async post<T = any>(endpoint: string, data: any, options?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(endpoint, data, options);
      return response.data;
    } catch (error: any) {
      this.logger.error(`POST ${endpoint} failed: ${WukongIMUtils.formatErrorResponse(error)}`);
      throw error;
    }
  }

  async get<T = any>(endpoint: string, params?: any, options?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(endpoint, { params, ...options });
      return response.data;
    } catch (error: any) {
      this.logger.error(`GET ${endpoint} failed: ${WukongIMUtils.formatErrorResponse(error)}`);
      throw error;
    }
  }

  // ==================== Message APIs ====================

  async sendMessage(payload: SendMessagePayload): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.MESSAGE_SEND, payload);
  }

  async sendBatchMessages(payloads: SendMessagePayload[]): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.MESSAGE_SEND_BATCH, payloads);
  }

  async getMessages(options: GetMessagesOptions): Promise<any> {
    return this.get(WUKONGIM_ENDPOINTS.MESSAGE_SYNC, {
      channel_id: options.channelId,
      channel_type: options.channelType,
      start_message_seq: options.startMessageSeq,
      end_message_seq: options.endMessageSeq,
      limit: options.limit || 20,
      order: options.order || 'desc',
    });
  }

  // ==================== User APIs ====================

  async createUser(payload: CreateUserPayload): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.USER_CREATE, payload);
  }

  async updateUser(payload: CreateUserPayload): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.USER_UPDATE, payload);
  }

  async getUserInfo(uid: string): Promise<any> {
    return this.get(WUKONGIM_ENDPOINTS.USER_INFO, { uid });
  }

  async getUserToken(uid: string): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.USER_TOKEN, { uid });
  }

  async updateUserOnlineStatus(uid: string, online: boolean): Promise<any> {
    return this.post('/user/onlinestatus', { uid, online });
  }

  // ==================== Channel APIs ====================

  async createChannel(payload: CreateChannelPayload): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.CHANNEL_CREATE, payload);
  }

  async deleteChannel(channelId: string, channelType: WukongIMChannelType): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.CHANNEL_DELETE, {
      channel_id: channelId,
      channel_type: channelType,
    });
  }

  async getChannelInfo(channelId: string, channelType: WukongIMChannelType): Promise<any> {
    return this.get(WUKONGIM_ENDPOINTS.CHANNEL_INFO, {
      channel_id: channelId,
      channel_type: channelType,
    });
  }

  // ==================== Subscriber APIs ====================

  async addSubscribers(payload: AddSubscriberPayload): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.SUBSCRIBER_ADD, payload);
  }

  async removeSubscribers(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.SUBSCRIBER_REMOVE, {
      channel_id: channelId,
      channel_type: channelType,
      subscribers: uids,
    });
  }

  async getSubscribers(channelId: string, channelType: WukongIMChannelType): Promise<any> {
    return this.get(WUKONGIM_ENDPOINTS.SUBSCRIBER_LIST, {
      channel_id: channelId,
      channel_type: channelType,
    });
  }

  // ==================== Blacklist/Whitelist APIs ====================

  async addToBlacklist(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.BLACKLIST_ADD, {
      channel_id: channelId,
      channel_type: channelType,
      uids,
    });
  }

  async removeFromBlacklist(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.BLACKLIST_REMOVE, {
      channel_id: channelId,
      channel_type: channelType,
      uids,
    });
  }

  async addToWhitelist(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.WHITELIST_ADD, {
      channel_id: channelId,
      channel_type: channelType,
      uids,
    });
  }

  async removeFromWhitelist(channelId: string, channelType: WukongIMChannelType, uids: string[]): Promise<any> {
    return this.post(WUKONGIM_ENDPOINTS.WHITELIST_REMOVE, {
      channel_id: channelId,
      channel_type: channelType,
      uids,
    });
  }

  // ==================== System APIs ====================

  async healthCheck(): Promise<boolean> {
    try {
      await this.get(WUKONGIM_ENDPOINTS.HEALTH);
      return true;
    } catch {
      return false;
    }
  }

  async getSystemInfo(): Promise<any> {
    return this.get(WUKONGIM_ENDPOINTS.VARZ);
  }
}
