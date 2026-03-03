// RTC Channel抽象接口定义

import { RTCProviderType } from '../rtc.constants';

// RTC Channel配置接口
export interface RTCChannelConfig {
  provider: RTCProviderType;
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

// RTC 云端录制任务状态
export type RTCChannelRecordingStatus =
  | 'recording'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'stopped';

// RTC 云端录制任务
export interface RTCChannelRecordingTask {
  taskId: string;
  roomId: string;
  status: RTCChannelRecordingStatus;
  startTime?: Date;
  endTime?: Date;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
  [key: string]: any;
}

// RTC 启动云录制请求
export interface RTCChannelStartRecordingRequest {
  roomId: string;
  userId: string;
  roomType?: 'p2p' | 'group';
  taskId?: string;
  metadata?: Record<string, any>;
}

// RTC 停止云录制请求
export interface RTCChannelStopRecordingRequest {
  roomId: string;
  taskId: string;
  metadata?: Record<string, any>;
}

// RTC Channel抽象接口
export interface RTCChannel {
  // 获取Channel提供商名称
  getProvider(): RTCProviderType;
  
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

  // 启动云端录制任务
  startRecording?(request: RTCChannelStartRecordingRequest): Promise<RTCChannelRecordingTask>;

  // 停止云端录制任务
  stopRecording?(request: RTCChannelStopRecordingRequest): Promise<RTCChannelRecordingTask>;

  // 查询云端录制任务
  getRecordingTask?(roomId: string, taskId: string): Promise<RTCChannelRecordingTask | null>;
}

// RTC Channel工厂接口
export interface RTCChannelFactory {
  // 注册Channel提供商
  registerProvider(provider: RTCProviderType, channelClass: new () => RTCChannel): void;
  
  // 创建Channel实例
  createChannel(provider: RTCProviderType): RTCChannel;
  
  // 获取所有支持的提供商
  getSupportedProviders(): string[];
}
