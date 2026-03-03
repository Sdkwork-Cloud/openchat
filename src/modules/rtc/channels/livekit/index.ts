import { RTCChannelBase } from '../rtc-channel.base';
import { RTCChannelRoomInfo, RTCChannelToken } from '../rtc-channel.interface';
import { rtcLogger } from '../../rtc.logger';

export class LiveKitRTCChannel extends RTCChannelBase {
  getProvider(): 'livekit' {
    return 'livekit';
  }

  async createRoom(roomId: string, roomName?: string, type?: 'p2p' | 'group'): Promise<RTCChannelRoomInfo> {
    const roomType = type || 'p2p';
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Creating room', { roomId, roomType, roomName });

    const fallback = this.createOrUpdateLocalRoom(roomId, roomName, roomType);
    const delegated = await this.invokeControlPlaneDelegate('createRoom', {
      roomId,
      roomName,
      type: roomType,
    });
    const room = this.mergeLocalRoomWithDelegate(fallback, delegated);
    const resolvedRoomId = room.roomId;

    return {
      ...room,
      roomId: resolvedRoomId,
      livekitRoomId: resolvedRoomId,
    };
  }

  async destroyRoom(roomId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Destroying room', { roomId });
    await this.invokeControlPlaneDelegate('destroyRoom', { roomId });
    this.removeLocalRoom(roomId);
    return true;
  }

  async getRoomInfo(roomId: string): Promise<RTCChannelRoomInfo | null> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Getting room info', { roomId });

    const delegated = await this.invokeControlPlaneDelegate('getRoomInfo', { roomId });
    if (delegated?.room) {
      const merged = this.mergeLocalRoomWithDelegate(
        this.createOrUpdateLocalRoom(roomId, delegated.room.roomName, delegated.room.type || 'group'),
        delegated,
      );
      return {
        ...merged,
        livekitRoomId: merged.roomId,
      };
    }

    const localRoom = this.getLocalRoom(roomId);
    if (!localRoom) {
      return null;
    }
    return {
      ...localRoom,
      livekitRoomId: localRoom.roomId,
    };
  }

  async generateToken(roomId: string, userId: string, role?: string, expireSeconds?: number): Promise<RTCChannelToken> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Generating token', { roomId, userId, role });

    return this.issueSignedToken(roomId, userId, role, expireSeconds);
  }

  async validateToken(token: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Validating token', { token: token.slice(0, 20) + '...' });
    return this.verifySignedToken(token, this.getProvider());
  }

  async addParticipant(roomId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Adding participant', { roomId, userId });
    const delegated = await this.invokeControlPlaneDelegate('addParticipant', { roomId, userId });
    const delegatedParticipants = this.resolveDelegateParticipants(delegated);
    if (delegatedParticipants) {
      this.setLocalParticipants(roomId, delegatedParticipants);
    } else {
      this.addLocalParticipant(roomId, userId);
    }
    return true;
  }

  async removeParticipant(roomId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Removing participant', { roomId, userId });
    const delegated = await this.invokeControlPlaneDelegate('removeParticipant', { roomId, userId });
    const delegatedParticipants = this.resolveDelegateParticipants(delegated);
    if (delegatedParticipants) {
      this.setLocalParticipants(roomId, delegatedParticipants);
    } else {
      this.removeLocalParticipant(roomId, userId);
    }
    return true;
  }

  async getParticipants(roomId: string): Promise<string[]> {
    this.validateInitialized();

    rtcLogger.debug('LiveKit', 'Getting participants', { roomId });
    const delegated = await this.invokeControlPlaneDelegate('getParticipants', { roomId });
    const delegatedParticipants = this.resolveDelegateParticipants(delegated);
    if (delegatedParticipants) {
      this.setLocalParticipants(roomId, delegatedParticipants);
      return delegatedParticipants;
    }
    return this.getLocalParticipants(roomId);
  }
}
