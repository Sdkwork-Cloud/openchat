import { Injectable, NotFoundException } from '@nestjs/common';
import { ThirdPartyManager } from './third-party.interface';
import { ThirdPartyMessage } from './third-party-message.entity';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { TelegramAdapter } from './telegram.adapter';

@Injectable()
export class ThirdPartyService implements ThirdPartyManager {
  private adapters = new Map<
    'whatsapp' | 'telegram' | 'wechat' | 'signal',
    WhatsAppAdapter | TelegramAdapter
  >();

  constructor(
    private whatsappAdapter: WhatsAppAdapter,
    private telegramAdapter: TelegramAdapter,
  ) {
    this.adapters.set('whatsapp', whatsappAdapter);
    this.adapters.set('telegram', telegramAdapter);
    // 未来可以添加其他平台的适配器
    // this.adapters.set('wechat', wechatAdapter);
    // this.adapters.set('signal', signalAdapter);
  }

  async sendMessage(
    platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal',
    messageData: Omit<ThirdPartyMessage, 'id' | 'platform' | 'createdAt' | 'updatedAt'>
  ): Promise<ThirdPartyMessage> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new NotFoundException(`Platform ${platform} not supported`);
    }

    return adapter.sendMessage({
      ...messageData,
      platform,
    });
  }

  async getMessageStatus(
    platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal',
    messageId: string
  ): Promise<string> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new NotFoundException(`Platform ${platform} not supported`);
    }

    return adapter.getMessageStatus(messageId);
  }

  async syncContacts(
    platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal',
    userId: string
  ): Promise<any[]> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new NotFoundException(`Platform ${platform} not supported`);
    }

    return adapter.syncContacts(userId);
  }

  async getContact(
    platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal',
    userId: string,
    platformUserId: string
  ): Promise<any | null> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new NotFoundException(`Platform ${platform} not supported`);
    }

    return adapter.getContact(userId, platformUserId);
  }
}