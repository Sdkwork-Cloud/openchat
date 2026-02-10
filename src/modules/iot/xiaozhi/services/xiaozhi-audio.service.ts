/**
 * 小智音频处理服务
 * 负责处理音频数据的接收和发送
 * 
 * 功能：
 * - 接收设备音频数据（Opus 格式）
 * - 解码 Opus 到 PCM
 * - 音频处理：降噪、AGC、VAD
 * - 编码 PCM 到 Opus（发送给设备）
 * - 支持 WebSocket 和 UDP 传输
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceConnection, BinaryProtocolVersion } from '../xiaozhi.types';
import { EventBusService, EventType, EventPriority } from '../../../../common/events/event-bus.service';
import { XiaozhiOpusService } from './xiaozhi-opus.service';
import { XiaozhiAudioProcessingService, AudioProcessingConfig } from './xiaozhi-audio-processing.service';
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

  // 性能监控
  private performanceMetrics = {
    totalProcessedPackets: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    maxProcessingTime: 0,
    errors: 0,
  };

  // 音频缓冲池（减少内存分配）
  private bufferPool: Buffer[] = [];
  private readonly MAX_POOL_SIZE = 100;

  constructor(
    private eventBusService: EventBusService,
    private configService: ConfigService,
    private opusService: XiaozhiOpusService,
    private audioProcessingService: XiaozhiAudioProcessingService,
  ) {
    // 音频缓存配置
    this.cacheConfig = {
      maxCacheSize: this.configService.get<number>('XIAOZHI_MAX_CACHE_SIZE') ?? 10 * 1024 * 1024, // 10MB
      batchSize: this.configService.get<number>('XIAOZHI_BATCH_SIZE') ?? 4096, // 4KB
      flushInterval: this.configService.get<number>('XIAOZHI_FLUSH_INTERVAL') ?? 100, // 100ms
    };

    // 音频处理配置
    this.processingConfig = {
      enableNoiseReduction: this.configService.get<boolean>('XIAOZHI_ENABLE_NOISE_REDUCTION') ?? true,
      enableVoiceActivityDetection: this.configService.get<boolean>('XIAOZHI_ENABLE_VAD') ?? true,
      enableAutomaticGainControl: this.configService.get<boolean>('XIAOZHI_ENABLE_AGC') ?? true,
      silenceThreshold: this.configService.get<number>('XIAOZHI_SILENCE_THRESHOLD') ?? 0.02,
      voiceActivityTimeout: this.configService.get<number>('XIAOZHI_VOICE_TIMEOUT') ?? 3000,
      minSilenceDuration: this.configService.get<number>('XIAOZHI_MIN_SILENCE') ?? 200,
      maxSilenceDuration: this.configService.get<number>('XIAOZHI_MAX_SILENCE') ?? 3000,
      targetLevel: this.configService.get<number>('XIAOZHI_TARGET_LEVEL') ?? 0.3,
      maxGain: this.configService.get<number>('XIAOZHI_MAX_GAIN') ?? 10.0,
      minGain: this.configService.get<number>('XIAOZHI_MIN_GAIN') ?? 0.1,
      vadMode: (this.configService.get<string>('XIAOZHI_VAD_MODE') as any) ?? 'NORMAL',
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
   * 处理音频数据（完整流程）
   * 
   * 处理流程：
   * 1. 解析二进制协议获取 Opus 数据
   * 2. Opus 解码为 PCM
   * 3. 音频处理（降噪、AGC、VAD）
   * 4. 发布音频数据事件（供 STT 服务消费）
   * 5. 缓存处理
   */
  private processAudioData(deviceId: string, connection: DeviceConnection, audioData: Buffer): void {
    const startTime = Date.now();
    
    // 获取或创建音频流状态
    const streamKey = `${deviceId}:${connection.sessionId}`;
    let streamState = this.audioStreams.get(streamKey);
    
    if (!streamState) {
      streamState = this.createStreamState(deviceId, connection);
      this.audioStreams.set(streamKey, streamState);
      
      // 初始化 Opus 编解码器
      this.opusService.initialize(
        deviceId, 
        connection.audioParams.sample_rate, 
        connection.audioParams.channels
      );
      
      // 初始化音频处理
      this.audioProcessingService.initialize(deviceId, this.processingConfig);
      
      // 启动定时刷新
      this.startFlushInterval(streamKey, streamState);
      
      // 发布音频流开始事件
      this.eventBusService.publish(
        EventType.AUDIO_STREAM_STARTED,
        {
          deviceId,
          sessionId: connection.sessionId,
          sampleRate: connection.audioParams.sample_rate,
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

    try {
      // 1. Opus 解码为 PCM
      const pcmData = this.opusService.decode(deviceId, audioData);
      
      if (pcmData.length === 0) {
        this.logger.warn(`Decoded PCM data is empty for device ${deviceId}`);
        return;
      }

      // 2. 音频处理（降噪、AGC、VAD）
      const processingResult = this.audioProcessingService.processAudio(deviceId, pcmData);
      
      if (!processingResult.hasVoice) {
        this.logger.debug(`Silence detected for device ${deviceId}, skipping`);
        streamState.silenceDuration += 60; // 60ms 帧
        
        // 检查是否超过最大静音时长
        if (streamState.silenceDuration > this.processingConfig.maxSilenceDuration) {
          this.handleSilenceTimeout(deviceId, connection, streamState, now);
        }
        return;
      }

      // 有语音，更新状态
      streamState.lastVoiceActivity = now;
      streamState.silenceDuration = 0;
      streamState.audioLevel = processingResult.voiceLevel;

      // 3. 发布音频数据事件（供 STT 服务消费）
      this.eventBusService.publish(
        EventType.AUDIO_DATA_RECEIVED,
        {
          deviceId,
          sessionId: connection.sessionId,
          pcmData: processingResult.processed,
          sampleRate: connection.audioParams.sample_rate,
          channels: connection.audioParams.channels,
          timestamp: now,
          metadata: {
            noiseLevel: processingResult.noiseLevel,
            voiceLevel: processingResult.voiceLevel,
            appliedGain: processingResult.appliedGain,
            processingTime: Date.now() - startTime,
          },
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiAudioService',
        }
      );

      // 4. 重新编码为 Opus（用于缓存或转发）
      const processedOpus = this.opusService.encode(deviceId, processingResult.processed);

      // 5. 添加到缓存
      streamState.cache.push(processedOpus);
      streamState.cacheSize += processedOpus.length;

      // 检查是否需要立即刷新
      if (streamState.cacheSize >= this.cacheConfig.batchSize) {
        this.flushAudioCache(streamKey, streamState, connection);
      }

      // 更新音频质量统计
      this.updateAudioQuality(deviceId, false, processingResult.voiceLevel);

      this.logger.debug(
        `Audio processed for device ${deviceId}, ` +
        `opus: ${audioData.length}B -> pcm: ${pcmData.length}B -> processed: ${processedOpus.length}B, ` +
        `level: ${processingResult.voiceLevel.toFixed(3)}, gain: ${processingResult.appliedGain.toFixed(2)}, ` +
        `time: ${Date.now() - startTime}ms`
      );
    } catch (error) {
      this.logger.error(`Audio processing failed for device ${deviceId}:`, error);
      this.updateAudioQuality(deviceId, true);
      this.updatePerformanceMetrics(Date.now() - startTime, true);
    }
  }

  /**
   * 创建音频流状态
   */
  private createStreamState(deviceId: string, connection: DeviceConnection): AudioStreamState {
    return {
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
  }

  /**
   * 处理静音超时
   */
  private handleSilenceTimeout(
    deviceId: string, 
    connection: DeviceConnection, 
    streamState: AudioStreamState, 
    now: number
  ): void {
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
    
    // 刷新缓存
    this.flushAudioCache(`${deviceId}:${connection.sessionId}`, streamState, connection);
  }

  /**
   * 发送音频数据到设备（TTS 音频）
   * 
   * 流程：
   * 1. 将 PCM 音频编码为 Opus
   * 2. 构建二进制协议
   * 3. 发送到设备
   */
  async sendAudioData(deviceId: string, connection: DeviceConnection, pcmData: Buffer): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 1. 确保 Opus 编码器已初始化
      if (!this.opusService.isInitialized(deviceId)) {
        this.opusService.initialize(
          deviceId,
          connection.audioParams.sample_rate,
          connection.audioParams.channels
        );
      }

      // 2. PCM 编码为 Opus
      const opusData = this.opusService.encode(deviceId, pcmData);
      
      if (opusData.length === 0) {
        this.logger.warn(`Encoded Opus data is empty for device ${deviceId}`);
        return;
      }

      // 3. 构建二进制协议
      const binaryData = this.buildBinaryProtocol(
        opusData,
        connection.binaryProtocolVersion,
        Date.now()
      );

      // 4. 发送音频数据
      let sent = false;
      
      if (connection.transport === 'websocket') {
        sent = await this.sendWebSocketAudio(deviceId, connection, binaryData);
      } else if (connection.transport === 'udp') {
        sent = await this.sendUdpAudio(deviceId, connection, binaryData);
      }

      // 5. 发布事件
      this.eventBusService.publish(
        EventType.AUDIO_DATA_SENT,
        {
          deviceId,
          sessionId: connection.sessionId,
          pcmSize: pcmData.length,
          opusSize: opusData.length,
          binarySize: binaryData.length,
          sent,
          transport: connection.transport,
          processingTime: Date.now() - startTime,
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiAudioService',
        }
      );

      if (!sent) {
        this.logger.warn(`Failed to send audio data to device ${deviceId}, no available transport`);
      } else {
        this.logger.debug(
          `Sent audio to device ${deviceId}: ` +
          `pcm=${pcmData.length}B -> opus=${opusData.length}B -> binary=${binaryData.length}B, ` +
          `time=${Date.now() - startTime}ms`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send audio data to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventType.SYSTEM_ERROR,
        {
          deviceId,
          error: error.message,
          type: 'audio_send',
          transport: connection.transport,
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiAudioService',
        }
      );
    }
  }

  /**
   * 构建二进制协议
   */
  private buildBinaryProtocol(
    opusData: Buffer,
    version: BinaryProtocolVersion,
    timestamp: number
  ): Buffer {
    switch (version) {
      case BinaryProtocolVersion.V1:
        // V1: 直接发送 Opus 数据
        return opusData;
        
      case BinaryProtocolVersion.V2:
        // V2: 带时间戳的协议
        // | version (2B) | type (2B) | reserved (4B) | timestamp (4B) | payload_size (4B) | payload |
        const v2Header = Buffer.alloc(16);
        v2Header.writeUInt16BE(2, 0);           // version
        v2Header.writeUInt16BE(0, 2);           // type (0 = opus)
        v2Header.writeUInt32BE(0, 4);           // reserved
        v2Header.writeUInt32BE(timestamp, 8);   // timestamp
        v2Header.writeUInt32BE(opusData.length, 12); // payload_size
        return Buffer.concat([v2Header, opusData]);
        
      case BinaryProtocolVersion.V3:
        // V3: 简化协议
        // | type (1B) | reserved (1B) | payload_size (2B) | payload |
        const v3Header = Buffer.alloc(4);
        v3Header.writeUInt8(0, 0);              // type (0 = opus)
        v3Header.writeUInt8(0, 1);              // reserved
        v3Header.writeUInt16BE(opusData.length, 2); // payload_size
        return Buffer.concat([v3Header, opusData]);
        
      default:
        return opusData;
    }
  }

  /**
   * 通过 WebSocket/Socket.io 发送音频
   */
  private async sendWebSocketAudio(
    deviceId: string,
    connection: DeviceConnection,
    audioData: Buffer
  ): Promise<boolean> {
    // 优先使用 Socket.io
    if (connection.socket) {
      return this.sendSocketIOAudio(deviceId, connection, audioData);
    }

    // 使用原生 WebSocket
    return new Promise((resolve) => {
      if (!connection.websocket || connection.websocket.readyState !== 1) { // WebSocket.OPEN = 1
        this.logger.warn(`WebSocket not available for device ${deviceId}, readyState: ${connection.websocket?.readyState}`);
        resolve(false);
        return;
      }

      connection.websocket.send(audioData, (error) => {
        if (error) {
          this.logger.error(`WebSocket send error for device ${deviceId}:`, error);
          this.updateAudioQuality(deviceId, true);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * 通过 Socket.io 发送音频
   */
  private async sendSocketIOAudio(
    deviceId: string,
    connection: DeviceConnection,
    audioData: Buffer
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!connection.socket || !connection.socket.connected) {
        this.logger.warn(`Socket.io not available for device ${deviceId}, connected: ${connection.socket?.connected}`);
        resolve(false);
        return;
      }

      connection.socket.emit('binary', audioData, (error: any) => {
        if (error) {
          this.logger.error(`Socket.io send error for device ${deviceId}:`, error);
          this.updateAudioQuality(deviceId, true);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * 通过 UDP 发送音频
   */
  private async sendUdpAudio(
    deviceId: string,
    connection: DeviceConnection,
    audioData: Buffer
  ): Promise<boolean> {
    if (!connection.udpSocket || !connection.udpInfo) {
      this.logger.warn(`UDP connection not available for device ${deviceId}`);
      return false;
    }

    try {
      // 加密音频数据
      const encryptedData = this.encryptAudioData(
        audioData,
        Buffer.from(connection.udpInfo.key, 'hex'),
        Buffer.from(connection.udpInfo.nonce, 'hex')
      );

      // 发送数据
      return new Promise((resolve) => {
        connection.udpSocket!.send(
          encryptedData,
          connection.udpInfo!.port,
          connection.udpInfo!.server,
          (error) => {
            if (error) {
              this.logger.error(`UDP send error for device ${deviceId}:`, error);
              this.updateAudioQuality(deviceId, true);
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      this.logger.error(`Failed to send UDP audio for device ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * 加密音频数据
   */
  private encryptAudioData(data: Buffer, key: Buffer, nonce: Buffer): Buffer {
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

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      activeStreams: this.audioStreams.size,
      bufferPoolSize: this.bufferPool.length,
    };
  }

  /**
   * 重置性能指标
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      totalProcessedPackets: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      errors: 0,
    };
  }

  /**
   * 从缓冲池获取 Buffer
   */
  private getBufferFromPool(size: number): Buffer {
    // 查找合适大小的 buffer
    const index = this.bufferPool.findIndex(b => b.length >= size);
    if (index !== -1) {
      return this.bufferPool.splice(index, 1)[0];
    }
    // 没有合适的，创建新的
    return Buffer.alloc(size);
  }

  /**
   * 归还 Buffer 到缓冲池
   */
  private returnBufferToPool(buffer: Buffer): void {
    if (this.bufferPool.length < this.MAX_POOL_SIZE) {
      // 清空 buffer 内容
      buffer.fill(0);
      this.bufferPool.push(buffer);
    }
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(processingTime: number, isError: boolean = false): void {
    this.performanceMetrics.totalProcessedPackets++;
    this.performanceMetrics.totalProcessingTime += processingTime;
    this.performanceMetrics.averageProcessingTime = 
      this.performanceMetrics.totalProcessingTime / this.performanceMetrics.totalProcessedPackets;
    this.performanceMetrics.maxProcessingTime = 
      Math.max(this.performanceMetrics.maxProcessingTime, processingTime);
    
    if (isError) {
      this.performanceMetrics.errors++;
    }

    // 如果平均处理时间超过阈值，记录警告
    if (this.performanceMetrics.averageProcessingTime > 50) { // 50ms
      this.logger.warn(
        `Audio processing performance warning: ` +
        `avg=${this.performanceMetrics.averageProcessingTime.toFixed(2)}ms, ` +
        `max=${this.performanceMetrics.maxProcessingTime}ms`
      );
    }
  }

  /**
   * 获取音频流统计
   */
  getAudioStreamStats(deviceId: string): {
    streamCount: number;
    totalPackets: number;
    totalBytes: number;
    averageLevel: number;
  } | null {
    const streams = Array.from(this.audioStreams.values()).filter(s => s.deviceId === deviceId);
    if (streams.length === 0) return null;

    const totalPackets = streams.reduce((sum, s) => sum + s.packetCount, 0);
    const totalBytes = streams.reduce((sum, s) => sum + s.byteCount, 0);
    const averageLevel = streams.reduce((sum, s) => sum + s.audioLevel, 0) / streams.length;

    return {
      streamCount: streams.length,
      totalPackets,
      totalBytes,
      averageLevel,
    };
  }
}

