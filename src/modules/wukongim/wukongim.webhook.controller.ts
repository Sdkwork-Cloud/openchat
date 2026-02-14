/**
 * 悟空IM Webhook 控制器
 * 接收悟空IM的消息回执和事件通知
 * 文档: https://githubim.com/server/advance/webhook.html
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Message } from '../message/message.entity';
import { MessageStatus } from '../message/message.interface';
import { WukongIMWebhookEvent } from './wukongim.constants';

/**
 * Webhook 请求体
 */
interface WebhookPayload {
  event: string;        // 事件类型
  data: any;            // 事件数据
  timestamp: number;    // 时间戳
  sign?: string;        // 签名（可选）
}

/**
 * 消息送达回执数据
 */
interface MessageAckData {
  message_id: string;
  channel_id: string;
  channel_type: number;
  from_uid: string;
  to_uid: string;
  timestamp: number;
}

/**
 * 消息已读回执数据
 */
interface MessageReadData {
  message_ids: string[];
  channel_id: string;
  channel_type: number;
  uid: string;          // 阅读者
  timestamp: number;
}

/**
 * 用户连接事件数据
 */
interface UserConnectData {
  uid: string;
  device_flag: number;
  online: boolean;
  timestamp: number;
}

@ApiTags('wukongim-webhook')
@Controller('webhook/wukongim')
export class WukongIMWebhookController {
  private readonly logger = new Logger(WukongIMWebhookController.name);
  private readonly webhookSecret: string;
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {
    this.webhookSecret = this.configService.get<string>('im.wukongim.webhookSecret') || '';
    this.enabled = this.configService.get<boolean>('im.wukongim.webhookEnabled') !== false;
  }

  /**
   * 接收悟空IM Webhook
   * 悟空IM会在以下场景调用：
   * 1. 消息送达时
   * 2. 消息已读时
   * 3. 用户连接/断开时
   * 4. 其他自定义事件
   */
  @Post()
  @ApiOperation({
    summary: '接收悟空IM Webhook',
    description: '接收消息回执、已读通知等事件',
  })
  async receiveWebhook(
    @Body() payload: WebhookPayload,
    @Headers('x-wukongim-signature') signature?: string,
  ): Promise<{ success: boolean }> {
    if (!this.enabled) {
      this.logger.warn('Webhook is disabled');
      throw new BadRequestException('Webhook is disabled');
    }

    // 验证签名（如果配置了密钥）
    if (this.webhookSecret && signature) {
      this.validateSignature(payload, signature);
    }

    this.logger.debug(`收到Webhook: ${payload.event}`);

    try {
      switch (payload.event) {
        case WukongIMWebhookEvent.MESSAGE_ACK:
          await this.handleMessageAck(payload.data as MessageAckData);
          break;

        case WukongIMWebhookEvent.MESSAGE_READ:
          await this.handleMessageRead(payload.data as MessageReadData);
          break;

        case WukongIMWebhookEvent.CONNECT:
          await this.handleUserConnect(payload.data as UserConnectData);
          break;

        case WukongIMWebhookEvent.DISCONNECT:
          await this.handleUserDisconnect(payload.data as UserConnectData);
          break;

        case WukongIMWebhookEvent.USER_ONLINE:
          this.handleUserOnline(payload.data);
          break;

        case WukongIMWebhookEvent.USER_OFFLINE:
          this.handleUserOffline(payload.data);
          break;

        default:
          this.logger.warn(`未知的事件类型: ${payload.event}`);
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(`处理Webhook失败: ${error.message}`, error.stack);
      // 返回成功避免悟空IM重试（如果业务不需要重试）
      return { success: true };
    }
  }

  /**
   * 处理消息送达回执
   */
  private async handleMessageAck(data: MessageAckData): Promise<void> {
    this.logger.debug(`消息送达: ${data.message_id}`);

    // 更新消息状态为已送达
    await this.messageRepository.update(
      { id: data.message_id },
      {
        status: MessageStatus.DELIVERED,
      },
    );

    // 可以触发其他业务逻辑
    // 例如：发送推送通知给发送者
  }

  /**
   * 处理消息已读回执
   */
  private async handleMessageRead(data: MessageReadData): Promise<void> {
    this.logger.debug(`消息已读: ${data.message_ids.join(',')}, 阅读者: ${data.uid}`);

    if (data.message_ids.length > 0) {
      await this.messageRepository.update(
        { id: In(data.message_ids) },
        { status: MessageStatus.READ },
      );
    }

    // 更新会话的未读数
    // 这里可以调用 ConversationService 更新未读数
  }

  /**
   * 处理用户连接事件
   */
  private async handleUserConnect(data: UserConnectData): Promise<void> {
    this.logger.log(`用户连接: ${data.uid}, 设备: ${data.device_flag}`);

    // 可以更新用户在线状态到Redis
    // 可以发送离线消息给用户
  }

  /**
   * 处理用户断开连接事件
   */
  private async handleUserDisconnect(data: UserConnectData): Promise<void> {
    this.logger.log(`用户断开: ${data.uid}, 设备: ${data.device_flag}`);

    // 更新用户离线状态
  }

  /**
   * 处理用户上线
   */
  private handleUserOnline(data: any): void {
    this.logger.log(`用户上线: ${data.uid}`);
  }

  /**
   * 处理用户离线
   */
  private handleUserOffline(data: any): void {
    this.logger.log(`用户离线: ${data.uid}`);
  }

  /**
   * 验证 Webhook 签名
   * 防止伪造请求
   */
  private validateSignature(payload: WebhookPayload, signature: string): void {
    // 简单的签名验证实现
    // 实际项目中应该使用 HMAC-SHA256 等算法
    const crypto = require('crypto');
    const expectedSign = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSign) {
      this.logger.error('Webhook签名验证失败');
      throw new UnauthorizedException('Invalid signature');
    }
  }
}
