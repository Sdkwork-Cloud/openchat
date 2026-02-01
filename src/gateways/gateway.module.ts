import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WSGateway } from './ws.gateway';
import { WSGatewayV2 } from './ws.gateway.v2';
import { WsJwtGuard } from './ws-jwt.guard';
import { RedisModule } from '../common/redis/redis.module';

/**
 * Gateway 模块
 * 提供 WebSocket 服务（支持分布式部署）
 */
@Module({
  imports: [RedisModule],
  providers: [
    // 使用 V2 版本的 Gateway（支持 Redis Adapter）
    WSGatewayV2,
    WsJwtGuard,
    JwtService,
    ConfigService,
    // 保留旧版本兼容
    WSGateway,
  ],
  exports: [WSGatewayV2, WSGateway],
})
export class GatewayModule {}
