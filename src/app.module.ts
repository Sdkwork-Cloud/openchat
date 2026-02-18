import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
    }),

    // Redis 模块（全局）
    RedisModule,

    // 限流模块（全局）
    ThrottlerModule,

    // 消息队列模块（可选，通过 QUEUE_ENABLED 控制）
    QueueModule.register(),

    // 健康检查模块
    HealthModule,

    // 配置验证模块
    AppConfigModule,

    // 认证模块（全局）
    AuthModule,

    // 缓存模块（全局）
    CacheModule,

    // 性能监控模块（全局）
    MetricsModule,

    // 事件总线模块（全局）
    EventBusModule,

    // 扩展插件模块（全局）
    ExtensionsModule.forRoot({
      useDefaultUserCenter: true,
      useRemoteUserCenter: false,
    }),

    // 数据库模块（优化连接池配置）
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 使用环境变量中的数据库配置
        const dbConfig = {
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USER', 'openchat'),
          password: configService.get('DB_PASSWORD', 'openchat_password'),
          database: configService.get('DB_NAME', 'openchat')
        };
        
        const logger = new Logger('AppModule');
        logger.log('Database configuration: ' + JSON.stringify(dbConfig));
        
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
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
        synchronize: configService.get('NODE_ENV') !== 'production', // 生产环境禁用同步
        logging: configService.get('DB_LOGGING', 'false') === 'true',
        // 连接池优化配置
        extra: {
          // 连接池大小
          max: configService.get('DB_POOL_MAX', 20),
          min: configService.get('DB_POOL_MIN', 5),
          // 连接空闲超时（毫秒）
          idleTimeoutMillis: configService.get('DB_IDLE_TIMEOUT', 30000),
          // 连接获取超时（毫秒）
          connectionTimeoutMillis: configService.get('DB_CONNECTION_TIMEOUT', 5000),
          // 连接最大生命周期（毫秒）
          maxLifetime: configService.get('DB_MAX_LIFETIME', 300000), // 5分钟
        },
      };
      }
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
})
export class AppModule {}