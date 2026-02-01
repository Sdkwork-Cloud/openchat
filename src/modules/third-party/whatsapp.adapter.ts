import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThirdPartyAdapter } from './third-party.interface';
import { ThirdPartyMessage } from './third-party-message.entity';
import { ThirdPartyContact } from './third-party-contact.entity';

@Injectable()
export class WhatsAppAdapter implements ThirdPartyAdapter {
  constructor(
    @InjectRepository(ThirdPartyMessage)
    private messageRepository: Repository<ThirdPartyMessage>,
    @InjectRepository(ThirdPartyContact)
    private contactRepository: Repository<ThirdPartyContact>,
  ) {}

  async sendMessage(messageData: Omit<ThirdPartyMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThirdPartyMessage> {
    // 这里应该实现与WhatsApp API的集成
    // 目前使用模拟实现
    console.log('Sending WhatsApp message:', messageData);
    
    const message = this.messageRepository.create({
      ...messageData,
      platformMessageId: `whatsapp_${Date.now()}`,
      status: 'sent',
    });
    return this.messageRepository.save(message);
  }

  async getMessageStatus(messageId: string): Promise<string> {
    // 这里应该实现与WhatsApp API的集成
    // 目前使用模拟实现
    console.log('Getting WhatsApp message status:', messageId);
    return 'delivered';
  }

  async syncContacts(userId: string): Promise<ThirdPartyContact[]> {
    // 这里应该实现与WhatsApp API的集成
    // 目前使用模拟实现
    console.log('Syncing WhatsApp contacts for user:', userId);
    
    // 模拟联系人数据
    const mockContacts = [
      {
        userId,
        platformUserId: '1234567890',
        name: 'John Doe',
        avatar: 'https://example.com/avatar1.jpg',
      },
      {
        userId,
        platformUserId: '0987654321',
        name: 'Jane Smith',
        avatar: 'https://example.com/avatar2.jpg',
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
          platform: 'whatsapp',
        });
        const savedContact = await this.contactRepository.save(contact);
        contacts.push(savedContact);
      }
    }

    return contacts;
  }

  async getContact(userId: string, platformUserId: string): Promise<ThirdPartyContact | null> {
    return this.contactRepository.findOne({
      where: { userId, platformUserId, platform: 'whatsapp' },
    });
  }
}