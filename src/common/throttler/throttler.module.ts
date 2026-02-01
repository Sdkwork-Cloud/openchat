import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule as NestThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from './throttler-storage-redis.service';
import { WsThrottlerGuard } from './ws-throttler.guard';

/**
 * 限流模块配置
 * 支持滑动窗口算法，基于 Redis 存储实现分布式限流
 * 包含 HTTP API 限流和 WebSocket 限流
 */
@Global()
@Module({
  imports: [
    NestThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get('THROTTLE_TTL', 60000), // 60秒
            limit: config.get('THROTTLE_LIMIT', 100), // 100请求
          },
          {
            name: 'strict',
            ttl: 60000, // 60秒
            limit: 10, // 严格限流：10请求
          },
          {
            name: 'message',
            ttl: 1000, // 1秒
            limit: 5, // 消息发送限流：5条/秒
          },
          {
            name: 'login',
            ttl: 60000, // 60秒
            limit: 5, // 登录接口限流：5次/分钟
          },
        ],
      }),
    }),
  ],
  providers: [
    ThrottlerStorageRedisService,
    WsThrottlerGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerStorageRedisService, WsThrottlerGuard],
})
export class ThrottlerModule {}
