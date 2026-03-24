import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../message/message.entity';
import { MessageReceipt } from '../message/message-receipt.entity';
import { WukongIMModule } from './wukongim.module';
import { WukongIMWebhookController } from './wukongim.webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageReceipt]),
    WukongIMModule,
  ],
  controllers: [WukongIMWebhookController],
})
export class WukongIMWebhookModule {}
