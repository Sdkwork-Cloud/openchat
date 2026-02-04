/**
 * 小智音频处理服务
 * 负责处理音频数据的接收和发送
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceConnection, BinaryProtocolVersion } from '../xiaozhi.types';
import { EventBusService, EventType, EventPriority } from '../../../common/events/event-bus.service';
import * as crypto from 'crypto';
import * as dgram from 'dgram';

/**
 * 音频缓存配置接口
 */
interface AudioCacheConfig {
  maxCacheSize: number;
  batchSize: number;
  flushInterval: number;
}

/**
 * 音频流状态接口
 */
interface AudioStreamState {
  deviceId: string;
  sessionId: string;
  isStreaming: boolean;
  lastActivity: number;
  cache: Buffer[];
  cacheSize: number;
  packetCount: number;
  byteCount: number;
  lastVoiceActivity: number;
  silenceDuration: number;
  audioLevel: number;
}

/**
 * 音频质量统计接口
 */
interface AudioQualityStats {
  deviceId: string;
  packetLoss: number;
  averageLatency: number;
  jitter: number;
  timestamp: number;
  averageLevel: number;
  voiceActivityRatio: number;
  noiseLevel: number;
}

/**
 * 音频处理配置接口
 */
interface AudioProcessingConfig {
  enableNoiseReduction: boolean;
  enableVoiceActivityDetection: boolean;
  enableAutomaticGainControl: boolean;
  silenceThreshold: number;
  voiceActivityTimeout: number;
  minSilenceDuration: number;
  maxSilenceDuration: number;
}

