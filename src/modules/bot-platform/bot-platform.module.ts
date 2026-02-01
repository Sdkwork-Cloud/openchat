import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BotEntity } from './entities/bot.entity';
import { BotCommandEntity } from './entities/bot-command.entity';
import { BotService } from './services/bot.service';
import { WebhookService } from './services/webhook.service';
import { BotController } from './controllers/bot.controller';

/**
 * Bot 平台模块
 * 提供 Bot 注册、管理、Webhook 等开放平台能力
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BotEntity,
      BotCommandEntity,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', '1h'),
        },
      }),
    }),
  ],
  controllers: [BotController],
  providers: [
    BotService,
    WebhookService,
  ],
  exports: [
    BotService,
    WebhookService,
  ],
})
export class BotPlatformModule {}
