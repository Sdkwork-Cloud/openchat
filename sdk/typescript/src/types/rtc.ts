export enum RTCRoomType {
  P2P = 'p2p',
  GROUP = 'group',
}

export interface RTCRoom {
  id: string;
  creatorId: string;
  type: RTCRoomType;
  participants: string[];
  name?: string;
  channelId?: string;
  status: 'active' | 'ended';
  createdAt: number;
  endedAt?: number;
}

export interface RTCToken {
  token: string;
  roomId: string;
  userId: string;
  channelId?: string;
  expiresAt: number;
  createdAt: number;
}

export interface RTCChannelEntity {
  id: string;
  provider: string;
  appId: string;
  appKey: string;
  appSecret: string;
  region?: string;
  endpoint?: string;
  extraConfig?: Record<string, any>;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RTCVideoRecord {
  id: string;
  roomId: string;
  userId?: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  startTime: Date;
  endTime: Date;
  status: 'recording' | 'completed' | 'failed' | 'processing';
  metadata?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateRTCRoomParams {
  creatorId: string;
  type: RTCRoomType;
  participants: string[];
  name?: string;
  channelId?: string;
}

export interface GenerateRTCTokenParams {
  roomId: string;
  userId: string;
  channelId?: string;
}

export interface CreateRTCChannelParams {
  provider: string;
  appId: string;
  appKey: string;
  appSecret: string;
  region?: string;
  endpoint?: string;
  extraConfig?: Record<string, any>;
}

export interface UpdateRTCChannelParams {
  provider?: string;
  appId?: string;
  appKey?: string;
  appSecret?: string;
  region?: string;
  endpoint?: string;
  extraConfig?: Record<string, any>;
  isActive?: boolean;
}

export interface CreateVideoRecordParams {
  roomId: string;
  userId?: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  startTime: Date;
  endTime: Date;
  status?: 'recording' | 'completed' | 'failed' | 'processing';
  metadata?: string;
}

export interface UpdateVideoRecordStatusParams {
  status: 'recording' | 'completed' | 'failed' | 'processing';
  errorMessage?: string;
}

export interface VideoRecordListQuery {
  limit?: number;
  offset?: number;
}
