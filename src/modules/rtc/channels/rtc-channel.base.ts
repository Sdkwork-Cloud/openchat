import { RTCChannel, RTCChannelConfig, RTCChannelRoomInfo, RTCChannelToken, RTCChannelFactory } from './rtc-channel.interface';

// RTC Channel抽象基类
export abstract class RTCChannelBase implements RTCChannel {
  protected config: RTCChannelConfig | null = null;
  protected isInitialized: boolean = false;

  // 获取Channel提供商名称
  abstract getProvider(): string;

  // 初始化Channel
  async initialize(config: RTCChannelConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
  }

  // 创建房间
  abstract createRoom(roomId: string, roomName?: string, type?: 'p2p' | 'group'): Promise<RTCChannelRoomInfo>;

  // 销毁房间
  abstract destroyRoom(roomId: string): Promise<boolean>;

  // 获取房间信息
  abstract getRoomInfo(roomId: string): Promise<RTCChannelRoomInfo | null>;

  // 生成令牌
  abstract generateToken(roomId: string, userId: string, role?: string, expireSeconds?: number): Promise<RTCChannelToken>;

  // 验证令牌
  abstract validateToken(token: string): Promise<boolean>;

  // 添加参与者
  abstract addParticipant(roomId: string, userId: string): Promise<boolean>;

  // 移除参与者
  abstract removeParticipant(roomId: string, userId: string): Promise<boolean>;

  // 获取参与者列表
  abstract getParticipants(roomId: string): Promise<string[]>;

  // 检查参与者是否在房间中
  async isParticipantInRoom(roomId: string, userId: string): Promise<boolean> {
    const participants = await this.getParticipants(roomId);
    return participants.includes(userId);
  }

  // 验证是否已初始化
  protected validateInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error('RTC Channel not initialized');
    }
  }

  // 获取配置值
  protected getConfig(key: string, defaultValue?: any): any {
    if (!this.config) {
      return defaultValue;
    }
    return this.config[key] || defaultValue;
  }
}

// RTC Channel工厂类
export class RTCChannelFactoryImpl implements RTCChannelFactory {
  private providers: Map<string, new () => RTCChannel> = new Map();

  // 注册Channel提供商
  registerProvider(provider: string, channelClass: new () => RTCChannel): void {
    this.providers.set(provider, channelClass);
  }

  // 创建Channel实例
  createChannel(provider: string): RTCChannel {
    const channelClass = this.providers.get(provider);
    if (!channelClass) {
      throw new Error(`RTC Channel provider ${provider} not registered`);
    }
    return new channelClass();
  }

  // 获取所有支持的提供商
  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// 导出默认工厂实例
export const rtcChannelFactory = new RTCChannelFactoryImpl();
