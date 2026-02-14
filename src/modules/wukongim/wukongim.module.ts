import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WukongIMService } from './wukongim.service';
import { WukongIMController } from './wukongim.controller';
import { WukongIMWebhookController } from './wukongim.webhook.controller';
import { WukongIMClient } from './wukongim.client';
import { Message } from '../message/message.entity';
import { MetricsModule } from '../../common/metrics/metrics.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([Message]),
    MetricsModule,
  ],
  providers: [WukongIMClient, WukongIMService],
  controllers: [WukongIMController, WukongIMWebhookController],
  exports: [WukongIMClient, WukongIMService],
})
export class WukongIMModule {}
