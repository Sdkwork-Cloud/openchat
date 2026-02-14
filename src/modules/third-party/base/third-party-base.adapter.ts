import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThirdPartyAdapter, ThirdPartyPlatform } from '../third-party.interface';
import { ThirdPartyMessage } from '../third-party-message.entity';
import { ThirdPartyContact } from '../third-party-contact.entity';

export abstract class ThirdPartyBaseAdapter implements ThirdPartyAdapter {
  protected abstract readonly platform: ThirdPartyPlatform;
  protected abstract readonly logger: Logger;

  constructor(
    @InjectRepository(ThirdPartyMessage)
    protected messageRepository: Repository<ThirdPartyMessage>,
    @InjectRepository(ThirdPartyContact)
    protected contactRepository: Repository<ThirdPartyContact>,
  ) {}

  async sendMessage(messageData: Omit<ThirdPartyMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThirdPartyMessage> {
    this.logger.log(`Sending ${this.platform} message`);

    const message = this.messageRepository.create({
      ...messageData,
      platformMessageId: `${this.platform}_${Date.now()}`,
      status: 'sent',
    });
    return this.messageRepository.save(message);
  }

  async getMessageStatus(messageId: string): Promise<string> {
    this.logger.log(`Getting ${this.platform} message status: ${messageId}`);
    return 'read';
  }

  async syncContacts(userId: string): Promise<ThirdPartyContact[]> {
    this.logger.log(`Syncing ${this.platform} contacts for user: ${userId}`);

    const mockContacts = this.getMockContacts(userId);
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
          platform: this.platform,
        });
        const savedContact = await this.contactRepository.save(contact);
        contacts.push(savedContact);
      }
    }

    return contacts;
  }

  async getContact(userId: string, platformUserId: string): Promise<ThirdPartyContact | null> {
    return this.contactRepository.findOne({
      where: { userId, platformUserId, platform: this.platform },
    });
  }

  protected abstract getMockContacts(userId: string): Array<{
    userId: string;
    platformUserId: string;
    name: string;
    avatar: string;
  }>;
}
