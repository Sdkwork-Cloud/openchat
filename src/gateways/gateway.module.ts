import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WSGateway } from './ws.gateway';
import { WsJwtGuard } from './ws-jwt.guard';
import { WSHeartbeatService } from './services/ws-heartbeat.service';
import { RedisModule } from '../common/redis/redis.module';
import { MessageModule } from '../modules/message/message.module';
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
    IMProviderModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [
    WSHeartbeatService,
    WsJwtGuard,
    WsThrottlerGuard,
    JwtService,
    ConfigService,
    WSGateway,
  ],
  exports: [
    WSHeartbeatService,
    WSGateway,
  ],
})
export class GatewayModule {}
