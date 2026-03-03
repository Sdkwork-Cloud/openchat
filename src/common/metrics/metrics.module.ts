import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { PrometheusService } from './prometheus.service';
import { MetricsController } from './metrics.controller';

/**
 * 性能监控模块
 * 提供系统性能指标收集和存储功能
 */
@Global()
@Module({
  providers: [MetricsService, PrometheusService],
  controllers: [MetricsController],
  exports: [MetricsService, PrometheusService],
})
export class MetricsModule {}
