/**
 * 百度语音识别服务
 * 
 * 提供百度语音转文字 API 调用
 * 文档：https://ai.baidu.com/ai-doc/SPEECH/Ek39uxgrj
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

interface BaiduSTTResponse {
  err_no: number;
  err_msg: string;
  sn: string;
  result: string[];
}

@Injectable()
export class BaiduSTTService {
  private readonly logger = new Logger(BaiduSTTService.name);
  
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
  private readonly sttUrl = 'https://vop.baidu.com/server_api';
  
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('BAIDU_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('BAIDU_API_SECRET') || '';
  }

  /**
   * 语音识别
   * 
   * @param pcmData - PCM 音频数据
   * @param sampleRate - 采样率 (16000)
   * @returns 识别文本
   */
  async recognize(pcmData: Buffer, sampleRate: number = 16000): Promise<string> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Baidu API credentials not configured');
    }

    try {
      // 获取 access token
      const token = await this.getAccessToken();
      
      // 构建请求参数
      const params = {
        token,
        cuid: this.generateCuid(),
        format: 'pcm',
        rate: sampleRate,
        channel: 1,
        speech: pcmData.toString('base64'),
        len: pcmData.length,
      };

      // 发送识别请求
      const response = await firstValueFrom(
        this.httpService.post<BaiduSTTResponse>(this.sttUrl, params, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })
      );

      const data = response.data;

      if (data.err_no !== 0) {
        this.logger.error(`Baidu STT error: ${data.err_msg} (${data.err_no})`);
        throw new Error(`STT failed: ${data.err_msg}`);
      }

      // 返回识别结果
      const text = data.result?.[0] || '';
      this.logger.debug(`Baidu STT result: "${text}"`);
      
      return text;

    } catch (error) {
      this.logger.error('Baidu STT request failed:', error);
      throw error;
    }
  }

  /**
   * 获取 Access Token
   */
  private async getAccessToken(): Promise<string> {
    // 检查 token 是否过期
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

      this.logger.debug('Baidu access token refreshed');
      
      return this.accessToken;

    } catch (error) {
      this.logger.error('Failed to get Baidu access token:', error);
      throw new Error('Failed to authenticate with Baidu API');
    }
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
}
