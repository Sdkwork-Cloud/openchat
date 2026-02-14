import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../../../common/events/event-bus.service';

let OpusEncoder: any;
try {
  const opus = require('@discordjs/opus');
  OpusEncoder = opus.OpusEncoder;
} catch (error) {
  Logger.warn('@discordjs/opus not available, falling back to opusscript', 'XiaozhiOpus');
  try {
    const opusscript = require('opusscript');
    OpusEncoder = opusscript;
  } catch (e) {
    Logger.error('No Opus library available', '', 'XiaozhiOpus');
  }
}

@Injectable()
export class XiaozhiOpusService {
  private readonly logger = new Logger(XiaozhiOpusService.name);
  
  private encoders = new Map<string, any>();
  private decoders = new Map<string, any>();
  
  private readonly DEFAULT_SAMPLE_RATE = 16000;
  private readonly DEFAULT_CHANNELS = 1;
  private readonly DEFAULT_FRAME_SIZE = 960;

  constructor(
    private readonly eventBus: EventBusService,
  ) {
    if (!OpusEncoder) {
      this.logger.error('No Opus encoder available. Please install @discordjs/opus or opusscript');
    }
  }

  /**
   * 初始化设备的编解码器
   * 
   * @param deviceId - 设备ID
   * @param sampleRate - 采样率 (默认 16000)
   * @param channels - 声道数 (默认 1)
   */
  initialize(deviceId: string, sampleRate: number = this.DEFAULT_SAMPLE_RATE, channels: number = this.DEFAULT_CHANNELS): void {
    if (!OpusEncoder) {
      throw new Error('Opus encoder not available');
    }

    try {
      // 创建编码器 (PCM -> Opus)
      const encoder = new OpusEncoder(sampleRate, channels);
      this.encoders.set(deviceId, encoder);
      
      // 创建解码器 (Opus -> PCM)
      const decoder = new OpusEncoder(sampleRate, channels);
      this.decoders.set(deviceId, decoder);
      
      this.logger.log(`Opus codec initialized for device ${deviceId} (sampleRate: ${sampleRate}, channels: ${channels})`);
    } catch (error) {
      this.logger.error(`Failed to initialize Opus codec for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * 编码 PCM 数据为 Opus
   * 
   * @param deviceId - 设备ID
   * @param pcmData - PCM 音频数据 (Int16Array 或 Buffer)
   * @returns Opus 编码后的数据
   */
  encode(deviceId: string, pcmData: Buffer): Buffer {
    const encoder = this.encoders.get(deviceId);
    if (!encoder) {
      throw new Error(`Opus encoder not found for device ${deviceId}. Call initialize() first.`);
    }

    try {
      // 确保数据长度正确 (必须是 frame_size 的整数倍)
      const frameSize = this.DEFAULT_FRAME_SIZE;
      const validLength = Math.floor(pcmData.length / 2 / frameSize) * frameSize * 2;
      
      if (validLength === 0) {
        this.logger.warn(`PCM data too short for device ${deviceId}: ${pcmData.length} bytes`);
        return Buffer.alloc(0);
      }

      const validData = pcmData.slice(0, validLength);
      const encoded = encoder.encode(validData);
      
      return encoded;
    } catch (error) {
      this.logger.error(`Opus encoding failed for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * 解码 Opus 数据为 PCM
   * 
   * @param deviceId - 设备ID
   * @param opusData - Opus 编码数据
   * @returns PCM 音频数据
   */
  decode(deviceId: string, opusData: Buffer): Buffer {
    const decoder = this.decoders.get(deviceId);
    if (!decoder) {
      throw new Error(`Opus decoder not found for device ${deviceId}. Call initialize() first.`);
    }

    try {
      const decoded = decoder.decode(opusData);
      return decoded;
    } catch (error) {
      this.logger.error(`Opus decoding failed for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * 批量编码
   * 
   * @param deviceId - 设备ID
   * @param pcmDataList - PCM 数据列表
   * @returns Opus 数据列表
   */
  encodeBatch(deviceId: string, pcmDataList: Buffer[]): Buffer[] {
    return pcmDataList.map(pcmData => this.encode(deviceId, pcmData));
  }

  /**
   * 批量解码
   * 
   * @param deviceId - 设备ID
   * @param opusDataList - Opus 数据列表
   * @returns PCM 数据列表
   */
  decodeBatch(deviceId: string, opusDataList: Buffer[]): Buffer[] {
    return opusDataList.map(opusData => this.decode(deviceId, opusData));
  }

  /**
   * 检查设备是否已初始化
   * 
   * @param deviceId - 设备ID
   * @returns 是否已初始化
   */
  isInitialized(deviceId: string): boolean {
    return this.encoders.has(deviceId) && this.decoders.has(deviceId);
  }

  /**
   * 获取设备的编码器
   * 
   * @param deviceId - 设备ID
   * @returns 编码器实例
   */
  getEncoder(deviceId: string): any {
    return this.encoders.get(deviceId);
  }

  /**
   * 获取设备的解码器
   * 
   * @param deviceId - 设备ID
   * @returns 解码器实例
   */
  getDecoder(deviceId: string): any {
    return this.decoders.get(deviceId);
  }

  /**
   * 清理设备的编解码器资源
   * 
   * @param deviceId - 设备ID
   */
  cleanup(deviceId: string): void {
    const encoder = this.encoders.get(deviceId);
    const decoder = this.decoders.get(deviceId);

    if (encoder) {
      try {
        // 如果有销毁方法则调用
        if (typeof encoder.destroy === 'function') {
          encoder.destroy();
        } else if (typeof encoder.close === 'function') {
          encoder.close();
        }
      } catch (error) {
        this.logger.warn(`Error cleaning up encoder for device ${deviceId}:`, error);
      }
      this.encoders.delete(deviceId);
    }

    if (decoder) {
      try {
        if (typeof decoder.destroy === 'function') {
          decoder.destroy();
        } else if (typeof decoder.close === 'function') {
          decoder.close();
        }
      } catch (error) {
        this.logger.warn(`Error cleaning up decoder for device ${deviceId}:`, error);
      }
      this.decoders.delete(deviceId);
    }

    this.logger.log(`Opus codec cleaned up for device ${deviceId}`);
  }

  /**
   * 清理所有资源
   */
  cleanupAll(): void {
    const deviceIds = Array.from(this.encoders.keys());
    deviceIds.forEach(deviceId => this.cleanup(deviceId));
    this.logger.log('All Opus codecs cleaned up');
  }

  /**
   * 获取统计信息
   * 
   * @returns 编解码器统计
   */
  getStats(): { initializedDevices: number; encoderCount: number; decoderCount: number } {
    return {
      initializedDevices: this.encoders.size,
      encoderCount: this.encoders.size,
      decoderCount: this.decoders.size,
    };
  }
}
