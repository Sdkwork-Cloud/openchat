import { Module, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, RouterModule } from '@nestjs/core';
import { GatewayModule } from './gateways/gateway.module';
import { IMProviderModule } from './modules/im-provider/im-provider.module';
import { ThrottlerModule } from './common/throttler/throttler.module';
import { QueueModule } from './common/queue/queue.module';
import { HealthModule } from './common/health/health.module';
import { AppConfigModule } from './common/config/config.module';
import { CacheModule } from './common/cache/cache.module';
import { AuthModule } from './common/auth/auth.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { EventBusModule } from './common/events/event-bus.module';
import { ExtensionsModule } from './extensions';
import { ImAppApiModule } from './api/im-app-api.module';
import { ImAdminApiModule } from './api/im-admin-api.module';
import {
  IM_ADMIN_API_PREFIX,
  IM_APP_API_PREFIX,
} from './common/http/im-api-surface.constants';
import { UserEntity } from './modules/user/entities/user.entity';
import { Friend } from './modules/friend/friend.entity';
import { FriendRequest } from './modules/friend/friend-request.entity';
import { Message } from './modules/message/message.entity';
import { MessageReceipt } from './modules/message/message-receipt.entity';
import { MessageReaction } from './modules/message/message-reaction.entity';
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
import { ConversationReadCursorEntity } from './modules/conversation/conversation-read-cursor.entity';
import { ContactEntity } from './modules/contact/contact.entity';
import { BotEntity } from './modules/bot-platform/entities/bot.entity';
import { BotCommandEntity } from './modules/bot-platform/entities/bot-command.entity';
import { DeviceEntity } from './modules/iot/entities/device.entity';
import { DeviceMessageEntity } from './modules/iot/entities/device-message.entity';
import {
  Agent,
  AgentSession,
  AgentMessage,
  AgentTool,
  AgentSkill,
  AgentExecution,
} from './modules/agent/agent.entity';
import { TimelinePostEntity } from './modules/timeline/entities/timeline-post.entity';
import { TimelineFeedItemEntity } from './modules/timeline/entities/timeline-feed-item.entity';
import { TimelinePostLikeEntity } from './modules/timeline/entities/timeline-post-like.entity';
import { AuditLogEntity } from './common/entities/audit-log.entity';
import { CrawAgent } from './modules/craw/entities/craw-agent.entity';
import { CrawPost, CrawComment } from './modules/craw/entities/craw-post.entity';
import {
  CrawSubmolt,
  CrawSubmoltSubscriber,
  CrawSubmoltModerator,
  CrawFollow,
  CrawVote,
} from './modules/craw/entities/craw-submolt.entity';
import {
  CrawDmRequest,
  CrawDmConversation,
  CrawDmMessage,
} from './modules/craw/entities/craw-dm.entity';
import {
  AgentMemory,
  MemorySummary,
  KnowledgeChunk,
  KnowledgeDocument,
  MemoryVector,
} from './modules/agent/memory/memory.entity';
import { RtcWebhookModule } from './modules/rtc/rtc-webhook.module';
import { WukongIMWebhookModule } from './modules/wukongim/wukongim-webhook.module';
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

        // 检查是否为生产环境
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        logger.log('');
        logger.log('═══════════════════════════════════════════════════════════');
        logger.log('                    数据库连接配置                            ');
        logger.log('═══════════════════════════════════════════════════════════');
        logger.log(`  主机:     ${host}`);
        logger.log(`  端口:     ${port}`);
        // 生产环境不输出敏感信息
        if (!isProduction) {
          logger.log(`  用户:     ${username}`);
        } else {
          logger.log(`  用户:     ***`);
        }
        logger.log(`  数据库:   ${database}`);
        logger.log(`  连接池:   最小 ${configService.get('DB_POOL_MIN', 5)} / 最大 ${configService.get('DB_POOL_MAX', 20)}`);
        logger.log('═══════════════════════════════════════════════════════════');
        logger.log('');

        const poolMin = parseInt(configService.get('DB_POOL_MIN', '5'), 10);
        const poolMax = parseInt(configService.get('DB_POOL_MAX', '20'), 10);

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
            MessageReceipt,
            MessageReaction,
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
            ConversationReadCursorEntity,
            ContactEntity,
            BotEntity,
            BotCommandEntity,
            DeviceEntity,
            DeviceMessageEntity,
            Agent,
            AgentSession,
            AgentMessage,
            AgentTool,
            AgentSkill,
            AgentExecution,
            AgentMemory,
            MemorySummary,
            KnowledgeChunk,
            KnowledgeDocument,
            MemoryVector,
            CrawAgent,
            CrawPost,
            CrawComment,
            CrawSubmolt,
            CrawSubmoltSubscriber,
            CrawSubmoltModerator,
            CrawFollow,
            CrawVote,
            CrawDmRequest,
            CrawDmConversation,
            CrawDmMessage,
            AuditLogEntity,
            TimelinePostEntity,
            TimelineFeedItemEntity,
            TimelinePostLikeEntity,
          ],
          synchronize: false,
          logging: false,
          namingStrategy: new SnakeNamingStrategy(),
          // Connection pool configuration
          extra: {
            min: poolMin,
            max: poolMax,
            // Connection timeout
            connectionTimeoutMillis: parseInt(configService.get('DB_CONNECTION_TIMEOUT', '30000'), 10),
            // Idle timeout
            idleTimeoutMillis: parseInt(configService.get('DB_IDLE_TIMEOUT', '300000'), 10),
            // Acquire timeout
            acquireTimeoutMillis: parseInt(configService.get('DB_ACQUIRE_TIMEOUT', '60000'), 10),
            // Maximum number of milliseconds a client can be idle before being closed
            allowExitOnIdle: false,
          },
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

    RouterModule.register([
      {
        path: IM_APP_API_PREFIX,
        module: ImAppApiModule,
      },
      {
        path: IM_ADMIN_API_PREFIX,
        module: ImAdminApiModule,
      },
    ]),

    ExtensionsModule.forRoot({
      useDefaultUserCenter: true,
      useRemoteUserCenter: false,
    }),
    GatewayModule,
    ImAppApiModule,
    ImAdminApiModule,
    RtcWebhookModule,
    WukongIMWebhookModule,
    IMProviderModule,
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
