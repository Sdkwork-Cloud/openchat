import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WSGateway } from './ws.gateway';
import { WsJwtGuard } from './ws-jwt.guard';
import { WSHeartbeatService } from './services/ws-heartbeat.service';
import { WsAckRetryService } from './services/ws-ack-retry.service';
import { WsGroupAuthorizationService } from './services/ws-group-authorization.service';
import { WsGroupSessionCommandService } from './services/ws-group-session-command.service';
import { WsMessageAckCommandService } from './services/ws-message-ack-command.service';
import { WsMessageCommandService } from './services/ws-message-command.service';
import { WsMessageEventEmitterService } from './services/ws-message-event-emitter.service';
import { WsMessageTelemetryService } from './services/ws-message-telemetry.service';
import { WsRtcSessionCommandService } from './services/ws-rtc-session-command.service';
import { WsSystemMessageService } from './services/ws-system-message.service';
import { WsTypingIndicatorService } from './services/ws-typing-indicator.service';
import { RedisModule } from '../common/redis/redis.module';
import { MessageModule } from '../modules/message/message.module';
import { FriendModule } from '../modules/friend/friend.module';
import { GroupModule } from '../modules/group/group.module';
import { IMProviderModule } from '../modules/im-provider/im-provider.module';
import { WsThrottlerGuard } from '../common/throttler/ws-throttler.guard';

/**
 * Gateway 模块
 * 提供 WebSocket 服务（支持分布式部署）
 */
@Module({
  imports: [
    RedisModule,
    MessageModule,
    FriendModule,
    GroupModule,
    IMProviderModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [
    WSHeartbeatService,
    WsAckRetryService,
    WsGroupAuthorizationService,
    WsGroupSessionCommandService,
    WsTypingIndicatorService,
    WsMessageAckCommandService,
    WsMessageCommandService,
    WsRtcSessionCommandService,
    WsMessageEventEmitterService,
    WsMessageTelemetryService,
    WsSystemMessageService,
    WsJwtGuard,
    WsThrottlerGuard,
    JwtService,
    ConfigService,
    WSGateway,
  ],
  exports: [
    WSHeartbeatService,
    WsAckRetryService,
    WsGroupAuthorizationService,
    WsGroupSessionCommandService,
    WsTypingIndicatorService,
    WsMessageAckCommandService,
    WsMessageCommandService,
    WsRtcSessionCommandService,
    WsMessageEventEmitterService,
    WsMessageTelemetryService,
    WsSystemMessageService,
    WSGateway,
  ],
})
export class GatewayModule {}
