import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThirdPartyBaseAdapter } from './base/third-party-base.adapter';
import { ThirdPartyMessage } from './third-party-message.entity';
import { ThirdPartyContact } from './third-party-contact.entity';

@Injectable()
export class TelegramAdapter extends ThirdPartyBaseAdapter {
  protected readonly platform = 'telegram' as const;
  protected readonly logger = new Logger(TelegramAdapter.name);

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
  }
}
