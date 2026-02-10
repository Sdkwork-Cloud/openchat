/**
 * 音频处理服务
 * 
 * 提供音频信号处理功能：
 * - 降噪 (Noise Reduction)
 * - 自动增益控制 (AGC)
 * - 语音活动检测 (VAD)
 */

import { Injectable, Logger } from '@nestjs/common';

// 音频处理配置接口
export interface AudioProcessingConfig {
  enableNoiseReduction: boolean;
  enableVoiceActivityDetection: boolean;
  enableAutomaticGainControl: boolean;
  silenceThreshold: number;
  voiceActivityTimeout: number;
  minSilenceDuration: number;
  maxSilenceDuration: number;
  targetLevel: number;        // AGC 目标电平 (0-1)
  maxGain: number;           // AGC 最大增益
  minGain: number;           // AGC 最小增益
  vadMode: 'NORMAL' | 'LOW_BITRATE' | 'AGGRESSIVE' | 'VERY_AGGRESSIVE';
}

// 音频处理结果
export interface AudioProcessingResult {
  processed: Buffer;         // 处理后的音频数据
  hasVoice: boolean;         // 是否检测到语音
  noiseLevel: number;        // 噪声电平
  voiceLevel: number;        // 语音电平
  appliedGain: number;       // 应用的增益
}

// VAD 状态
interface VadState {
  isSpeech: boolean;
  silenceStartTime: number | null;
  speechStartTime: number | null;
  consecutiveSpeechFrames: number;
  consecutiveSilenceFrames: number;
}

@Injectable()
export class XiaozhiAudioProcessingService {
  private readonly logger = new Logger(XiaozhiAudioProcessingService.name);

  // 每个设备的 VAD 状态
  private vadStates = new Map<string, VadState>();
  
  // 每个设备的增益状态 (用于 AGC)
  private gainStates = new Map<string, { currentGain: number; peakLevel: number }>();

  // 默认配置
  private readonly defaultConfig: AudioProcessingConfig = {
    enableNoiseReduction: true,
    enableVoiceActivityDetection: true,
    enableAutomaticGainControl: true,
    silenceThreshold: 0.01,
    voiceActivityTimeout: 300,
    minSilenceDuration: 500,
    maxSilenceDuration: 10000,
    targetLevel: 0.3,        // 目标电平 30%
    maxGain: 10.0,          // 最大增益 10x
    minGain: 0.1,           // 最小增益 0.1x
    vadMode: 'NORMAL',
  };

  // 设备配置
  private deviceConfigs = new Map<string, AudioProcessingConfig>();

  /**
   * 初始化设备的音频处理
   * 
   * @param deviceId - 设备ID
   * @param config - 处理配置（可选，使用默认配置）
   */
  initialize(deviceId: string, config?: Partial<AudioProcessingConfig>): void {
    const mergedConfig = { ...this.defaultConfig, ...config };
    this.deviceConfigs.set(deviceId, mergedConfig);
    
    // 初始化 VAD 状态
    this.vadStates.set(deviceId, {
      isSpeech: false,
      silenceStartTime: null,
      speechStartTime: null,
      consecutiveSpeechFrames: 0,
      consecutiveSilenceFrames: 0,
    });

    // 初始化增益状态
    this.gainStates.set(deviceId, {
      currentGain: 1.0,
      peakLevel: 0.0,
    });

    this.logger.log(`Audio processing initialized for device ${deviceId}`);
  }

  /**
   * 处理音频数据
   * 
   * @param deviceId - 设备ID
   * @param pcmData - PCM 音频数据 (16-bit, mono)
   * @returns 处理结果
   */
  processAudio(deviceId: string, pcmData: Buffer): AudioProcessingResult {
    const config = this.deviceConfigs.get(deviceId);
    if (!config) {
      throw new Error(`Audio processing not initialized for device ${deviceId}`);
    }

    let processed = pcmData;
    let hasVoice = true;
    let noiseLevel = 0;
    let voiceLevel = 0;
    let appliedGain = 1.0;

    try {
      // 1. 降噪处理
      if (config.enableNoiseReduction) {
        const denoiseResult = this.applyNoiseReduction(deviceId, processed);
        processed = denoiseResult.data;
        noiseLevel = denoiseResult.noiseLevel;
      }

      // 2. 自动增益控制
      if (config.enableAutomaticGainControl) {
        const agcResult = this.applyAGC(deviceId, processed, config);
        processed = agcResult.data;
        appliedGain = agcResult.gain;
        voiceLevel = agcResult.peakLevel;
      } else {
        // 计算当前电平
        voiceLevel = this.calculatePeakLevel(processed);
      }

      // 3. 语音活动检测
      if (config.enableVoiceActivityDetection) {
        hasVoice = this.applyVAD(deviceId, processed, config);
      }

      return {
        processed,
        hasVoice,
        noiseLevel,
        voiceLevel,
        appliedGain,
      };
    } catch (error) {
      this.logger.error(`Audio processing failed for device ${deviceId}:`, error);
      // 返回原始数据，确保服务可用
      return {
        processed: pcmData,
        hasVoice: true,
        noiseLevel: 0,
        voiceLevel: this.calculatePeakLevel(pcmData),
        appliedGain: 1.0,
      };
    }
  }

