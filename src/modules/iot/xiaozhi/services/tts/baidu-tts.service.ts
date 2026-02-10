/**
 * 百度语音合成服务
 *
 * 提供百度文字转语音 API 调用
 * 文档：https://ai.baidu.com/ai-doc/SPEECH/Gk4nlz8tc
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

interface BaiduTokenResponse {
  access_token: string;
  expires_in: number;
}

interface BaiduTTSRequest {
  tex: string;
  tok: string;
  cuid: string;
  ctp: number;
  lan: string;
  spd?: number;
  pit?: number;
  vol?: number;
  per?: number;
  aue?: number;
}

@Injectable()
export class BaiduTTSService {
  private readonly logger = new Logger(BaiduTTSService.name);

  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
  private readonly ttsUrl = 'https://tsn.baidu.com/text2audio';

  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // 音色映射
  private readonly voiceMap: Record<string, number> = {
    'zh_female_xiaoxin': 0,   // 女声
    'zh_female_xiaoyan': 1,   // 女声
    'zh_male_xiaoyuan': 3,    // 男声
    'zh_male_yehao': 4,       // 男声
    'zh_female_chengyao': 5,  // 女声
    'zh_female_xiaomeng': 9,  // 女声
    'zh_female_xiaoxue': 10,  // 女声
    'zh_male_xiaotong': 11,   // 男声
  };

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('BAIDU_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('BAIDU_API_SECRET') || '';
  }

  /**
   * 语音合成
   *
   * @param text - 要合成的文本
   * @param options - 合成选项
   * @returns PCM 音频数据
   */
  async synthesize(
    text: string,
    options: {
      voice?: string;
      speed?: number;
      pitch?: number;
      volume?: number;
    } = {}
  ): Promise<Buffer> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Baidu API credentials not configured');
    }

    try {
      // 获取 access token
      const token = await this.getAccessToken();

      // 构建请求参数
      const params: BaiduTTSRequest = {
        tex: encodeURIComponent(text),
        tok: token,
        cuid: this.generateCuid(),
        ctp: 1,
        lan: 'zh',
        spd: options.speed ?? 5,      // 语速：0-15，默认5
        pit: options.pitch ?? 5,      // 音调：0-15，默认5
        vol: options.volume ?? 15,    // 音量：0-15，默认15
        per: this.voiceMap[options.voice || 'zh_female_xiaoxin'] ?? 0,
        aue: 6,                       // 输出格式：6=PCM 16k
      };

      // 发送合成请求
      const response = await firstValueFrom(
        this.httpService.post(this.ttsUrl, null, {
          params,
          responseType: 'arraybuffer',
          timeout: 30000,
          validateStatus: (status) => status === 200,
        })
      );

      // 检查返回的是否是错误信息（JSON格式）
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const errorData = JSON.parse(Buffer.from(response.data).toString());
        this.logger.error(`Baidu TTS error: ${errorData.err_msg} (${errorData.err_no})`);
        throw new Error(`TTS failed: ${errorData.err_msg}`);
      }

      // 返回音频数据
      const audioData = Buffer.from(response.data);
      this.logger.debug(`Baidu TTS synthesized: ${text.length} chars -> ${audioData.length} bytes`);

      return audioData;

    } catch (error) {
      this.logger.error('Baidu TTS request failed:', error);
      throw error;
    }
  }

  /**
   * 批量合成（用于长文本）
   *
   * @param text - 要合成的长文本
   * @param options - 合成选项
   * @returns PCM 音频数据数组
   */
  async synthesizeLongText(
    text: string,
    options: {
      voice?: string;
      speed?: number;
      pitch?: number;
      volume?: number;
      maxLength?: number;
    } = {}
  ): Promise<Buffer[]> {
    const maxLength = options.maxLength || 500; // 百度限制每次最多 512 字符
    const chunks = this.splitText(text, maxLength);
    const results: Buffer[] = [];

    for (const chunk of chunks) {
      try {
        const audio = await this.synthesize(chunk, options);
        results.push(audio);
      } catch (error) {
        this.logger.error(`Failed to synthesize chunk: "${chunk.substring(0, 50)}..."`, error);
        // 继续处理下一段
      }
    }

    return results;
  }

  /**
   * 获取 Access Token
   */
  private async getAccessToken(): Promise<string> {
    // 检查 token 是否过期（提前 1 分钟刷新）
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<BaiduTokenResponse>(
          this.tokenUrl,
          null,
          {
            params: {
              grant_type: 'client_credentials',
              client_id: this.apiKey,
              client_secret: this.apiSecret,
            },
            timeout: 10000,
          }
        )
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;

      this.logger.debug('Baidu TTS access token refreshed');

      return this.accessToken;

    } catch (error) {
      this.logger.error('Failed to get Baidu access token:', error);
      throw new Error('Failed to authenticate with Baidu API');
    }
  }

  /**
   * 分割长文本
   */
  private splitText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let current = '';

    // 按句子分割
    const sentences = text.split(/([。！？.!?；;，,])/);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      if ((current + sentence).length > maxLength) {
        if (current) {
          chunks.push(current);
          current = sentence;
        } else {
          // 单句超过最大长度，强制分割
          chunks.push(sentence.substring(0, maxLength));
          current = sentence.substring(maxLength);
        }
      } else {
        current += sentence;
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }

  /**
   * 生成唯一设备标识
   */
  private generateCuid(): string {
    return crypto.randomUUID().replace(/-/g, '');
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!this.apiKey && !!this.apiSecret;
  }

  /**
   * 获取支持的音色列表
   */
  getSupportedVoices(): string[] {
    return Object.keys(this.voiceMap);
  }
}
