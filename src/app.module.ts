import { Module, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';
import { UserModule } from './modules/user/user.module';
import { FriendModule } from './modules/friend/friend.module';
import { MessageModule } from './modules/message/message.module';
import { GroupModule } from './modules/group/group.module';
import { RtcModule } from './modules/rtc/rtc.module';
import { ThirdPartyModule } from './modules/third-party/third-party.module';
import { AIBotModule } from './modules/ai-bot/ai-bot.module';
import { GatewayModule } from './gateways/gateway.module';
import { IMProviderModule } from './modules/im-provider/im-provider.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { ContactModule } from './modules/contact/contact.module';
import { IoTModule } from './modules/iot/iot.module';
import { RedisModule } from './common/redis/redis.module';
import { ThrottlerModule } from './common/throttler/throttler.module';
import { QueueModule } from './common/queue/queue.module';
import { HealthModule } from './common/health/health.module';
import { AppConfigModule } from './common/config/config.module';
import { CacheModule } from './common/cache/cache.module';
import { AuthModule } from './common/auth/auth.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { EventBusModule } from './common/events/event-bus.module';
import { ExtensionsModule } from './extensions';
import { UserEntity } from './modules/user/entities/user.entity';
import { Friend } from './modules/friend/friend.entity';
import { FriendRequest } from './modules/friend/friend-request.entity';
import { Message } from './modules/message/message.entity';
import { Group } from './modules/group/group.entity';
import { GroupMember } from './modules/group/group-member.entity';
import { GroupInvitation } from './modules/group/group-invitation.entity';
import { RTCRoom } from './modules/rtc/rtc-room.entity';
import { RTCToken } from './modules/rtc/rtc-token.entity';
import { RTCChannelEntity } from './modules/rtc/rtc-channel.entity';
import { RTCVideoRecord } from './modules/rtc/rtc-video-record.entity';
import { ThirdPartyMessage } from './modules/third-party/third-party-message.entity';
import { ThirdPartyContact } from './modules/third-party/third-party-contact.entity';
import { AIBotEntity, BotMessageEntity } from './modules/ai-bot/ai-bot.entity';
import { ConversationEntity } from './modules/conversation/conversation.entity';
import { ContactEntity } from './modules/contact/contact.entity';
import { BotPlatformModule } from './modules/bot-platform/bot-platform.module';
import { BotEntity } from './modules/bot-platform/entities/bot.entity';
import { BotCommandEntity } from './modules/bot-platform/entities/bot-command.entity';
import { DeviceEntity } from './modules/iot/entities/device.entity';
import { DeviceMessageEntity } from './modules/iot/entities/device-message.entity';
import { AgentModule } from './modules/agent/agent.module';
import { Agent, AgentSession, AgentMessage } from './modules/agent/agent.entity';
import { WukongIMModule } from './modules/wukongim/wukongim.module';
import { CrawModule } from './modules/craw/craw.module';
import { DataSource } from 'typeorm';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SnakeNamingStrategy } from './common/config/snake-naming.strategy';

const logger = new Logger('Database');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('DB_HOST', 'localhost');
        const port = parseInt(configService.get('DB_PORT', '5432'), 10);
        const username = configService.get('DB_USERNAME', 'sdkwork_dev');
        const password = configService.get('DB_PASSWORD', 'dev_password');
        const database = configService.get('DB_NAME', 'sdkwork_chat_dev');

        logger.log('');
        logger.log('═══════════════════════════════════════════════════════════');
        logger.log('                    数据库连接配置                            ');
        logger.log('═══════════════════════════════════════════════════════════');
        logger.log(`  主机:     ${host}`);
        logger.log(`  端口:     ${port}`);
        logger.log(`  用户:     ${username}`);
        logger.log(`  数据库:   ${database}`);
        logger.log(`  连接池:   最小 ${configService.get('DB_POOL_MIN', 5)} / 最大 ${configService.get('DB_POOL_MAX', 20)}`);
        logger.log('═══════════════════════════════════════════════════════════');
        logger.log('');

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [
            UserEntity,
            Friend,
            FriendRequest,
            Message,
            Group,
            GroupMember,
            GroupInvitation,
            RTCRoom,
            RTCToken,
            RTCChannelEntity,
            RTCVideoRecord,
            ThirdPartyMessage,
            ThirdPartyContact,
            AIBotEntity,
            BotMessageEntity,
            ConversationEntity,
            ContactEntity,
            BotEntity,
            BotCommandEntity,
            DeviceEntity,
            DeviceMessageEntity,
            Agent,
            AgentSession,
            AgentMessage,
          ],
          synchronize: false,
          logging: false,
          namingStrategy: new SnakeNamingStrategy(),
        };
      },
    }),

    ThrottlerModule,

    QueueModule.register(),

    HealthModule,

    AppConfigModule,

    AuthModule,

    CacheModule,

    MetricsModule,

    EventBusModule,

    ExtensionsModule.forRoot({
      useDefaultUserCenter: true,
      useRemoteUserCenter: false,
    }),
    GatewayModule,
    UserModule,
    FriendModule,
    MessageModule,
    GroupModule,
    RtcModule,
    ThirdPartyModule,
    AIBotModule,
    IMProviderModule,
    ConversationModule,
    ContactModule,
    BotPlatformModule,
    IoTModule,
    AgentModule,
    WukongIMModule,
    CrawModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    logger.log('AppModule 初始化完成');
  }

  onModuleDestroy() {
    logger.log('AppModule 销毁中...');
  }
}
