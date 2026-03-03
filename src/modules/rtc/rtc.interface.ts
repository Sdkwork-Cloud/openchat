import { RTCProviderType } from './rtc.constants';

export class RTCRoom {
  id: string;
  uuid: string;
  name?: string;
  type: 'p2p' | 'group';
  creatorId: string;
  participants: string[];
  status: 'active' | 'ended';
  channelId?: string;
  provider?: RTCProviderType;
  externalRoomId?: string;
  aiEnabled?: boolean;
  aiMetadata?: Record<string, any>;
  startedAt: Date;
  endedAt?: Date;
}

export class RTCToken {
  id: string;
  uuid: string;
  roomId: string;
  userId: string;
  channelId?: string;
  provider?: RTCProviderType;
  token: string;
  role?: string;
  metadata?: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
}

export interface RTCManager {
  createRoom(
    creatorId: string,
    type: 'p2p' | 'group',
    participants: string[],
    name?: string,
    channelId?: string,
    provider?: string,
    aiMetadata?: Record<string, any>,
  ): Promise<RTCRoom>;
  endRoom(roomId: string, operatorId?: string): Promise<boolean>;
  getRoomById(roomId: string): Promise<RTCRoom | null>;
  getRoomsByUserId(userId: string): Promise<RTCRoom[]>;
  generateToken(
    roomId: string,
    userId: string,
    channelId?: string,
    provider?: string,
    role?: string,
    expireSeconds?: number,
  ): Promise<RTCToken>;
  validateToken(token: string): Promise<RTCToken | null>;
  addParticipant(roomId: string, userId: string, operatorId?: string): Promise<boolean>;
  removeParticipant(roomId: string, userId: string, operatorId?: string): Promise<boolean>;
}