  /**
   * 应用降噪（简化版谱减法）
   * 
   * @param deviceId - 设备ID
   * @param pcmData - PCM 数据
   * @returns 降噪后的数据和噪声电平
   */
  private applyNoiseReduction(deviceId: string, pcmData: Buffer): { data: Buffer; noiseLevel: number } {
    const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
    
    // 计算噪声估计（使用最小值跟踪）
    const noiseEstimate = this.estimateNoise(samples);
    
    // 应用谱减法降噪（简化实现）
    const processed = new Int16Array(samples.length);
    let noiseLevel = 0;

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const absSample = Math.abs(sample);
      
      // 简单的噪声门限
      if (absSample < noiseEstimate * 2) {
        // 可能是噪声，衰减
        processed[i] = sample * 0.3;
        noiseLevel += absSample;
      } else {
        // 信号，保留
        processed[i] = sample;
      }
    }

    noiseLevel = noiseLevel / samples.length / 32768;

    return {
      data: Buffer.from(processed.buffer),
      noiseLevel,
    };
  }

  /**
   * 估计噪声电平
   * 
   * @param samples - 音频样本
   * @returns 噪声估计值
   */
  private estimateNoise(samples: Int16Array): number {
    // 使用最小值跟踪估计噪声
    const blockSize = 128;
    let minEnergy = Infinity;

    for (let i = 0; i < samples.length; i += blockSize) {
      let energy = 0;
      for (let j = i; j < Math.min(i + blockSize, samples.length); j++) {
        energy += Math.abs(samples[j]);
      }
      energy /= Math.min(blockSize, samples.length - i);
      minEnergy = Math.min(minEnergy, energy);
    }

    return minEnergy === Infinity ? 100 : minEnergy;
  }

  /**
   * 应用自动增益控制
   * 
   * @param deviceId - 设备ID
   * @param pcmData - PCM 数据
   * @param config - 处理配置
   * @returns 处理后的数据和增益信息
   */
  private applyAGC(
    deviceId: string, 
    pcmData: Buffer, 
    config: AudioProcessingConfig
  ): { data: Buffer; gain: number; peakLevel: number } {
    const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
    const gainState = this.gainStates.get(deviceId)!;

    // 计算当前峰值电平
    let peakLevel = 0;
    for (let i = 0; i < samples.length; i++) {
      peakLevel = Math.max(peakLevel, Math.abs(samples[i]) / 32768);
    }

    // 更新峰值电平（平滑）
    gainState.peakLevel = gainState.peakLevel * 0.9 + peakLevel * 0.1;

    // 计算目标增益
    let targetGain = config.targetLevel / (gainState.peakLevel + 0.001);
    targetGain = Math.max(config.minGain, Math.min(config.maxGain, targetGain));

    // 平滑增益变化
    const gainChangeRate = 0.1;
    gainState.currentGain = gainState.currentGain * (1 - gainChangeRate) + targetGain * gainChangeRate;

    // 应用增益
    const processed = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const amplified = samples[i] * gainState.currentGain;
      // 防止削波
      processed[i] = Math.max(-32768, Math.min(32767, amplified));
    }

    return {
      data: Buffer.from(processed.buffer),
      gain: gainState.currentGain,
      peakLevel: gainState.peakLevel,
    };
  }

  /**
   * 应用语音活动检测
   * 
   * @param deviceId - 设备ID
   * @param pcmData - PCM 数据
   * @param config - 处理配置
   * @returns 是否检测到语音
   */
  private applyVAD(deviceId: string, pcmData: Buffer, config: AudioProcessingConfig): boolean {
    const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
    const vadState = this.vadStates.get(deviceId)!;
    const now = Date.now();

    // 计算帧能量
    let frameEnergy = 0;
    for (let i = 0; i < samples.length; i++) {
      frameEnergy += Math.abs(samples[i]);
    }
    frameEnergy /= samples.length;
    const normalizedEnergy = frameEnergy / 32768;

    // 根据模式调整阈值
    let threshold = config.silenceThreshold;
    switch (config.vadMode) {
      case 'LOW_BITRATE':
        threshold *= 1.5;
        break;
      case 'AGGRESSIVE':
        threshold *= 0.7;
        break;
      case 'VERY_AGGRESSIVE':
        threshold *= 0.5;
        break;
    }

    // 检测语音
    const isSpeechFrame = normalizedEnergy > threshold;

    if (isSpeechFrame) {
      vadState.consecutiveSpeechFrames++;
      vadState.consecutiveSilenceFrames = 0;

      // 连续语音帧超过阈值，判定为语音开始
      if (!vadState.isSpeech && vadState.consecutiveSpeechFrames >= 3) {
        vadState.isSpeech = true;
        vadState.speechStartTime = now;
        vadState.silenceStartTime = null;
      }
    } else {
      vadState.consecutiveSilenceFrames++;
      vadState.consecutiveSpeechFrames = 0;

      // 连续静音帧超过阈值，判定为语音结束
      if (vadState.isSpeech && vadState.consecutiveSilenceFrames >= 5) {
        const silenceDuration = now - (vadState.silenceStartTime || now);
        
        if (silenceDuration > config.minSilenceDuration) {
          vadState.isSpeech = false;
          vadState.silenceStartTime = null;
        }
      }

      if (!vadState.silenceStartTime) {
        vadState.silenceStartTime = now;
      }
    }

    // 检查最大静音时间
    if (vadState.silenceStartTime) {
      const silenceDuration = now - vadState.silenceStartTime;
      if (silenceDuration > config.maxSilenceDuration) {
        vadState.isSpeech = false;
      }
    }

    return vadState.isSpeech;
  }

  /**
   * 计算峰值电平
   * 
   * @param pcmData - PCM 数据
   * @returns 峰值电平 (0-1)
   */
  private calculatePeakLevel(pcmData: Buffer): number {
    const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
    let peak = 0;

    for (let i = 0; i < samples.length; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }

    return peak / 32768;
  }

  /**
   * 获取设备的 VAD 状态
   * 
   * @param deviceId - 设备ID
   * @returns VAD 状态
   */
  getVadState(deviceId: string): VadState | undefined {
    return this.vadStates.get(deviceId);
  }

  /**
   * 重置设备的 VAD 状态
   * 
   * @param deviceId - 设备ID
   */
  resetVadState(deviceId: string): void {
    this.vadStates.set(deviceId, {
      isSpeech: false,
      silenceStartTime: null,
      speechStartTime: null,
      consecutiveSpeechFrames: 0,
      consecutiveSilenceFrames: 0,
    });
  }

  /**
   * 更新设备配置
   * 
   * @param deviceId - 设备ID
   * @param config - 配置更新
   */
  updateConfig(deviceId: string, config: Partial<AudioProcessingConfig>): void {
    const currentConfig = this.deviceConfigs.get(deviceId);
    if (currentConfig) {
      this.deviceConfigs.set(deviceId, { ...currentConfig, ...config });
      this.logger.log(`Audio processing config updated for device ${deviceId}`);
    }
  }

  /**
   * 获取设备配置
   * 
   * @param deviceId - 设备ID
   * @returns 当前配置
   */
  getConfig(deviceId: string): AudioProcessingConfig | undefined {
    return this.deviceConfigs.get(deviceId);
  }

  /**
   * 清理设备资源
   * 
   * @param deviceId - 设备ID
   */
  cleanup(deviceId: string): void {
    this.vadStates.delete(deviceId);
    this.gainStates.delete(deviceId);
    this.deviceConfigs.delete(deviceId);
    this.logger.log(`Audio processing cleaned up for device ${deviceId}`);
  }

  /**
   * 清理所有资源
   */
  cleanupAll(): void {
    this.vadStates.clear();
    this.gainStates.clear();
    this.deviceConfigs.clear();
    this.logger.log('All audio processing resources cleaned up');
  }

  /**
   * 获取统计信息
   * 
   * @returns 处理统计
   */
  getStats(): { 
    initializedDevices: number; 
    activeVadDevices: number;
    averageGain: number;
  } {
    const devices = Array.from(this.gainStates.values());
    const avgGain = devices.length > 0 
      ? devices.reduce((sum, d) => sum + d.currentGain, 0) / devices.length 
      : 1.0;

    const activeVad = Array.from(this.vadStates.values()).filter(v => v.isSpeech).length;

    return {
      initializedDevices: this.deviceConfigs.size,
      activeVadDevices: activeVad,
      averageGain: avgGain,
    };
  }
}
