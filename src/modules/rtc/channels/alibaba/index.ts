import { createHash, randomBytes } from 'crypto';
import { rtcLogger } from '../../rtc.logger';
import { RTCChannelBase } from '../rtc-channel.base';
import { RTCChannelRoomInfo, RTCChannelToken } from '../rtc-channel.interface';

interface AlibabaTokenPayload {
  appid: string;
  channelid: string;
  userid: string;
  nonce: string;
  timestamp: number;
  token: string;
  gslb: string[];
}

export class AlibabaRTCChannel extends RTCChannelBase {
  getProvider(): 'alibaba' {
    return 'alibaba';
  }

  async createRoom(roomId: string, roomName?: string, type?: 'p2p' | 'group'): Promise<RTCChannelRoomInfo> {
    const roomType = type || 'p2p';
    this.validateInitialized();

    rtcLogger.debug('Alibaba', 'Creating room', { roomId, roomType, roomName });

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
      alibabaRoomId: resolvedRoomId,
      appId: this.config?.appId,
    };
  }

  async destroyRoom(roomId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Alibaba', 'Destroying room', { roomId });
    await this.invokeControlPlaneDelegate('destroyRoom', { roomId });
    this.removeLocalRoom(roomId);
    return true;
  }

  async getRoomInfo(roomId: string): Promise<RTCChannelRoomInfo | null> {
    this.validateInitialized();

    rtcLogger.debug('Alibaba', 'Getting room info', { roomId });

    const delegated = await this.invokeControlPlaneDelegate('getRoomInfo', { roomId });
    if (delegated?.room) {
      const merged = this.mergeLocalRoomWithDelegate(
        this.createOrUpdateLocalRoom(roomId, delegated.room.roomName, delegated.room.type || 'group'),
        delegated,
      );
      return {
        ...merged,
        alibabaRoomId: merged.roomId,
        appId: this.config?.appId,
      };
    }

    const localRoom = this.getLocalRoom(roomId);
    if (!localRoom) {
      return null;
    }
    return {
      ...localRoom,
      alibabaRoomId: localRoom.roomId,
      appId: this.config?.appId,
    };
  }

  async generateToken(roomId: string, userId: string, role?: string, expireSeconds?: number): Promise<RTCChannelToken> {
    this.validateInitialized();

    rtcLogger.debug('Alibaba', 'Generating token', { roomId, userId, role });

    const appId = this.requireAppId();
    const appKey = this.requireAppKey();
    const ttlSeconds = this.normalizeExpireSeconds(expireSeconds, { max: 7 * 24 * 3600 });
    const expireAt = this.nowSeconds() + ttlSeconds;
    const nonce = this.buildNonce();
    const tokenHash = this.computeTokenHash(appId, appKey, roomId, userId, nonce, expireAt);
    const payload: AlibabaTokenPayload = {
      appid: appId,
      channelid: roomId,
      userid: userId,
      nonce,
      timestamp: expireAt,
      token: tokenHash,
      gslb: this.resolveGslbEndpoints(),
    };

    return {
      token: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
      expiresAt: new Date(expireAt * 1000),
      roomId,
      userId,
      role: role || 'participant',
      alibabaAppId: appId,
      tokenType: 'app-auth',
    };
  }

  async validateToken(token: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Alibaba', 'Validating token', { token: token.slice(0, 20) + '...' });
    const payload = this.decodePayload(token);
    if (!payload) {
      return false;
    }
    if (payload.appid !== this.requireAppId()) {
      return false;
    }
    if (!payload.channelid || !payload.userid) {
      return false;
    }
    if (payload.timestamp <= this.nowSeconds()) {
      return false;
    }

    const expectedToken = this.computeTokenHash(
      payload.appid,
      this.requireAppKey(),
      payload.channelid,
      payload.userid,
      payload.nonce,
      payload.timestamp,
    );
    return this.safeEquals(payload.token, expectedToken);
  }

  async addParticipant(roomId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Alibaba', 'Adding participant', { roomId, userId });
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

    rtcLogger.debug('Alibaba', 'Removing participant', { roomId, userId });
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

    rtcLogger.debug('Alibaba', 'Getting participants', { roomId });
    const delegated = await this.invokeControlPlaneDelegate('getParticipants', { roomId });
    const delegatedParticipants = this.resolveDelegateParticipants(delegated);
    if (delegatedParticipants) {
      this.setLocalParticipants(roomId, delegatedParticipants);
      return delegatedParticipants;
    }
    return this.getLocalParticipants(roomId);
  }

  private requireAppId(): string {
    this.validateInitialized();
    if (!this.config?.appId) {
      throw new Error('Alibaba RTC appId is required');
    }
    return this.config.appId;
  }

  private requireAppKey(): string {
    this.validateInitialized();
    if (!this.config?.appKey) {
      throw new Error('Alibaba RTC appKey is required for token generation');
    }
    return this.config.appKey;
  }

  private computeTokenHash(
    appId: string,
    appKey: string,
    channelId: string,
    userId: string,
    nonce: string,
    timestamp: number,
  ): string {
    return createHash('sha256')
      .update(`${appId}${appKey}${channelId}${userId}${nonce}${timestamp}`, 'utf8')
      .digest('hex');
  }

  private buildNonce(): string {
    return `AK-${randomBytes(16).toString('hex')}`;
  }

  private resolveGslbEndpoints(): string[] {
    this.validateInitialized();
    const fromConfig = this.config?.gslb;
    if (Array.isArray(fromConfig)) {
      const list = fromConfig
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (list.length > 0) {
        return list;
      }
    }
    if (typeof this.config?.endpoint === 'string' && this.config.endpoint.trim().length > 0) {
      return [this.config.endpoint.trim()];
    }
    return ['https://rgslb.rtc.aliyuncs.com'];
  }

  private decodePayload(token: string): AlibabaTokenPayload | null {
    try {
      const raw = Buffer.from(token, 'base64').toString('utf8');
      const payload = JSON.parse(raw) as Partial<AlibabaTokenPayload>;
      if (
        typeof payload.appid !== 'string' ||
        typeof payload.channelid !== 'string' ||
        typeof payload.userid !== 'string' ||
        typeof payload.nonce !== 'string' ||
        typeof payload.timestamp !== 'number' ||
        typeof payload.token !== 'string' ||
        !Array.isArray(payload.gslb)
      ) {
        return null;
      }
      return payload as AlibabaTokenPayload;
    } catch {
      return null;
    }
  }
}
