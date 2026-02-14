import { RTCChannelBase } from '../rtc-channel.base';
import { RTCChannelRoomInfo, RTCChannelToken } from '../rtc-channel.interface';
import { rtcLogger } from '../../rtc.logger';

export class LiveKitRTCChannel extends RTCChannelBase {
  getProvider(): string {
    return 'livekit';
  }

  async createRoom(roomId: string, roomName?: string, type?: 'p2p' | 'group'): Promise<RTCChannelRoomInfo> {
    const roomType = type || 'p2p';
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Creating room', { roomId, roomType, roomName });

    return {
      roomId,
      roomName,
      type: roomType,
      participants: [],
      livekitRoomId: roomId,
    };
  }

  async destroyRoom(roomId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Destroying room', { roomId });

    return true;
  }

  async getRoomInfo(roomId: string): Promise<RTCChannelRoomInfo | null> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Getting room info', { roomId });

    return {
      roomId,
      type: 'group',
      participants: [],
      livekitRoomId: roomId,
    };
  }

  async generateToken(roomId: string, userId: string, role?: string, expireSeconds?: number): Promise<RTCChannelToken> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Generating token', { roomId, userId, role });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expireSeconds || 7200) * 1000);
    const token = `livekit_token_${roomId}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      token,
      expiresAt,
      roomId,
      userId,
    };
  }

  async validateToken(token: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Validating token', { token: token.substring(0, 20) + '...' });

    return true;
  }

  async addParticipant(roomId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Adding participant', { roomId, userId });

    return true;
  }

  async removeParticipant(roomId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Removing participant', { roomId, userId });

    return true;
  }

  async getParticipants(roomId: string): Promise<string[]> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Getting participants', { roomId });

    return [];
  }
}
