import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThirdPartyService } from './third-party.service';
import { ThirdPartyController } from './third-party.controller';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { TelegramAdapter } from './telegram.adapter';
import { ThirdPartyMessage } from './third-party-message.entity';
import { ThirdPartyContact } from './third-party-contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ThirdPartyMessage, ThirdPartyContact])],
  providers: [
    ThirdPartyService,
    WhatsAppAdapter,
    TelegramAdapter,
  ],
  controllers: [ThirdPartyController],
  exports: [ThirdPartyService],
})
export class ThirdPartyModule {}