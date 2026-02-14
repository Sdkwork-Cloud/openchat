import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThirdPartyBaseAdapter } from './base/third-party-base.adapter';
import { ThirdPartyMessage } from './third-party-message.entity';
import { ThirdPartyContact } from './third-party-contact.entity';

@Injectable()
export class WhatsAppAdapter extends ThirdPartyBaseAdapter {
  protected readonly platform = 'whatsapp' as const;
  protected readonly logger = new Logger(WhatsAppAdapter.name);

  constructor(
    @InjectRepository(ThirdPartyMessage)
    messageRepository: Repository<ThirdPartyMessage>,
    @InjectRepository(ThirdPartyContact)
    contactRepository: Repository<ThirdPartyContact>,
  ) {
    super(messageRepository, contactRepository);
  }

  protected getMockContacts(userId: string) {
    return [
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
  }
}