@Injectable()
export class XiaoZhiAudioService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XiaoZhiAudioService.name);
  private readonly audioStreams = new Map<string, AudioStreamState>();
  private readonly audioQuality = new Map<string, AudioQualityStats>();
  private readonly cacheConfig: AudioCacheConfig;
  private readonly processingConfig: AudioProcessingConfig;
  private flushIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private eventBusService: EventBusService,
    private configService: ConfigService
  ) {
    // 音频缓存配置
    this.cacheConfig = {
      maxCacheSize: 10 * 1024 * 1024, // 10MB
      batchSize: 4096, // 4KB
      flushInterval: 100, // 100ms
    };

    // 音频处理配置
    this.processingConfig = {
      enableNoiseReduction: this.configService.get<boolean>('XIAOZHI_ENABLE_NOISE_REDUCTION') || true,
      enableVoiceActivityDetection: this.configService.get<boolean>('XIAOZHI_ENABLE_VAD') || true,
      enableAutomaticGainControl: this.configService.get<boolean>('XIAOZHI_ENABLE_AGC') || true,
      silenceThreshold: this.configService.get<number>('XIAOZHI_SILENCE_THRESHOLD') || 0.02,
      voiceActivityTimeout: this.configService.get<number>('XIAOZHI_VOICE_TIMEOUT') || 3000,
      minSilenceDuration: this.configService.get<number>('XIAOZHI_MIN_SILENCE') || 200,
      maxSilenceDuration: this.configService.get<number>('XIAOZHI_MAX_SILENCE') || 3000,
    };
  }

  async onModuleInit() {
    this.logger.log('Audio service initialized with caching and batching');
  }

  async onModuleDestroy() {
    // 清理所有定时器
    this.flushIntervals.forEach(interval => clearInterval(interval));
    this.flushIntervals.clear();
    // 清理所有音频流
    this.audioStreams.clear();
    this.logger.log('Audio service destroyed, all resources cleaned up');
  }

  /**
   * 处理二进制音频数据
   */
  handleBinaryAudio(deviceId: string, connection: DeviceConnection, data: Buffer): void {
    this.logger.debug(`Received binary audio data from device ${deviceId}, size: ${data.length}`);

    try {
      // 根据二进制协议版本处理
      switch (connection.binaryProtocolVersion) {
        case BinaryProtocolVersion.V1:
          // 直接处理Opus数据
          this.processAudioData(deviceId, connection, data);
          break;
        case BinaryProtocolVersion.V2:
          // 处理V2格式
          this.processBinaryProtocolV2(deviceId, connection, data);
          break;
        case BinaryProtocolVersion.V3:
          // 处理V3格式
          this.processBinaryProtocolV3(deviceId, connection, data);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to handle binary audio for device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventType.SYSTEM_ERROR,
        {
          deviceId,
          error: error.message,
          type: 'audio'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiAudioService',
        }
      );
    }
  }

  /**
   * 处理二进制协议V2
   */
  private processBinaryProtocolV2(deviceId: string, connection: DeviceConnection, data: Buffer): void {
    if (data.length < 16) {
      this.logger.error(`Invalid BinaryProtocolV2 data size from device ${deviceId}`);
      this.updateAudioQuality(deviceId, true);
      return;
    }

    const version = data.readUInt16BE(0);
    const type = data.readUInt16BE(2);
    const timestamp = data.readUInt32BE(8);
    const payloadSize = data.readUInt32BE(12);
    const payload = data.slice(16, 16 + payloadSize);

    this.logger.debug(`BinaryProtocolV2 from device ${deviceId}: version=${version}, type=${type}, timestamp=${timestamp}, payloadSize=${payloadSize}`);
    this.processAudioData(deviceId, connection, payload);
  }

  /**
   * 处理二进制协议V3
   */
  private processBinaryProtocolV3(deviceId: string, connection: DeviceConnection, data: Buffer): void {
    if (data.length < 4) {
      this.logger.error(`Invalid BinaryProtocolV3 data size from device ${deviceId}`);
      this.updateAudioQuality(deviceId, true);
      return;
    }

    const type = data.readUInt8(0);
    const payloadSize = data.readUInt16BE(2);
    const payload = data.slice(4, 4 + payloadSize);

    this.logger.debug(`BinaryProtocolV3 from device ${deviceId}: type=${type}, payloadSize=${payloadSize}`);
    this.processAudioData(deviceId, connection, payload);
  }

  /**
   * 处理音频数据
   */
  private processAudioData(deviceId: string, connection: DeviceConnection, audioData: Buffer): void {
    // 获取或创建音频流状态
    const streamKey = `${deviceId}:${connection.sessionId}`;
    let streamState = this.audioStreams.get(streamKey);
    
    if (!streamState) {
      streamState = {
        deviceId,
        sessionId: connection.sessionId,
        isStreaming: true,
        lastActivity: Date.now(),
        cache: [],
        cacheSize: 0,
        packetCount: 0,
        byteCount: 0,
        lastVoiceActivity: Date.now(),
        silenceDuration: 0,
        audioLevel: 0,
      };
      this.audioStreams.set(streamKey, streamState);
      
      // 启动定时刷新
      this.startFlushInterval(streamKey, streamState);
      
      // 发布音频流开始事件
      this.eventBusService.publish(
        EventType.AUDIO_STREAM_STARTED,
        {
          deviceId,
          sessionId: connection.sessionId,
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiAudioService',
        }
      );
    }

    // 更新流状态
    const now = Date.now();
    streamState.lastActivity = now;
    streamState.packetCount++;
    streamState.byteCount += audioData.length;

    // 音频处理
    let processedData = audioData;

    // 计算音频电平
    const audioLevel = this.calculateAudioLevel(audioData);
    streamState.audioLevel = audioLevel;

    // 自动增益控制
    if (this.processingConfig.enableAutomaticGainControl) {
      processedData = this.applyAutomaticGainControl(processedData, audioLevel);
    }

    // 降噪处理
    if (this.processingConfig.enableNoiseReduction) {
      processedData = this.applyNoiseReduction(processedData);
    }

    // 语音活动检测
    if (this.processingConfig.enableVoiceActivityDetection) {
      const isVoice = this.detectVoiceActivity(processedData, audioLevel);
      
      if (isVoice) {
        streamState.lastVoiceActivity = now;
        streamState.silenceDuration = 0;
        
        // 发布语音活动开始事件
        if (streamState.silenceDuration > this.processingConfig.minSilenceDuration) {
          this.eventBusService.publish(
            EventType.VOICE_ACTIVITY_STARTED,
            {
              deviceId,
              sessionId: connection.sessionId,
              timestamp: now,
              audioLevel,
            },
            {
              priority: EventPriority.MEDIUM,
              source: 'XiaoZhiAudioService',
            }
          );
        }
      } else {
        streamState.silenceDuration += 10; // 假设10ms的音频帧
        
        // 检查是否超过最大静音时长
        if (streamState.silenceDuration > this.processingConfig.maxSilenceDuration) {
          // 发布语音活动结束事件
          this.eventBusService.publish(
            EventType.VOICE_ACTIVITY_ENDED,
            {
              deviceId,
              sessionId: connection.sessionId,
              timestamp: now,
              silenceDuration: streamState.silenceDuration,
            },
            {
              priority: EventPriority.MEDIUM,
              source: 'XiaoZhiAudioService',
            }
          );
          
          // 刷新缓存，确保语音片段被及时处理
          this.flushAudioCache(streamKey, streamState, connection);
        }
      }
    }

    // 添加到缓存
    streamState.cache.push(processedData);
    streamState.cacheSize += processedData.length;

    // 检查是否需要立即刷新
    if (streamState.cacheSize >= this.cacheConfig.batchSize) {
      this.flushAudioCache(streamKey, streamState, connection);
    }

    // 更新音频质量统计
    this.updateAudioQuality(deviceId, false, audioLevel);

    this.logger.debug(`Processing audio data from device ${deviceId}, size: ${processedData.length}, cache size: ${streamState.cacheSize}, level: ${audioLevel.toFixed(3)}`);
  }

  /**
   * 计算音频电平
   */
  private calculateAudioLevel(audioData: Buffer): number {
    // 简单的电平计算：计算RMS值
    let sum = 0;
    for (let i = 0; i < audioData.length; i += 2) {
      const sample = audioData.readInt16LE(i);
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / (audioData.length / 2));
    const level = Math.min(rms / 32768, 1); // 归一化到0-1
    return level;
  }

  /**
   * 应用自动增益控制
   */
  private applyAutomaticGainControl(audioData: Buffer, level: number): Buffer {
    // 简单的自动增益控制：调整增益使电平保持在目标水平
    const targetLevel = 0.3; // 目标电平
    const gain = Math.min(targetLevel / (level || 0.01), 10); // 最大增益10倍
    
    const output = Buffer.alloc(audioData.length);
    for (let i = 0; i < audioData.length; i += 2) {
      const sample = audioData.readInt16LE(i);
      const amplified = Math.max(-32768, Math.min(32767, Math.round(sample * gain)));
      output.writeInt16LE(amplified, i);
    }
    
    return output;
  }

  /**
   * 应用降噪处理
   */
  private applyNoiseReduction(audioData: Buffer): Buffer {
    // 简单的降噪处理：基于阈值的噪声门
    const threshold = 0.05; // 噪声阈值
    
    const output = Buffer.alloc(audioData.length);
    for (let i = 0; i < audioData.length; i += 2) {
      const sample = audioData.readInt16LE(i);
      const level = Math.abs(sample) / 32768;
      
      if (level < threshold) {
        // 低于阈值的视为噪声，衰减
        const reduced = Math.round(sample * 0.2); // 衰减80%
        output.writeInt16LE(reduced, i);
      } else {
        // 保留语音信号
        output.writeInt16LE(sample, i);
      }
    }
    
    return output;
  }

  /**
   * 检测语音活动
   */
  private detectVoiceActivity(audioData: Buffer, level: number): boolean {
    // 基于电平的语音活动检测
    return level > this.processingConfig.silenceThreshold;
  }

  /**
   * 发送音频数据到设备
   */
  sendAudioData(deviceId: string, connection: DeviceConnection, audioData: Buffer): void {
    try {
      let sent = false;
      
      if (connection.transport === 'websocket') {
        // 通过WebSocket发送
        if (connection.websocket && connection.websocket.readyState === connection.websocket.OPEN) {
          connection.websocket.send(audioData);
          sent = true;
          this.logger.debug(`Sent audio data via WebSocket to device ${deviceId}, size: ${audioData.length}`);
        } else {
          this.logger.warn(`WebSocket not available for device ${deviceId}, readyState: ${connection.websocket?.readyState}`);
        }
      } else if (connection.transport === 'udp') {
        // 通过UDP发送（加密）
        if (connection.udpSocket && connection.udpInfo) {
          this.sendEncryptedUdpAudio(deviceId, connection, audioData);
          sent = true;
        } else {
          // 尝试创建UDP连接
          this.logger.warn(`UDP connection not available for device ${deviceId}, creating new connection`);
          this.createUdpConnection(deviceId, connection);
        }
      }

      // 发布事件
      this.eventBusService.publish(
        EventType.AUDIO_DATA_SENT,
        {
          deviceId,
          sessionId: connection.sessionId,
          size: audioData.length,
          sent,
          transport: connection.transport
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiAudioService',
        }
      );

      if (!sent) {
        this.logger.warn(`Failed to send audio data to device ${deviceId}, no available transport`);
      }
    } catch (error) {
      this.logger.error(`Failed to send audio data to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventType.SYSTEM_ERROR,
        {
          deviceId,
          error: error.message,
          type: 'audio',
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiAudioService',
        }
      );
    }
  }

  /**
   * 发送加密的UDP音频数据
   */
  private sendEncryptedUdpAudio(deviceId: string, connection: DeviceConnection, audioData: Buffer): void {
    if (!connection.udpSocket || !connection.udpInfo) {
      return;
    }

    try {
      // 生成加密密钥
      const key = Buffer.from(connection.udpInfo.key, 'hex');
      const nonce = Buffer.from(connection.udpInfo.nonce, 'hex');
      
      // 这里可以实现UDP音频数据的加密和发送
      // 使用AES-CTR加密
      const encryptedData = this.encryptAudioData(audioData, key, nonce);
      
      // 发送加密数据
      connection.udpSocket.send(
        encryptedData,
        connection.udpInfo.port,
        connection.udpInfo.server,
        (error) => {
          if (error) {
            this.logger.error(`Failed to send UDP audio to device ${deviceId}:`, error);
            this.updateAudioQuality(deviceId, true);
          }
        }
      );

      this.logger.debug(`Sending encrypted UDP audio to device ${deviceId}, size: ${encryptedData.length}`);
    } catch (error) {
      this.logger.error(`Failed to encrypt UDP audio for device ${deviceId}:`, error);
      this.updateAudioQuality(deviceId, true);
    }
  }

  /**
   * 加密音频数据
   */
  private encryptAudioData(data: Buffer, key: Buffer, nonce: Buffer): Buffer {
    // 这里实现简单的加密逻辑
    // 实际应用中应该使用更安全的加密算法
    const cipher = crypto.createCipheriv('aes-128-ctr', key, nonce);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return encrypted;
  }

  /**
   * 创建UDP连接
   */
  private createUdpConnection(deviceId: string, connection: DeviceConnection): void {
    if (!connection.udpInfo) {
      return;
    }

    try {
      // 创建UDP socket
      const udpSocket = dgram.createSocket('udp4');
      connection.udpSocket = udpSocket;

      // 错误处理
      udpSocket.on('error', (error) => {
        this.logger.error(`UDP socket error for device ${deviceId}:`, error);
        this.eventBusService.publish(
          EventType.SYSTEM_ERROR,
          {
            deviceId,
            error: error.message,
            type: 'udp'
          },
          {
            priority: EventPriority.HIGH,
            source: 'XiaoZhiAudioService',
          }
        );
      });

      // 消息接收
      udpSocket.on('message', (message) => {
        this.logger.debug(`Received UDP message from device ${deviceId}, size: ${message.length}`);
      });

      this.logger.log(`Created UDP socket for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to create UDP socket for device ${deviceId}:`, error);
    }
  }

  /**
   * 启动定时刷新
   */
  private startFlushInterval(streamKey: string, streamState: AudioStreamState): void {
    const interval = setInterval(() => {
      // 检查流是否活跃
      const now = Date.now();
      if (now - streamState.lastActivity > 30000) { // 30秒无活动
        this.stopAudioStream(streamKey, streamState);
        return;
      }

      // 刷新缓存 - 直接发布事件，让其他服务处理
      if (streamState.cacheSize > 0) {
        this.eventBusService.publish(
          EventType.AUDIO_CACHE_FLUSH_REQUEST,
          {
            deviceId: streamState.deviceId,
            sessionId: streamState.sessionId,
            cacheSize: streamState.cacheSize
          },
          {
            priority: EventPriority.MEDIUM,
            source: 'XiaoZhiAudioService',
          }
        );
      }
    }, this.cacheConfig.flushInterval);

    this.flushIntervals.set(streamKey, interval);
  }

  /**
   * 刷新音频缓存
   */
  private flushAudioCache(streamKey: string, streamState: AudioStreamState, connection: DeviceConnection): void {
    if (streamState.cacheSize === 0) {
      return;
    }

    // 合并缓存的音频数据
    const audioData = Buffer.concat(streamState.cache);

    // 发布音频数据事件
    this.eventBusService.publish(
      EventType.AUDIO_DATA_RECEIVED,
      {
        deviceId: streamState.deviceId,
        sessionId: streamState.sessionId,
        audioData,
        format: connection.audioParams.format,
        sampleRate: connection.audioParams.sample_rate,
        packetCount: streamState.packetCount,
        byteCount: streamState.byteCount,
      },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiAudioService',
      }
    );

    // 清空缓存
    streamState.cache = [];
    streamState.cacheSize = 0;
    streamState.packetCount = 0;
    streamState.byteCount = 0;

    this.logger.debug(`Flushed audio cache for device ${streamState.deviceId}, size: ${audioData.length}`);
  }

  /**
   * 停止音频流
   */
  private stopAudioStream(streamKey: string, streamState: AudioStreamState): void {
    try {
      // 清理定时器
      const interval = this.flushIntervals.get(streamKey);
      if (interval) {
        clearInterval(interval);
        this.flushIntervals.delete(streamKey);
        this.logger.debug(`Cleared flush interval for stream ${streamKey}`);
      }

      // 发布音频流停止事件
      this.eventBusService.publish(
        EventType.AUDIO_STREAM_STOPPED,
        {
          deviceId: streamState.deviceId,
          sessionId: streamState.sessionId,
          totalPackets: streamState.packetCount,
          totalBytes: streamState.byteCount,
          duration: Date.now() - streamState.lastActivity,
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiAudioService',
        }
      );

      // 移除流状态
      this.audioStreams.delete(streamKey);
      this.logger.log(`Stopped audio stream for device ${streamState.deviceId}, session: ${streamState.sessionId}, packets: ${streamState.packetCount}, bytes: ${streamState.byteCount}`);

      // 清理相关的音频质量统计
      if (!Array.from(this.audioStreams.values()).some(s => s.deviceId === streamState.deviceId)) {
        this.audioQuality.delete(streamState.deviceId);
        this.logger.debug(`Cleaned up audio quality stats for device ${streamState.deviceId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to stop audio stream ${streamKey}:`, error);
      // 即使出错也要确保资源被清理
      this.flushIntervals.delete(streamKey);
      this.audioStreams.delete(streamKey);
    }
  }

  /**
   * 查找设备连接
   */
  private findConnection(deviceId: string, sessionId: string): any {
    // 这里需要从连接管理服务中查找连接
    // 实际应用中应该注入连接管理服务
    return null;
  }

  /**
   * 更新音频质量统计
   */
  private updateAudioQuality(deviceId: string, isPacketLost: boolean = false, audioLevel: number = 0): void {
    let stats = this.audioQuality.get(deviceId);
    if (!stats) {
      stats = {
        deviceId,
        packetLoss: 0,
        averageLatency: 0,
        jitter: 0,
        timestamp: Date.now(),
        averageLevel: 0,
        voiceActivityRatio: 0,
        noiseLevel: 0,
      };
    }

    // 更新丢包率
    if (isPacketLost) {
      stats.packetLoss = (stats.packetLoss * 0.9) + 0.1; // 指数加权平均
    } else {
      stats.packetLoss = stats.packetLoss * 0.9;
    }

    // 更新平均音频电平
    stats.averageLevel = (stats.averageLevel * 0.9) + (audioLevel * 0.1);

    // 估计噪声电平（当音频电平较低时）
    if (audioLevel < this.processingConfig.silenceThreshold) {
      stats.noiseLevel = (stats.noiseLevel * 0.9) + (audioLevel * 0.1);
    }

    // 计算语音活动比率
    const streamState = Array.from(this.audioStreams.values()).find(s => s.deviceId === deviceId);
    if (streamState) {
      const totalDuration = Date.now() - streamState.lastActivity + streamState.silenceDuration;
      const voiceDuration = totalDuration - streamState.silenceDuration;
      stats.voiceActivityRatio = voiceDuration / totalDuration;
    }

    stats.timestamp = Date.now();
    this.audioQuality.set(deviceId, stats);
  }

  /**
   * 获取音频流状态
   */
  getAudioStreamState(deviceId: string, sessionId: string): AudioStreamState | null {
    const streamKey = `${deviceId}:${sessionId}`;
    return this.audioStreams.get(streamKey) || null;
  }

  /**
   * 获取音频质量统计
   */
  getAudioQualityStats(deviceId: string): AudioQualityStats | null {
    return this.audioQuality.get(deviceId) || null;
  }

  /**
   * 获取所有音频流状态
   */
  getAllAudioStreams(): Map<string, AudioStreamState> {
    return this.audioStreams;
  }

  /**
   * 停止所有音频流
   */
  stopAllAudioStreams(): void {
    const streamKeys = Array.from(this.audioStreams.keys());
    for (const streamKey of streamKeys) {
      const streamState = this.audioStreams.get(streamKey);
      if (streamState) {
        this.stopAudioStream(streamKey, streamState);
      }
    }
  }
}

