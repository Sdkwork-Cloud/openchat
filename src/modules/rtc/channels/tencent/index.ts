import { createHmac } from 'crypto';
import { deflateSync, inflateSync } from 'zlib';
import { rtcLogger } from '../../rtc.logger';
import { RTCChannelBase } from '../rtc-channel.base';
import { RTCChannelRoomInfo, RTCChannelToken } from '../rtc-channel.interface';

interface TencentUserSigPayload {
  'TLS.ver': string;
  'TLS.identifier': string;
  'TLS.sdkappid': number;
  'TLS.expire': number;
  'TLS.time': number;
  'TLS.userbuf'?: string;
  'TLS.sig': string;
}

export class TencentRTCChannel extends RTCChannelBase {
  getProvider(): 'tencent' {
    return 'tencent';
  }

  async createRoom(roomId: string, roomName?: string, type?: 'p2p' | 'group'): Promise<RTCChannelRoomInfo> {
    const roomType = type || 'p2p';
    this.validateInitialized();

    rtcLogger.debug('Tencent', 'Creating room', { roomId, roomType, roomName });

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
      tencentRoomId: resolvedRoomId,
      appId: this.config?.appId,
    };
  }

  async destroyRoom(roomId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Tencent', 'Destroying room', { roomId });
    await this.invokeControlPlaneDelegate('destroyRoom', { roomId });
    this.removeLocalRoom(roomId);
    return true;
  }

  async getRoomInfo(roomId: string): Promise<RTCChannelRoomInfo | null> {
    this.validateInitialized();

    rtcLogger.debug('Tencent', 'Getting room info', { roomId });

    const delegated = await this.invokeControlPlaneDelegate('getRoomInfo', { roomId });
    if (delegated?.room) {
      const merged = this.mergeLocalRoomWithDelegate(
        this.createOrUpdateLocalRoom(roomId, delegated.room.roomName, delegated.room.type || 'group'),
        delegated,
      );
      return {
        ...merged,
        tencentRoomId: merged.roomId,
        appId: this.config?.appId,
      };
    }

    const localRoom = this.getLocalRoom(roomId);
    if (!localRoom) {
      return null;
    }
    return {
      ...localRoom,
      tencentRoomId: localRoom.roomId,
      appId: this.config?.appId,
    };
  }

  async generateToken(roomId: string, userId: string, role?: string, expireSeconds?: number): Promise<RTCChannelToken> {
    this.validateInitialized();

    rtcLogger.debug('Tencent', 'Generating token', { roomId, userId, role });

    const sdkAppId = this.parseSdkAppId();
    const ttlSeconds = this.normalizeExpireSeconds(expireSeconds, { max: 7 * 24 * 3600 });
    const issuedAt = this.nowSeconds();
    const tencentRole = role || 'participant';
    const userBuf = this.shouldAttachUserBuf()
      ? this.buildUserBuf({
        userId,
        roomId,
        sdkAppId,
        issuedAt,
        ttlSeconds,
        privilegeMap: this.resolvePrivilegeMap(tencentRole),
      })
      : undefined;
    const payload: TencentUserSigPayload = {
      'TLS.ver': '2.0',
      'TLS.identifier': userId,
      'TLS.sdkappid': sdkAppId,
      'TLS.expire': ttlSeconds,
      'TLS.time': issuedAt,
      ...(userBuf ? { 'TLS.userbuf': userBuf } : {}),
      'TLS.sig': '',
    };
    payload['TLS.sig'] = this.signPayload(payload);
    const token = this.encodePayload(payload);

    return {
      token,
      expiresAt: new Date((issuedAt + ttlSeconds) * 1000),
      roomId,
      userId,
      role: tencentRole,
      tencentSdkAppId: sdkAppId,
      tencentUserBufEnabled: !!userBuf,
      tokenType: 'usersig',
    };
  }

  async validateToken(token: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Tencent', 'Validating token', { token: token.slice(0, 20) + '...' });
    const payload = this.decodePayload(token);
    if (!payload) {
      return false;
    }
    const sdkAppId = this.parseSdkAppId();
    if (payload['TLS.ver'] !== '2.0') {
      return false;
    }
    if (!payload['TLS.identifier']) {
      return false;
    }
    if (payload['TLS.sdkappid'] !== sdkAppId) {
      return false;
    }
    if (payload['TLS.expire'] <= 0) {
      return false;
    }
    if (payload['TLS.time'] + payload['TLS.expire'] <= this.nowSeconds()) {
      return false;
    }
    if (payload['TLS.userbuf']) {
      const parsedUserBuf = this.parseUserBuf(payload['TLS.userbuf']);
      if (!parsedUserBuf) {
        return false;
      }
      if (parsedUserBuf.account !== payload['TLS.identifier']) {
        return false;
      }
      if (parsedUserBuf.sdkAppId !== payload['TLS.sdkappid']) {
        return false;
      }
      if (parsedUserBuf.expireAt <= this.nowSeconds()) {
        return false;
      }
    }

    const providedSig = payload['TLS.sig'];
    const expectedSig = this.signPayload({
      ...payload,
      'TLS.sig': '',
    });
    return this.safeEquals(providedSig, expectedSig);
  }

  async addParticipant(roomId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Tencent', 'Adding participant', { roomId, userId });
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

    rtcLogger.debug('Tencent', 'Removing participant', { roomId, userId });
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

    rtcLogger.debug('Tencent', 'Getting participants', { roomId });
    const delegated = await this.invokeControlPlaneDelegate('getParticipants', { roomId });
    const delegatedParticipants = this.resolveDelegateParticipants(delegated);
    if (delegatedParticipants) {
      this.setLocalParticipants(roomId, delegatedParticipants);
      return delegatedParticipants;
    }
    return this.getLocalParticipants(roomId);
  }

  private parseSdkAppId(): number {
    this.validateInitialized();
    const value = Number(this.config?.appId);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Tencent RTC appId must be a positive integer SDKAppID');
    }
    return value;
  }

  private signPayload(payload: TencentUserSigPayload): string {
    this.validateInitialized();
    const secret = this.config?.appSecret;
    if (!secret) {
      throw new Error('Tencent RTC appSecret is required');
    }
    const content = [
      `TLS.identifier:${payload['TLS.identifier']}`,
      `TLS.sdkappid:${payload['TLS.sdkappid']}`,
      `TLS.time:${payload['TLS.time']}`,
      `TLS.expire:${payload['TLS.expire']}`,
      ...(payload['TLS.userbuf'] ? [`TLS.userbuf:${payload['TLS.userbuf']}`] : []),
    ].join('\n') + '\n';
    return createHmac('sha256', secret)
      .update(content)
      .digest('base64');
  }

  private encodePayload(payload: TencentUserSigPayload): string {
    const json = JSON.stringify(payload);
    const compressed = deflateSync(Buffer.from(json, 'utf8'));
    return compressed
      .toString('base64')
      .replace(/\+/g, '*')
      .replace(/\//g, '-')
      .replace(/=/g, '_');
  }

  private decodePayload(token: string): TencentUserSigPayload | null {
    try {
      const rawBase64 = token
        .replace(/\*/g, '+')
        .replace(/-/g, '/')
        .replace(/_/g, '=');
      const inflated = inflateSync(Buffer.from(rawBase64, 'base64'));
      const parsed = JSON.parse(inflated.toString('utf8')) as Partial<TencentUserSigPayload>;
      if (
        typeof parsed['TLS.ver'] !== 'string' ||
        typeof parsed['TLS.identifier'] !== 'string' ||
        typeof parsed['TLS.sdkappid'] !== 'number' ||
        typeof parsed['TLS.expire'] !== 'number' ||
        typeof parsed['TLS.time'] !== 'number' ||
        (parsed['TLS.userbuf'] !== undefined && typeof parsed['TLS.userbuf'] !== 'string') ||
        typeof parsed['TLS.sig'] !== 'string'
      ) {
        return null;
      }
      return parsed as TencentUserSigPayload;
    } catch {
      return null;
    }
  }

  private shouldAttachUserBuf(): boolean {
    this.validateInitialized();
    const value = this.config?.tencentEnableUserBuf ?? this.config?.tencentEnablePrivateMapKey;
    return value === true;
  }

  private resolvePrivilegeMap(role: string): number {
    this.validateInitialized();
    const normalizedRole = role.trim().toLowerCase();
    if (normalizedRole === 'audience' || normalizedRole === 'viewer' || normalizedRole === 'listener') {
      return this.readPrivilegeMapFromConfig('tencentAudiencePrivilegeMap', 42);
    }
    if (normalizedRole === 'participant' || normalizedRole === 'member') {
      return this.readPrivilegeMapFromConfig('tencentParticipantPrivilegeMap', 62);
    }
    return this.readPrivilegeMapFromConfig('tencentHostPrivilegeMap', 255);
  }

  private readPrivilegeMapFromConfig(key: string, defaultValue: number): number {
    this.validateInitialized();
    const raw = this.config?.[key];
    if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= 0xffffffff) {
      return raw;
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 0xffffffff) {
        return parsed;
      }
    }
    return defaultValue;
  }

  private buildUserBuf(args: {
    userId: string;
    roomId: string;
    sdkAppId: number;
    issuedAt: number;
    ttlSeconds: number;
    privilegeMap: number;
  }): string {
    const userIdBuffer = Buffer.from(args.userId, 'utf8');
    if (userIdBuffer.length === 0 || userIdBuffer.length > 32) {
      throw new Error('Tencent RTC userId must be 1~32 bytes when userbuf is enabled');
    }
    const roomIdRaw = args.roomId.trim();
    if (roomIdRaw.length === 0) {
      throw new Error('Tencent RTC roomId is required when userbuf is enabled');
    }
    const roomAsNumber = Number(roomIdRaw);
    const useNumericRoom =
      Number.isInteger(roomAsNumber) &&
      roomAsNumber > 0 &&
      roomAsNumber <= 0xffffffff &&
      /^[0-9]+$/.test(roomIdRaw);
    const roomStringBuffer = useNumericRoom ? Buffer.alloc(0) : Buffer.from(roomIdRaw, 'utf8');
    if (roomStringBuffer.length > 64) {
      throw new Error('Tencent RTC string roomId must be <= 64 bytes when userbuf is enabled');
    }

    const version = roomStringBuffer.length > 0 ? 1 : 0;
    const bufferSize =
      1 + // version
      2 + userIdBuffer.length +
      4 + // sdk app id
      4 + // auth id
      4 + // expire at
      4 + // privilege map
      4 + // account type
      (roomStringBuffer.length > 0 ? 2 + roomStringBuffer.length : 0);

    const buffer = Buffer.allocUnsafe(bufferSize);
    let offset = 0;
    buffer.writeUInt8(version, offset);
    offset += 1;
    buffer.writeUInt16BE(userIdBuffer.length, offset);
    offset += 2;
    userIdBuffer.copy(buffer, offset);
    offset += userIdBuffer.length;
    buffer.writeUInt32BE(args.sdkAppId >>> 0, offset);
    offset += 4;
    buffer.writeUInt32BE((useNumericRoom ? roomAsNumber : 0) >>> 0, offset);
    offset += 4;
    const expireAt = args.issuedAt + args.ttlSeconds;
    buffer.writeUInt32BE(expireAt >>> 0, offset);
    offset += 4;
    buffer.writeUInt32BE(args.privilegeMap >>> 0, offset);
    offset += 4;
    buffer.writeUInt32BE(0, offset); // account type
    offset += 4;
    if (roomStringBuffer.length > 0) {
      buffer.writeUInt16BE(roomStringBuffer.length, offset);
      offset += 2;
      roomStringBuffer.copy(buffer, offset);
      offset += roomStringBuffer.length;
    }
    return buffer.toString('base64');
  }

  private parseUserBuf(encodedUserBuf: string): {
    account: string;
    sdkAppId: number;
    expireAt: number;
  } | null {
    try {
      const buffer = Buffer.from(encodedUserBuf, 'base64');
      let offset = 0;
      if (buffer.length < 1 + 2 + 4 + 4 + 4 + 4 + 4) {
        return null;
      }
      const version = buffer.readUInt8(offset);
      offset += 1;
      if (version !== 0 && version !== 1) {
        return null;
      }
      const accountLen = buffer.readUInt16BE(offset);
      offset += 2;
      if (buffer.length < offset + accountLen + 4 + 4 + 4 + 4 + 4) {
        return null;
      }
      const account = buffer.subarray(offset, offset + accountLen).toString('utf8');
      offset += accountLen;
      const sdkAppId = buffer.readUInt32BE(offset);
      offset += 4;
      offset += 4; // auth id
      const expireAt = buffer.readUInt32BE(offset);
      offset += 4;
      offset += 4; // privilege map
      offset += 4; // account type
      if (version === 1) {
        if (buffer.length < offset + 2) {
          return null;
        }
        const roomStrLen = buffer.readUInt16BE(offset);
        offset += 2;
        if (buffer.length < offset + roomStrLen) {
          return null;
        }
      }
      return {
        account,
        sdkAppId,
        expireAt,
      };
    } catch {
      return null;
    }
  }
}
