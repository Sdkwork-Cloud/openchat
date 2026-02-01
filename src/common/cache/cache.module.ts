import { Module, Global } from '@nestjs/common';
import { UserCacheService } from './user-cache.service';

/**
 * 缓存模块
 * 提供多级缓存服务（本地内存 + Redis）
 */
@Global()
@Module({
  providers: [UserCacheService],
  exports: [UserCacheService],
})
export class CacheModule {}
