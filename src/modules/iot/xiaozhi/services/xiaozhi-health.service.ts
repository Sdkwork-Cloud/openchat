/**
 * 小智服务健康检查
 *
 * 监控各项服务的健康状态
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaiduSTTService } from './stt/baidu-stt.service';
import { BaiduTTSService } from './tts/baidu-tts.service';
import { OpenAIChatService } from './llm/openai-chat.service';
import { XiaozhiOpusService } from './xiaozhi-opus.service';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    stt: { available: boolean; provider: string; message?: string };
    tts: { available: boolean; provider: string; message?: string };
    llm: { available: boolean; provider: string; message?: string };
    opus: { available: boolean; message?: string };
  };
  timestamp: number;
}

@Injectable()
export class XiaozhiHealthService implements OnModuleInit {
  private readonly logger = new Logger(XiaozhiHealthService.name);
  private lastHealthCheck: HealthStatus | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private configService: ConfigService,
    private baiduSTT: BaiduSTTService,
    private baiduTTS: BaiduTTSService,
    private openaiChat: OpenAIChatService,
    private opusService: XiaozhiOpusService,
  ) {}

  onModuleInit() {
    // 启动定期健康检查
    const interval = this.configService.get<number>('HEALTH_CHECK_INTERVAL') || 60000;
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, interval);

    this.logger.log('Health check service initialized');
  }

  /**
   * 执行健康检查
   */
  async checkHealth(): Promise<HealthStatus> {
    const sttProvider = this.configService.get<string>('STT_PROVIDER') || 'mock';
    const ttsProvider = this.configService.get<string>('TTS_PROVIDER') || 'mock';
    const llmProvider = this.configService.get<string>('LLM_PROVIDER') || 'mock';

    const status: HealthStatus = {
      status: 'healthy',
      services: {
        stt: { available: false, provider: sttProvider },
        tts: { available: false, provider: ttsProvider },
        llm: { available: false, provider: llmProvider },
        opus: { available: false },
      },
      timestamp: Date.now(),
    };

    // 检查 STT
    try {
      if (sttProvider === 'baidu') {
        status.services.stt.available = this.baiduSTT.isAvailable();
        if (!status.services.stt.available) {
          status.services.stt.message = 'Baidu API credentials not configured';
        }
      } else {
        status.services.stt.available = true;
        status.services.stt.message = 'Using mock provider';
      }
    } catch (error) {
      status.services.stt.message = error.message;
    }

    // 检查 TTS
    try {
      if (ttsProvider === 'baidu') {
        status.services.tts.available = this.baiduTTS.isAvailable();
        if (!status.services.tts.available) {
          status.services.tts.message = 'Baidu API credentials not configured';
        }
      } else {
        status.services.tts.available = true;
        status.services.tts.message = 'Using mock provider';
      }
    } catch (error) {
      status.services.tts.message = error.message;
    }

    // 检查 LLM
    try {
      if (llmProvider === 'openai') {
        status.services.llm.available = this.openaiChat.isAvailable();
        if (!status.services.llm.available) {
          status.services.llm.message = 'OpenAI API key not configured';
        }
      } else {
        status.services.llm.available = true;
        status.services.llm.message = 'Using mock provider';
      }
    } catch (error) {
      status.services.llm.message = error.message;
    }

    // 检查 Opus
    try {
      const stats = this.opusService.getStats();
      status.services.opus.available = stats.initializedDevices >= 0;
      status.services.opus.message = `${stats.initializedDevices} devices initialized`;
    } catch (error) {
      status.services.opus.message = error.message;
    }

    // 确定整体状态
    const services = Object.values(status.services);
    const availableCount = services.filter(s => s.available).length;

    if (availableCount === services.length) {
      status.status = 'healthy';
    } else if (availableCount >= services.length / 2) {
      status.status = 'degraded';
    } else {
      status.status = 'unhealthy';
    }

    this.lastHealthCheck = status;

    // 记录健康状态
    if (status.status !== 'healthy') {
      this.logger.warn(`Health check: ${status.status}`, status.services);
    } else {
      this.logger.debug('Health check: healthy');
    }

    return status;
  }

  /**
   * 获取上次健康检查结果
   */
  getLastHealthCheck(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * 获取服务状态摘要
   */
  getStatusSummary(): string {
    if (!this.lastHealthCheck) {
      return 'Health check not performed yet';
    }

    const { status, services } = this.lastHealthCheck;
    const parts = [
      `Status: ${status}`,
      `STT: ${services.stt.available ? '✓' : '✗'} (${services.stt.provider})`,
      `TTS: ${services.tts.available ? '✓' : '✗'} (${services.tts.provider})`,
      `LLM: ${services.llm.available ? '✓' : '✗'} (${services.llm.provider})`,
      `Opus: ${services.opus.available ? '✓' : '✗'}`,
    ];

    return parts.join(' | ');
  }

  /**
   * 检查特定服务是否可用
   */
  isServiceAvailable(service: 'stt' | 'tts' | 'llm' | 'opus'): boolean {
    if (!this.lastHealthCheck) {
      return false;
    }
    return this.lastHealthCheck.services[service].available;
  }

  /**
   * 销毁时清理
   */
  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
