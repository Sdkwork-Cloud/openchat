import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrometheusService } from './prometheus.service';

@ApiTags('监控')
@Controller()
export class MetricsController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus指标端点' })
  async getMetrics(): Promise<string> {
    return this.prometheusService.getMetrics();
  }
}
