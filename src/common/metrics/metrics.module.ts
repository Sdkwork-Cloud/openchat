import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * 性能监控模块
 * 提供系统性能指标收集和存储功能
 */
@Global()
@Module({
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
