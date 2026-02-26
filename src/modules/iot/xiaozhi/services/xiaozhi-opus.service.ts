import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventBusService } from '../../../../common/events/event-bus.service';

// Opus 编码器类型
interface OpusEncoderInstance {
  encode(buffer: Buffer): Buffer;
  decode(buffer: Buffer): Buffer;
  destroy?(): void;
  close?(): void;
}

// Opus 编码器构造函数
interface OpusEncoderConstructor {
  new(sampleRate: number, channels: number): OpusEncoderInstance;
}

let OpusEncoder: OpusEncoderConstructor | null = null;
let opusLibraryName: string | null = null;

// 尝试加载 Opus 库
try {
  const opus = require('@discordjs/opus');
  OpusEncoder = opus.OpusEncoder;
  opusLibraryName = '@discordjs/opus';
  Logger.log('Using @discordjs/opus for audio encoding', 'XiaozhiOpus');
} catch (error) {
  Logger.warn('@discordjs/opus not available, falling back to opusscript', 'XiaozhiOpus');
  try {
    const opusscript = require('opusscript');
    // opusscript 的 API 不同，需要包装
    OpusEncoder = class OpusScriptWrapper implements OpusEncoderInstance {
      private encoder: any;
      constructor(sampleRate: number, channels: number) {
        this.encoder = new opusscript(sampleRate, channels, opusscript.Application.AUDIO);
      }
      encode(buffer: Buffer): Buffer {
        return this.encoder.encode(buffer, 960);
      }
      decode(buffer: Buffer): Buffer {
        return this.encoder.decode(buffer);
      }
      destroy(): void {
        this.encoder.delete();
      }
    };
    opusLibraryName = 'opusscript';
    Logger.log('Using opusscript for audio encoding', 'XiaozhiOpus');
  } catch (e) {
    Logger.error('No Opus library available', '', 'XiaozhiOpus');
  }
}

@Injectable()
export class XiaozhiOpusService implements OnModuleDestroy {
  private readonly logger = new Logger(XiaozhiOpusService.name);

  private encoders = new Map<string, OpusEncoderInstance>();
  private decoders = new Map<string, OpusEncoderInstance>();

  private readonly DEFAULT_SAMPLE_RATE = 16000;
  private readonly DEFAULT_CHANNELS = 1;
  private readonly DEFAULT_FRAME_SIZE = 960;

  // 使用计数器，用于统计编码/解码操作
  private encodeCount = new Map<string, number>();
  private decodeCount = new Map<string, number>();
  private errorCount = new Map<string, number>();

  constructor(
    private readonly eventBus: EventBusService,
  ) {
    if (!OpusEncoder) {
      this.logger.error(
        'No Opus encoder available. Audio compression features will be disabled. ' +
        'To enable audio features, please install one of the following packages:\n' +
        '  - npm install @discordjs/opus (recommended, requires Python and build tools)\n' +
        '  - npm install opusscript (pure JavaScript, slower but easier to install)'
      );
    } else {
      this.logger.log(`Opus service initialized with ${opusLibraryName}`);
    }
  }

  /**
   * 模块销毁时清理所有资源
   */
  onModuleDestroy(): void {
    this.cleanupAll();
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
    // 检查 Opus 库是否可用
    if (!OpusEncoder) {
      throw new Error('Opus encoder not available. Please install @discordjs/opus or opusscript.');
    }

    const encoder = this.encoders.get(deviceId);
    if (!encoder) {
      throw new Error(`Opus encoder not found for device ${deviceId}. Call initialize() first.`);
    }

    // 检查输入数据
    if (!pcmData || pcmData.length === 0) {
      this.logger.warn(`Empty PCM data provided for device ${deviceId}`);
      return Buffer.alloc(0);
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
      
      // 更新统计
      this.encodeCount.set(deviceId, (this.encodeCount.get(deviceId) || 0) + 1);
      
      return encoded;
    } catch (error) {
      this.errorCount.set(deviceId, (this.errorCount.get(deviceId) || 0) + 1);
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
    // 检查 Opus 库是否可用
    if (!OpusEncoder) {
      throw new Error('Opus decoder not available. Please install @discordjs/opus or opusscript.');
    }

    const decoder = this.decoders.get(deviceId);
    if (!decoder) {
      throw new Error(`Opus decoder not found for device ${deviceId}. Call initialize() first.`);
    }

    // 检查输入数据
    if (!opusData || opusData.length === 0) {
      this.logger.warn(`Empty Opus data provided for device ${deviceId}`);
      return Buffer.alloc(0);
    }

    try {
      const decoded = decoder.decode(opusData);
      
      // 更新统计
      this.decodeCount.set(deviceId, (this.decodeCount.get(deviceId) || 0) + 1);
      
      return decoded;
    } catch (error) {
      this.errorCount.set(deviceId, (this.errorCount.get(deviceId) || 0) + 1);
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

    // 清理统计信息
    this.encodeCount.delete(deviceId);
    this.decodeCount.delete(deviceId);
    this.errorCount.delete(deviceId);

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
  getStats(): { 
    initializedDevices: number; 
    encoderCount: number; 
    decoderCount: number;
    libraryName: string | null;
    deviceStats: Array<{
      deviceId: string;
      encodeCount: number;
      decodeCount: number;
      errorCount: number;
    }>;
  } {
    const deviceStats = Array.from(this.encoders.keys()).map(deviceId => ({
      deviceId,
      encodeCount: this.encodeCount.get(deviceId) || 0,
      decodeCount: this.decodeCount.get(deviceId) || 0,
      errorCount: this.errorCount.get(deviceId) || 0,
    }));

    return {
      initializedDevices: this.encoders.size,
      encoderCount: this.encoders.size,
      decoderCount: this.decoders.size,
      libraryName: opusLibraryName,
      deviceStats,
    };
  }

  /**
   * 检查 Opus 库是否可用
   * 
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return OpusEncoder !== null;
  }

  /**
   * 获取当前使用的 Opus 库名称
   * 
   * @returns 库名称
   */
  getLibraryName(): string | null {
    return opusLibraryName;
  }
}
