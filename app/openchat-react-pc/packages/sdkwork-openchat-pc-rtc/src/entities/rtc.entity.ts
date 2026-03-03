/**
 * RTC 实体定义
 * 
 * 职责：定义 RTC 通话相关的领域模型
 */

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';
export type CallDirection = 'outgoing' | 'incoming';

/**
 * 通话房间
 */
export interface RTCRoom {
  id: string;
  uuid: string;
  name?: string;
  type: 'p2p' | 'group';
  creatorId: string;
  participants: string[];
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
}

/**
 * 通话令牌
 */
export interface RTCToken {
  id: string;
  uuid: string;
  roomId: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * 通话会话（前端状态管理用）
 */
export interface CallSession {
  id: string;
  roomId?: string;
  callType: CallType;
  status: CallStatus;
  direction: CallDirection;
  localUserId: string;
  remoteUserId?: string;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  startTime?: string;
  connectTime?: string;
  endTime?: string;
  duration?: number; // 秒
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOff: boolean;
  error?: string;
}

/**
 * 创建房间请求
 */
export interface CreateRoomRequest {
  type: 'p2p' | 'group';
  participants: string[];
  name?: string;
}

/**
 * 创建房间响应
 */
export interface CreateRoomResponse {
  room: RTCRoom;
  token: RTCToken;
}

/**
 * 通话信令消息
 */
export interface CallSignal {
  type: 'call' | 'accept' | 'reject' | 'hangup' | 'ice-candidate' | 'offer' | 'answer';
  callId: string;
  from: string;
  to: string;
  payload?: unknown;
  timestamp: string;
}

/**
 * 发起通话请求
 */
export interface InitiateCallRequest {
  calleeId: string;
  callType: CallType;
}

/**
 * 通话记录
 */
export interface CallRecord {
  id: string;
  callType: CallType;
  direction: CallDirection;
  remoteUserId: string;
  remoteUserName: string;
  remoteUserAvatar?: string;
  status: 'completed' | 'missed' | 'rejected' | 'failed';
  duration?: number;
  timestamp: string;
}
