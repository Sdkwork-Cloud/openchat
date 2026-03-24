import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WukongIMService } from './wukongim.service';
import { WukongIMClient } from './wukongim.client';
import { Message } from '../message/message.entity';
import { MessageReceipt } from '../message/message-receipt.entity';
import { MetricsModule } from '../../common/metrics/metrics.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([Message, MessageReceipt]),
    MetricsModule,
  ],
  providers: [WukongIMClient, WukongIMService],
  exports: [WukongIMClient, WukongIMService],
})
export class WukongIMModule {}
