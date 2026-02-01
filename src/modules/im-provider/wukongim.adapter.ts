import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MetricsService } from '../../common/metrics/metrics.service';

/**
 * 悟空IM频道类型
 */
export enum WukongIMChannelType {
  PERSON = 1,  // 个人频道（单聊）
  GROUP = 2,   // 群组频道（群聊）
}

/**
 * 悟空IM消息格式
 */
export interface WukongIMMessage {
  channel_id: string;
  channel_type: WukongIMChannelType;
  from_uid: string;
  payload: string;  // Base64编码的消息内容
  client_msg_no?: string;
}

/**
 * 悟空IM用户格式
 */
export interface WukongIMUser {
  uid: string;
  name?: string;
  avatar?: string;
  token?: string;
}

/**
 * 悟空IM频道格式
 */
export interface WukongIMChannel {
  channel_id: string;
  channel_type: WukongIMChannelType;
  name?: string;
  avatar?: string;
}

/**
 * 悟空IM适配器服务
 * 专门用于与悟空IM进行通信，确保数据格式符合悟空IM规范
 */
@Injectable()
export class WukongIMAdapter {
  private readonly logger = new Logger(WukongIMAdapter.name);
  private baseUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private metricsService: MetricsService,
  ) {
    this.baseUrl = this.configService.get<string>('WUKONGIM_API_URL') || 'http://localhost:5001';
  }

  /**
   * 发送消息到悟空IM
   * @param message 消息内容
   */
  async sendMessage(message: WukongIMMessage): Promise<any> {
    const timerKey = `wukongim:sendMessage:${Date.now()}`;
    this.metricsService.startTimer(timerKey);
    let success = false;

    try {
      this.logger.log(`Sending message to WukongIM: ${message.channel_id}, type: ${message.channel_type}, from: ${message.from_uid}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/message/send`, message)
      );
      
      success = true;
      this.logger.log(`Message sent to WukongIM successfully, channel: ${message.channel_id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send message to WukongIM, channel: ${message.channel_id}, error: ${error.message}`, error);
      throw error;
    } finally {
      const duration = this.metricsService.endTimer(timerKey, 'wukongim.sendMessage.duration', {
        channel_id: message.channel_id,
        channel_type: message.channel_type.toString(),
        success: success.toString(),
      });
      
      // 记录消息发送指标
      this.metricsService.recordMetric('wukongim.sendMessage.count', 1, {
        channel_type: message.channel_type.toString(),
        success: success.toString(),
      });
      
      if (!success) {
        this.metricsService.recordMetric('wukongim.sendMessage.error', 1, {
          channel_type: message.channel_type.toString(),
        });
      }
    }
  }

  /**
   * 创建或更新用户
   * @param user 用户信息
   */
  async createOrUpdateUser(user: WukongIMUser): Promise<any> {
    const timerKey = `wukongim:createOrUpdateUser:${Date.now()}`;
    this.metricsService.startTimer(timerKey);
    let success = false;

    try {
      this.logger.log(`Creating/Updating user in WukongIM: ${user.uid}, name: ${user.name}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/user/create`, user)
      );
      
      success = true;
      this.logger.log(`User created/updated in WukongIM successfully: ${user.uid}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create/update user in WukongIM: ${user.uid}, error: ${error.message}`, error);
      throw error;
    } finally {
      const duration = this.metricsService.endTimer(timerKey, 'wukongim.createOrUpdateUser.duration', {
        user_id: user.uid,
        success: success.toString(),
      });
      
      // 记录用户操作指标
      this.metricsService.recordMetric('wukongim.user.operation.count', 1, {
        operation: 'createOrUpdate',
        success: success.toString(),
      });
      
      if (!success) {
        this.metricsService.recordMetric('wukongim.user.operation.error', 1, {
          operation: 'createOrUpdate',
        });
      }
    }
  }

  /**
   * 创建或更新频道（群组）
   * @param channel 频道信息
   */
  async createOrUpdateChannel(channel: WukongIMChannel): Promise<any> {
    const timerKey = `wukongim:createOrUpdateChannel:${Date.now()}`;
    this.metricsService.startTimer(timerKey);
    let success = false;

    try {
      this.logger.log(`Creating/Updating channel in WukongIM: ${channel.channel_id}, type: ${channel.channel_type}, name: ${channel.name}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/create`, channel)
      );
      
      success = true;
      this.logger.log(`Channel created/updated in WukongIM successfully: ${channel.channel_id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create/update channel in WukongIM: ${channel.channel_id}, error: ${error.message}`, error);
      throw error;
    } finally {
      const duration = this.metricsService.endTimer(timerKey, 'wukongim.createOrUpdateChannel.duration', {
        channel_id: channel.channel_id,
        channel_type: channel.channel_type.toString(),
        success: success.toString(),
      });
      
      // 记录频道操作指标
      this.metricsService.recordMetric('wukongim.channel.operation.count', 1, {
        operation: 'createOrUpdate',
        channel_type: channel.channel_type.toString(),
        success: success.toString(),
      });
      
      if (!success) {
        this.metricsService.recordMetric('wukongim.channel.operation.error', 1, {
          operation: 'createOrUpdate',
          channel_type: channel.channel_type.toString(),
        });
      }
    }
  }

  /**
   * 添加用户到频道
   * @param channelId 频道ID
   * @param channelType 频道类型
   * @param uid 用户ID
   */
  async addUserToChannel(channelId: string, channelType: WukongIMChannelType, uid: string): Promise<any> {
    const timerKey = `wukongim:addUserToChannel:${Date.now()}`;
    this.metricsService.startTimer(timerKey);
    let success = false;

    try {
      this.logger.log(`Adding user ${uid} to channel ${channelId}, type: ${channelType}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/subscriber/add`, {
          channel_id: channelId,
          channel_type: channelType,
          uid: uid,
        })
      );
      
      success = true;
      this.logger.log(`User ${uid} added to channel ${channelId} successfully`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to add user ${uid} to channel ${channelId}, error: ${error.message}`, error);
      throw error;
    } finally {
      const duration = this.metricsService.endTimer(timerKey, 'wukongim.addUserToChannel.duration', {
        channel_id: channelId,
        channel_type: channelType.toString(),
        user_id: uid,
        success: success.toString(),
      });
      
      // 记录频道操作指标
      this.metricsService.recordMetric('wukongim.channel.operation.count', 1, {
        operation: 'addUser',
        channel_type: channelType.toString(),
        success: success.toString(),
      });
      
      if (!success) {
        this.metricsService.recordMetric('wukongim.channel.operation.error', 1, {
          operation: 'addUser',
          channel_type: channelType.toString(),
        });
      }
    }
  }

  /**
   * 从频道移除用户
   * @param channelId 频道ID
   * @param channelType 频道类型
   * @param uid 用户ID
   */
  async removeUserFromChannel(channelId: string, channelType: WukongIMChannelType, uid: string): Promise<any> {
    const timerKey = `wukongim:removeUserFromChannel:${Date.now()}`;
    this.metricsService.startTimer(timerKey);
    let success = false;

    try {
      this.logger.log(`Removing user ${uid} from channel ${channelId}, type: ${channelType}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/subscriber/remove`, {
          channel_id: channelId,
          channel_type: channelType,
          uid: uid,
        })
      );
      
      success = true;
      this.logger.log(`User ${uid} removed from channel ${channelId} successfully`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to remove user ${uid} from channel ${channelId}, error: ${error.message}`, error);
      throw error;
    } finally {
      const duration = this.metricsService.endTimer(timerKey, 'wukongim.removeUserFromChannel.duration', {
        channel_id: channelId,
        channel_type: channelType.toString(),
        user_id: uid,
        success: success.toString(),
      });
      
      // 记录频道操作指标
      this.metricsService.recordMetric('wukongim.channel.operation.count', 1, {
        operation: 'removeUser',
        channel_type: channelType.toString(),
        success: success.toString(),
      });
      
      if (!success) {
        this.metricsService.recordMetric('wukongim.channel.operation.error', 1, {
          operation: 'removeUser',
          channel_type: channelType.toString(),
        });
      }
    }
  }

  /**
   * 删除频道
   * @param channelId 频道ID
   * @param channelType 频道类型
   */
  async deleteChannel(channelId: string, channelType: WukongIMChannelType): Promise<any> {
    const timerKey = `wukongim:deleteChannel:${Date.now()}`;
    this.metricsService.startTimer(timerKey);
    let success = false;

    try {
      this.logger.log(`Deleting channel in WukongIM: ${channelId}, type: ${channelType}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/delete`, {
          channel_id: channelId,
          channel_type: channelType,
        })
      );
      
      success = true;
      this.logger.log(`Channel ${channelId} deleted in WukongIM successfully`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to delete channel ${channelId} in WukongIM, error: ${error.message}`, error);
      throw error;
    } finally {
      const duration = this.metricsService.endTimer(timerKey, 'wukongim.deleteChannel.duration', {
        channel_id: channelId,
        channel_type: channelType.toString(),
        success: success.toString(),
      });
      
      // 记录频道操作指标
      this.metricsService.recordMetric('wukongim.channel.operation.count', 1, {
        operation: 'delete',
        channel_type: channelType.toString(),
        success: success.toString(),
      });
      
      if (!success) {
        this.metricsService.recordMetric('wukongim.channel.operation.error', 1, {
          operation: 'delete',
          channel_type: channelType.toString(),
        });
      }
    }
  }

  /**
   * 更新用户在线状态
   * @param uid 用户ID
   * @param online 是否在线
   */
  async updateUserOnlineStatus(uid: string, online: boolean): Promise<any> {
    try {
      this.logger.log(`Updating user ${uid} online status: ${online}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/user/onlinestatus`, {
          uid: uid,
          online: online,
        })
      );
      
      this.logger.log(`User online status updated successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update user online status`, error);
      throw error;
    }
  }

  /**
   * 获取频道消息历史
   * @param channelId 频道ID
   * @param channelType 频道类型
   * @param limit 数量限制
   */
  async getChannelMessages(channelId: string, channelType: WukongIMChannelType, limit: number = 20): Promise<any> {
    try {
      this.logger.log(`Getting messages for channel ${channelId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/message/sync`, {
          params: {
            channel_id: channelId,
            channel_type: channelType,
            limit: limit,
          },
        })
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get channel messages`, error);
      throw error;
    }
  }

  /**
   * 将我们的消息格式转换为悟空IM格式
   * @param messageId 消息ID
   * @param fromUserId 发送者ID
   * @param toUserId 接收者ID（单聊）
   * @param groupId 群组ID（群聊）
   * @param content 消息内容
   * @param type 消息类型
   */
  convertToWukongIMMessage(
    messageId: string,
    fromUserId: string,
    toUserId: string | null,
    groupId: string | null,
    content: string,
    type: string,
  ): WukongIMMessage {
    const isGroup = !!groupId;
    const channelId = isGroup ? groupId! : this.generatePersonalChannelId(fromUserId, toUserId!);
    const channelType = isGroup ? WukongIMChannelType.GROUP : WukongIMChannelType.PERSON;
    
    // 构建消息payload
    const payload = JSON.stringify({
      type: type,
      content: content,
      message_id: messageId,
    });
    
    return {
      channel_id: channelId,
      channel_type: channelType,
      from_uid: fromUserId,
      payload: Buffer.from(payload).toString('base64'),
      client_msg_no: messageId,
    };
  }

  /**
   * 生成个人频道ID（单聊）
   * 悟空IM要求单聊频道ID需要按用户ID排序后生成
   * @param userId1 用户1ID
   * @param userId2 用户2ID
   */
  private generatePersonalChannelId(userId1: string, userId2: string): string {
    // 按字典序排序，确保两个用户生成的频道ID一致
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  // ==================== Channel黑白名单管理 ====================

  /**
   * 添加用户到频道黑名单
   * @param channelId 频道ID
   * @param channelType 频道类型
   * @param uid 用户ID
   */
  async addUserToChannelBlacklist(channelId: string, channelType: WukongIMChannelType, uid: string): Promise<any> {
    try {
      this.logger.log(`Adding user ${uid} to channel ${channelId} blacklist`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/blacklist/add`, {
          channel_id: channelId,
          channel_type: channelType,
          uid: uid,
        })
      );
      
      this.logger.log(`User added to channel blacklist successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to add user to channel blacklist`, error);
      throw error;
    }
  }

  /**
   * 从频道黑名单移除用户
   * @param channelId 频道ID
   * @param channelType 频道类型
   * @param uid 用户ID
   */
  async removeUserFromChannelBlacklist(channelId: string, channelType: WukongIMChannelType, uid: string): Promise<any> {
    try {
      this.logger.log(`Removing user ${uid} from channel ${channelId} blacklist`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/blacklist/remove`, {
          channel_id: channelId,
          channel_type: channelType,
          uid: uid,
        })
      );
      
      this.logger.log(`User removed from channel blacklist successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to remove user from channel blacklist`, error);
      throw error;
    }
  }

  /**
   * 获取频道黑名单列表
   * @param channelId 频道ID
   * @param channelType 频道类型
   */
  async getChannelBlacklist(channelId: string, channelType: WukongIMChannelType): Promise<string[]> {
    try {
      this.logger.log(`Getting blacklist for channel ${channelId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/channel/blacklist`, {
          params: {
            channel_id: channelId,
            channel_type: channelType,
          },
        })
      );
      
      return response.data?.uids || [];
    } catch (error) {
      this.logger.error(`Failed to get channel blacklist`, error);
      return [];
    }
  }

  /**
   * 添加用户到频道白名单
   * @param channelId 频道ID
   * @param channelType 频道类型
   * @param uid 用户ID
   */
  async addUserToChannelWhitelist(channelId: string, channelType: WukongIMChannelType, uid: string): Promise<any> {
    try {
      this.logger.log(`Adding user ${uid} to channel ${channelId} whitelist`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/whitelist/add`, {
          channel_id: channelId,
          channel_type: channelType,
          uid: uid,
        })
      );
      
      this.logger.log(`User added to channel whitelist successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to add user to channel whitelist`, error);
      throw error;
    }
  }

  /**
   * 从频道白名单移除用户
   * @param channelId 频道ID
   * @param channelType 频道类型
   * @param uid 用户ID
   */
  async removeUserFromChannelWhitelist(channelId: string, channelType: WukongIMChannelType, uid: string): Promise<any> {
    try {
      this.logger.log(`Removing user ${uid} from channel ${channelId} whitelist`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/whitelist/remove`, {
          channel_id: channelId,
          channel_type: channelType,
          uid: uid,
        })
      );
      
      this.logger.log(`User removed from channel whitelist successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to remove user from channel whitelist`, error);
      throw error;
    }
  }

  /**
   * 获取频道白名单列表
   * @param channelId 频道ID
   * @param channelType 频道类型
   */
  async getChannelWhitelist(channelId: string, channelType: WukongIMChannelType): Promise<string[]> {
    try {
      this.logger.log(`Getting whitelist for channel ${channelId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/channel/whitelist`, {
          params: {
            channel_id: channelId,
            channel_type: channelType,
          },
        })
      );
      
      return response.data?.uids || [];
    } catch (error) {
      this.logger.error(`Failed to get channel whitelist`, error);
      return [];
    }
  }

  /**
   * 设置频道黑白名单模式
   * @param channelId 频道ID
   * @param channelType 频道类型
   * @param mode 模式：0=关闭，1=黑名单，2=白名单
   */
  async setChannelBlacklistMode(channelId: string, channelType: WukongIMChannelType, mode: 0 | 1 | 2): Promise<any> {
    try {
      this.logger.log(`Setting channel ${channelId} blacklist mode to ${mode}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/channel/blacklist/mode`, {
          channel_id: channelId,
          channel_type: channelType,
          mode: mode,
        })
      );
      
      this.logger.log(`Channel blacklist mode set successfully`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to set channel blacklist mode`, error);
      throw error;
    }
  }
}
