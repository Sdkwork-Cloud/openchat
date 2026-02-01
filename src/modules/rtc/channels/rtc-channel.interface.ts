// RTC Channel抽象接口定义

// RTC Channel配置接口
export interface RTCChannelConfig {
  provider: string;
  appId: string;
  appKey: string;
  appSecret: string;
  region?: string;
  endpoint?: string;
  [key: string]: any;
}

// RTC房间信息接口
export interface RTCChannelRoomInfo {
  roomId: string;
  roomName?: string;
  type: 'p2p' | 'group';
  participants: string[];
  [key: string]: any;
}

// RTC令牌接口
export interface RTCChannelToken {
  token: string;
  expiresAt: Date;
  roomId: string;
  userId: string;
  [key: string]: any;
}

// RTC Channel抽象接口
export interface RTCChannel {
  // 获取Channel提供商名称
  getProvider(): string;
  
  // 初始化Channel
  initialize(config: RTCChannelConfig): Promise<void>;
  
  // 创建房间
  createRoom(roomId: string, roomName?: string, type?: 'p2p' | 'group'): Promise<RTCChannelRoomInfo>;
  
  // 销毁房间
  destroyRoom(roomId: string): Promise<boolean>;
  
  // 获取房间信息
  getRoomInfo(roomId: string): Promise<RTCChannelRoomInfo | null>;
  
  // 生成令牌
  generateToken(roomId: string, userId: string, role?: string, expireSeconds?: number): Promise<RTCChannelToken>;
  
  // 验证令牌
  validateToken(token: string): Promise<boolean>;
  
  // 添加参与者
  addParticipant(roomId: string, userId: string): Promise<boolean>;
  
  // 移除参与者
  removeParticipant(roomId: string, userId: string): Promise<boolean>;
  
  // 获取参与者列表
  getParticipants(roomId: string): Promise<string[]>;
  
  // 检查参与者是否在房间中
  isParticipantInRoom(roomId: string, userId: string): Promise<boolean>;
}

// RTC Channel工厂接口
export interface RTCChannelFactory {
  // 注册Channel提供商
  registerProvider(provider: string, channelClass: new () => RTCChannel): void;
  
  // 创建Channel实例
  createChannel(provider: string): RTCChannel;
  
  // 获取所有支持的提供商
  getSupportedProviders(): string[];
}
