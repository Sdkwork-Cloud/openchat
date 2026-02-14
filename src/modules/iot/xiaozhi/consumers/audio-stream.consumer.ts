/**
 * 音频流消费者
 * 
 * 处理音频数据流，实现：
 * - 语音识别 (STT)
 * - 大语言模型对话 (LLM)
 * - 语音合成 (TTS)
 * 
 * 完整的语音对话闭环
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService, EventType, EventPriority } from '../../../../common/events/event-bus.service';
import { XiaoZhiMessageService } from '../services/xiaozhi-message.service';
import { XiaoZhiAudioService } from '../services/xiaozhi-audio.service';
import { XiaoZhiStateService } from '../services/xiaozhi-state.service';
import { XiaoZhiGateway } from '../xiaozhi.gateway';
import { BaiduSTTService } from '../services/stt/baidu-stt.service';
import { BaiduTTSService } from '../services/tts/baidu-tts.service';
import { OpenAIChatService } from '../services/llm/openai-chat.service';

// 对话状态
interface DialogueState {
  deviceId: string;
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastActivity: number;
  isProcessing: boolean;
}

@Injectable()
export class AudioStreamConsumer implements OnModuleInit {
  private readonly logger = new Logger(AudioStreamConsumer.name);

  // 对话状态管理
  private dialogueStates = new Map<string, DialogueState>();
  
  // STT/TTS/LLM 配置
  private sttConfig: { provider: string; apiKey: string; apiSecret?: string };
  private ttsConfig: { provider: string; apiKey: string; voice: string };
  private llmConfig: { provider: string; apiKey: string; model: string };

  constructor(
    private configService: ConfigService,
    private eventBus: EventBusService,
    private messageService: XiaoZhiMessageService,
    private audioService: XiaoZhiAudioService,
    private stateService: XiaoZhiStateService,
    private gateway: XiaoZhiGateway,
    private baiduSTTService: BaiduSTTService,
    private baiduTTSService: BaiduTTSService,
    private openaiChatService: OpenAIChatService,
  ) {
    // 加载配置
    this.sttConfig = {
      provider: this.configService.get<string>('STT_PROVIDER') || 'baidu',
      apiKey: this.configService.get<string>('STT_API_KEY') || '',
      apiSecret: this.configService.get<string>('STT_API_SECRET') || '',
    };

    this.ttsConfig = {
      provider: this.configService.get<string>('TTS_PROVIDER') || 'baidu',
      apiKey: this.configService.get<string>('TTS_API_KEY') || '',
      voice: this.configService.get<string>('TTS_VOICE') || 'zh_female_xiaoxin',
    };

    this.llmConfig = {
      provider: this.configService.get<string>('LLM_PROVIDER') || 'openai',
      apiKey: this.configService.get<string>('LLM_API_KEY') || '',
      model: this.configService.get<string>('LLM_MODEL') || 'gpt-3.5-turbo',
    };
  }

  /**
   * 模块初始化
   */
  onModuleInit() {
    this.logger.log('AudioStreamConsumer initialized');
    this.logger.log(`STT Provider: ${this.sttConfig.provider}`);
    this.logger.log(`TTS Provider: ${this.ttsConfig.provider}`);
    this.logger.log(`LLM Provider: ${this.llmConfig.provider}`);

    // 订阅音频数据事件
    this.subscribeToAudioEvents();
    
    // 启动清理定时器
    this.startCleanupInterval();
  }

  /**
   * 订阅音频事件
   */
  private subscribeToAudioEvents(): void {
    this.eventBus.subscribe(
      EventType.AUDIO_DATA_RECEIVED,
      { priority: EventPriority.HIGH }
    ).subscribe(async (event) => {
      await this.handleAudioData(event.payload);
    });

    this.logger.log('Subscribed to AUDIO_DATA_RECEIVED events');
  }

  /**
   * 处理音频数据
   */
  private async handleAudioData(event: {
    deviceId: string;
    sessionId: string;
    pcmData: Buffer;
    sampleRate: number;
    channels: number;
    timestamp: number;
    metadata: {
      noiseLevel: number;
      voiceLevel: number;
      appliedGain: number;
      processingTime: number;
    };
  }): Promise<void> {
    const { deviceId, sessionId, pcmData } = event;

    try {
      this.logger.debug(`Processing audio from device ${deviceId}, size: ${pcmData.length}`);

      // 1. 语音识别 (STT)
      const text = await this.speechToText(pcmData, event.sampleRate);
      
      if (!text || text.trim().length === 0) {
        this.logger.debug(`No speech recognized for device ${deviceId}`);
        return;
      }

      this.logger.log(`STT Result [${deviceId}]: "${text}"`);

      // 发送 STT 结果到设备
      this.sendSttResult(deviceId, sessionId, text);

      // 2. 获取或创建对话状态
      const dialogueState = this.getOrCreateDialogueState(deviceId, sessionId);
      
      // 添加用户消息
      dialogueState.messages.push({ role: 'user', content: text });
      dialogueState.lastActivity = Date.now();

      // 3. LLM 对话
      const response = await this.chatWithLLM(dialogueState.messages);
      
      if (!response) {
        this.logger.warn(`No LLM response for device ${deviceId}`);
        return;
      }

      this.logger.log(`LLM Response [${deviceId}]: "${response}"`);

      // 添加助手消息
      dialogueState.messages.push({ role: 'assistant', content: response });

      // 4. 语音合成 (TTS)
      await this.textToSpeech(deviceId, sessionId, response);

    } catch (error) {
      this.logger.error(`Error processing audio for device ${deviceId}:`, error);
      this.sendErrorMessage(deviceId, sessionId, '处理音频时出错');
    }
  }

  /**
   * 语音识别 (STT)
   */
  private async speechToText(pcmData: Buffer, sampleRate: number): Promise<string> {
    // 这里应该调用实际的 STT 服务
    // 目前使用模拟实现
    
    switch (this.sttConfig.provider) {
      case 'baidu':
        return this.callBaiduSTT(pcmData, sampleRate);
      case 'xunfei':
        return this.xunfeiSTT(pcmData, sampleRate);
      case 'ali':
        return this.aliSTT(pcmData, sampleRate);
      case 'mock':
      default:
        // 模拟 STT，返回固定文本用于测试
        return this.mockSTT(pcmData);
    }
  }

  /**
   * 百度语音识别
   */
  private async callBaiduSTT(pcmData: Buffer, sampleRate: number): Promise<string> {
    try {
      if (!this.baiduSTTService.isAvailable()) {
        this.logger.warn('Baidu STT not available, using mock');
        return this.mockSTT(pcmData);
      }
      return await this.baiduSTTService.recognize(pcmData, sampleRate);
    } catch (error) {
      this.logger.error('Baidu STT failed, falling back to mock:', error);
      return this.mockSTT(pcmData);
    }
  }

  /**
   * 讯飞语音识别
   */
  private async xunfeiSTT(pcmData: Buffer, sampleRate: number): Promise<string> {
    // TODO: 实现讯飞语音识别 API 调用
    this.logger.warn('Xunfei STT not implemented yet, using mock');
    return this.mockSTT(pcmData);
  }

  /**
   * 阿里语音识别
   */
  private async aliSTT(pcmData: Buffer, sampleRate: number): Promise<string> {
    // TODO: 实现阿里语音识别 API 调用
    this.logger.warn('Ali STT not implemented yet, using mock');
    return this.mockSTT(pcmData);
  }

  /**
   * 模拟语音识别（用于测试）
   */
  private async mockSTT(pcmData: Buffer): Promise<string> {
    // 模拟处理延迟
    await this.delay(500);
    
    // 返回模拟文本
    const mockTexts = [
      '你好，小智',
      '今天天气怎么样',
      '播放一首音乐',
      '帮我设置闹钟',
      '讲个笑话',
    ];
    
    return mockTexts[Math.floor(Math.random() * mockTexts.length)];
  }

  /**
   * LLM 对话
   */
  private async chatWithLLM(messages: Array<{ role: string; content: string }>): Promise<string> {
    switch (this.llmConfig.provider) {
      case 'openai':
        return this.callOpenaiChat(messages);
      case 'baidu':
        return this.baiduChat(messages);
      case 'ali':
        return this.aliChat(messages);
      case 'mock':
      default:
        return this.mockChat(messages);
    }
  }

  /**
   * OpenAI 对话
   */
  private async callOpenaiChat(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      if (!this.openaiChatService.isAvailable()) {
        this.logger.warn('OpenAI not available, using mock');
        return this.mockChat(messages);
      }
      return await this.openaiChatService.chat(messages);
    } catch (error) {
      this.logger.error('OpenAI chat failed, falling back to mock:', error);
      return this.mockChat(messages);
    }
  }

  /**
   * 百度文心一言
   */
  private async baiduChat(messages: Array<{ role: string; content: string }>): Promise<string> {
    // TODO: 实现百度文心一言 API 调用
    this.logger.warn('Baidu chat not implemented yet, using mock');
    return this.mockChat(messages);
  }

  /**
   * 阿里通义千问
   */
  private async aliChat(messages: Array<{ role: string; content: string }>): Promise<string> {
    // TODO: 实现阿里通义千问 API 调用
    this.logger.warn('Ali chat not implemented yet, using mock');
    return this.mockChat(messages);
  }

  /**
   * 模拟对话（用于测试）
   */
  private async mockChat(messages: Array<{ role: string; content: string }>): Promise<string> {
    // 模拟处理延迟
    await this.delay(800);
    
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // 简单的关键词回复
    if (lastMessage.includes('你好') || lastMessage.includes('小智')) {
      return '你好！我是小智，很高兴为你服务。';
    } else if (lastMessage.includes('天气')) {
      return '今天天气不错，适合出去走走！';
    } else if (lastMessage.includes('音乐') || lastMessage.includes('歌')) {
      return '好的，为你播放一首轻松的音乐。';
    } else if (lastMessage.includes('闹钟')) {
      return '已经帮你设置好闹钟了。';
    } else if (lastMessage.includes('笑话')) {
      return '为什么程序员总是分不清圣诞节和万圣节？因为 31 OCT = 25 DEC。';
    } else {
      return '我明白了，还有其他我可以帮你的吗？';
    }
  }

  /**
   * 语音合成 (TTS)
   */
  private async textToSpeech(deviceId: string, sessionId: string, text: string): Promise<void> {
    // 发送 TTS 开始消息
    this.sendTtsStart(deviceId, sessionId);

    // 分割文本为句子
    const sentences = this.splitIntoSentences(text);

    for (const sentence of sentences) {
      // 发送句子开始消息
      this.sendTtsSentenceStart(deviceId, sessionId, sentence);

      // 合成音频
      const audioData = await this.synthesizeSpeech(sentence);

      if (audioData && audioData.length > 0) {
        // 发送音频数据
        await this.sendAudioData(deviceId, sessionId, audioData);
      }
    }

    // 发送 TTS 结束消息
    this.sendTtsStop(deviceId, sessionId);
  }

  /**
   * 合成语音
   */
  private async synthesizeSpeech(text: string): Promise<Buffer> {
    switch (this.ttsConfig.provider) {
      case 'baidu':
        return this.callBaiduTTS(text);
      case 'xunfei':
        return this.xunfeiTTS(text);
      case 'ali':
        return this.aliTTS(text);
      case 'mock':
      default:
        return this.mockTTS(text);
    }
  }

  /**
   * 百度语音合成
   */
  private async callBaiduTTS(text: string): Promise<Buffer> {
    try {
      if (!this.baiduTTSService.isAvailable()) {
        this.logger.warn('Baidu TTS not available, using mock');
        return this.mockTTS(text);
      }
      return await this.baiduTTSService.synthesize(text, {
        voice: this.ttsConfig.voice,
      });
    } catch (error) {
      this.logger.error('Baidu TTS failed, falling back to mock:', error);
      return this.mockTTS(text);
    }
  }

  /**
   * 讯飞语音合成
   */
  private async xunfeiTTS(text: string): Promise<Buffer> {
    // TODO: 实现讯飞语音合成 API 调用
    this.logger.warn('Xunfei TTS not implemented yet, using mock');
    return this.mockTTS(text);
  }

  /**
   * 阿里语音合成
   */
  private async aliTTS(text: string): Promise<Buffer> {
    // TODO: 实现阿里语音合成 API 调用
    this.logger.warn('Ali TTS not implemented yet, using mock');
    return this.mockTTS(text);
  }

  /**
   * 模拟语音合成（用于测试）
   */
  private async mockTTS(text: string): Promise<Buffer> {
    // 模拟处理延迟
    await this.delay(300);
    
    // 生成模拟音频数据（PCM 格式，1秒静音）
    const sampleRate = 24000;
    const duration = Math.max(1, text.length * 0.2); // 每个字约 200ms
    const numSamples = Math.floor(sampleRate * duration);
    const pcmData = Buffer.alloc(numSamples * 2);
    
    // 填充静音（实际应用中应该是真实的音频数据）
    pcmData.fill(0);
    
    return pcmData;
  }

  /**
   * 分割文本为句子
   */
  private splitIntoSentences(text: string): string[] {
    // 按标点符号分割
    const sentences = text.split(/([。！？.!?])/);
    const result: string[] = [];
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      if (sentence.trim()) {
        result.push(sentence.trim());
      }
    }
    
    return result.length > 0 ? result : [text];
  }

  /**
   * 获取或创建对话状态
   */
  private getOrCreateDialogueState(deviceId: string, sessionId: string): DialogueState {
    const key = `${deviceId}:${sessionId}`;
    let state = this.dialogueStates.get(key);
    
    if (!state) {
      state = {
        deviceId,
        sessionId,
        messages: [],
        lastActivity: Date.now(),
        isProcessing: false,
      };
      this.dialogueStates.set(key, state);
    }
    
    return state;
  }

  /**
   * 发送 STT 结果
   */
  private sendSttResult(deviceId: string, sessionId: string, text: string): void {
    const message = {
      session_id: sessionId,
      type: 'stt',
      text,
    };

    this.gateway.sendMessageToDevice(deviceId, message);
  }

  /**
   * 发送 TTS 开始
   */
  private sendTtsStart(deviceId: string, sessionId: string): void {
    const message = {
      session_id: sessionId,
      type: 'tts',
      state: 'start',
    };

    this.gateway.sendMessageToDevice(deviceId, message);
  }

  /**
   * 发送 TTS 句子开始
   */
  private sendTtsSentenceStart(deviceId: string, sessionId: string, text: string): void {
    const message = {
      session_id: sessionId,
      type: 'tts',
      state: 'sentence_start',
      text,
    };

    this.gateway.sendMessageToDevice(deviceId, message);
  }

  /**
   * 发送 TTS 结束
   */
  private sendTtsStop(deviceId: string, sessionId: string): void {
    const message = {
      session_id: sessionId,
      type: 'tts',
      state: 'stop',
    };

    this.gateway.sendMessageToDevice(deviceId, message);
  }

  /**
   * 发送音频数据
   */
  private async sendAudioData(deviceId: string, sessionId: string, pcmData: Buffer): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.warn(`No connection found for device ${deviceId}`);
      return;
    }

    await this.audioService.sendAudioData(deviceId, connection, pcmData);
  }

  /**
   * 发送错误消息
   */
  private sendErrorMessage(deviceId: string, sessionId: string, error: string): void {
    const message = {
      session_id: sessionId,
      type: 'error',
      message: error,
    };

    this.gateway.sendMessageToDevice(deviceId, message);
  }

  /**
   * 启动清理定时器
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 10 * 60 * 1000; // 10 分钟

      for (const [key, state] of this.dialogueStates.entries()) {
        if (now - state.lastActivity > timeout) {
          this.dialogueStates.delete(key);
          this.logger.debug(`Cleaned up dialogue state: ${key}`);
        }
      }
    }, 60 * 1000); // 每分钟清理一次
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取对话统计
   */
  getDialogueStats() {
    return {
      activeDialogues: this.dialogueStates.size,
      totalMessages: Array.from(this.dialogueStates.values()).reduce(
        (sum, state) => sum + state.messages.length, 0
      ),
    };
  }
}
