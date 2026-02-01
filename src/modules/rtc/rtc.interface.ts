export class RTCRoom {
  id: string;
  uuid: string;
  name?: string;
  type: 'p2p' | 'group';
  creatorId: string;
  participants: string[];
  status: 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
}

export class RTCToken {
  id: string;
  uuid: string;
  roomId: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface RTCManager {
  createRoom(creatorId: string, type: 'p2p' | 'group', participants: string[], name?: string): Promise<RTCRoom>;
  endRoom(roomId: string): Promise<boolean>;
  getRoomById(roomId: string): Promise<RTCRoom | null>;
  getRoomsByUserId(userId: string): Promise<RTCRoom[]>;
  generateToken(roomId: string, userId: string): Promise<RTCToken>;
  validateToken(token: string): Promise<RTCToken | null>;
  addParticipant(roomId: string, userId: string): Promise<boolean>;
  removeParticipant(roomId: string, userId: string): Promise<boolean>;
}