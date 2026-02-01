/**
 * 悟空IM 模块 V2
 * 提供与悟空IM的完整集成
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WukongIMService } from './wukongim.service';
import { WukongIMServiceV2 } from './wukongim.service.v2';
import { WukongIMWebhookController } from './wukongim.webhook.controller';
import { Message } from '../message/message.entity';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([Message]),
  ],
  providers: [
    WukongIMService,      // 保留旧版本兼容
    WukongIMServiceV2,    // 新版本服务
  ],
  controllers: [WukongIMWebhookController],
  exports: [
    WukongIMService,
    WukongIMServiceV2,
  ],
})
export class WukongIMModule {}
