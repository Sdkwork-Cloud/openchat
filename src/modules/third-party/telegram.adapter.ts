import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThirdPartyAdapter } from './third-party.interface';
import { ThirdPartyMessage } from './third-party-message.entity';
import { ThirdPartyContact } from './third-party-contact.entity';

@Injectable()
export class TelegramAdapter implements ThirdPartyAdapter {
  constructor(
    @InjectRepository(ThirdPartyMessage)
    private messageRepository: Repository<ThirdPartyMessage>,
    @InjectRepository(ThirdPartyContact)
    private contactRepository: Repository<ThirdPartyContact>,
  ) {}

  async sendMessage(messageData: Omit<ThirdPartyMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThirdPartyMessage> {
    // 这里应该实现与Telegram API的集成
    // 目前使用模拟实现
    console.log('Sending Telegram message:', messageData);
    
    const message = this.messageRepository.create({
      ...messageData,
      platformMessageId: `telegram_${Date.now()}`,
      status: 'sent',
    });
    return this.messageRepository.save(message);
  }

  async getMessageStatus(messageId: string): Promise<string> {
    // 这里应该实现与Telegram API的集成
    // 目前使用模拟实现
    console.log('Getting Telegram message status:', messageId);
    return 'read';
  }

  async syncContacts(userId: string): Promise<ThirdPartyContact[]> {
    // 这里应该实现与Telegram API的集成
    // 目前使用模拟实现
    console.log('Syncing Telegram contacts for user:', userId);
    
    // 模拟联系人数据
    const mockContacts = [
      {
        userId,
        platformUserId: '123456789',
        name: 'Alice Johnson',
        avatar: 'https://example.com/avatar3.jpg',
      },
      {
        userId,
        platformUserId: '987654321',
        name: 'Bob Williams',
        avatar: 'https://example.com/avatar4.jpg',
      },
    ];

    const contacts: ThirdPartyContact[] = [];
    for (const contactData of mockContacts) {
      const existingContact = await this.contactRepository.findOne({
        where: { userId, platformUserId: contactData.platformUserId },
      });
      if (existingContact) {
        contacts.push(existingContact);
      } else {
        const contact = this.contactRepository.create({
          ...contactData,
          platform: 'telegram',
        });
        const savedContact = await this.contactRepository.save(contact);
        contacts.push(savedContact);
      }
    }

    return contacts;
  }

  async getContact(userId: string, platformUserId: string): Promise<ThirdPartyContact | null> {
    return this.contactRepository.findOne({
      where: { userId, platformUserId, platform: 'telegram' },
    });
  }
}