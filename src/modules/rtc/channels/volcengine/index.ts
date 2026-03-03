import axios from 'axios';
import { createHash } from 'crypto';
import { rtcLogger } from '../../rtc.logger';
import { RTCChannelBase } from '../rtc-channel.base';
import {
  RTCChannelRecordingTask,
  RTCChannelRoomInfo,
  RTCChannelStartRecordingRequest,
  RTCChannelStopRecordingRequest,
  RTCChannelToken,
} from '../rtc-channel.interface';

interface VolcengineTokenIssuerResponse {
  token?: string;
  appToken?: string;
  expiresAt?: string | number;
  expireAt?: string | number;
  data?: {
    token?: string;
    appToken?: string;
    expiresAt?: string | number;
    expireAt?: string | number;
  };
}

interface VolcengineOpenApiResult {
  ResponseMetadata?: {
    RequestId?: string;
    Action?: string;
    Version?: string;
    Service?: string;
    Region?: string;
    Error?: {
      CodeN?: number;
      Code?: string;
      Message?: string;
    };
  };
  Result?: {
    Token?: string;
    AppToken?: string;
    ExpireTime?: number;
    ExpiresAt?: number;
    TaskID?: string;
    TaskId?: string;
    TaskIDStr?: string;
    Status?: string | number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

type VolcengineTokenMode = 'auto' | 'delegate' | 'openapi' | 'local';
type VolcengineOpenApiMethod = 'GET' | 'POST';

export class VolcengineRTCChannel extends RTCChannelBase {
  getProvider(): 'volcengine' {
    return 'volcengine';
  }

  async createRoom(roomId: string, roomName?: string, type?: 'p2p' | 'group'): Promise<RTCChannelRoomInfo> {
    const roomType = type || 'p2p';
    this.validateInitialized();

    rtcLogger.debug('Volcengine', 'Creating room', { roomId, roomType, roomName });

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
      volcengineRoomId: resolvedRoomId,
      appId: this.config?.appId,
    };
  }

  async destroyRoom(roomId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Volcengine', 'Destroying room', { roomId });
    await this.invokeControlPlaneDelegate('destroyRoom', { roomId });
    this.removeLocalRoom(roomId);
    return true;
  }

  async getRoomInfo(roomId: string): Promise<RTCChannelRoomInfo | null> {
    this.validateInitialized();

    rtcLogger.debug('Volcengine', 'Getting room info', { roomId });

    const delegated = await this.invokeControlPlaneDelegate('getRoomInfo', { roomId });
    if (delegated?.room) {
      const merged = this.mergeLocalRoomWithDelegate(
        this.createOrUpdateLocalRoom(roomId, delegated.room.roomName, delegated.room.type || 'group'),
        delegated,
      );
      return {
        ...merged,
        volcengineRoomId: merged.roomId,
        appId: this.config?.appId,
      };
    }

    const localRoom = this.getLocalRoom(roomId);
    if (!localRoom) {
      return null;
    }
    return {
      ...localRoom,
      volcengineRoomId: localRoom.roomId,
      appId: this.config?.appId,
    };
  }

  async generateToken(roomId: string, userId: string, role?: string, expireSeconds?: number): Promise<RTCChannelToken> {
    this.validateInitialized();

    rtcLogger.debug('Volcengine', 'Generating token', { roomId, userId, role });

    const mode = this.resolveTokenMode();
    const ttlSeconds = this.normalizeExpireSeconds(expireSeconds, { max: 7 * 24 * 3600 });
    const preferredRole = role || 'participant';

    if (mode === 'delegate' || mode === 'auto') {
      const delegated = await this.tryGenerateTokenByDelegatedIssuer(roomId, userId, preferredRole, ttlSeconds);
      if (delegated) {
        return delegated;
      }
      if (mode === 'delegate' && !this.allowLocalFallback()) {
        throw new Error('Volcengine delegated token issuer unavailable');
      }
    }

    if (mode === 'openapi' || mode === 'auto') {
      const openApiToken = await this.tryGenerateTokenByOpenApi(roomId, userId, preferredRole, ttlSeconds);
      if (openApiToken) {
        return openApiToken;
      }
      if (mode === 'openapi' && !this.allowLocalFallback()) {
        throw new Error('Volcengine OpenAPI GetAppToken generation unavailable');
      }
    }

    if (mode === 'local' || this.allowLocalFallback()) {
      return this.issueSignedToken(roomId, userId, preferredRole, ttlSeconds, {
        issuer: 'local',
        tokenMode: 'local-fallback',
        volcengineAppId: this.config?.appId,
      });
    }

    throw new Error('Volcengine token generation failed in strict mode');
  }

  async validateToken(token: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Volcengine', 'Validating token', { token: token.slice(0, 20) + '...' });
    if (token.startsWith('rtc.volcengine.')) {
      return this.verifySignedToken(token, this.getProvider());
    }
    // Official Volcengine tokens are opaque, so service-layer DB lookup is the source of truth.
    return token.trim().length >= 16;
  }

  async addParticipant(roomId: string, userId: string): Promise<boolean> {
    this.validateInitialized();

    rtcLogger.debug('Volcengine', 'Adding participant', { roomId, userId });
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

    rtcLogger.debug('Volcengine', 'Removing participant', { roomId, userId });
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

    rtcLogger.debug('Volcengine', 'Getting participants', { roomId });
    const delegated = await this.invokeControlPlaneDelegate('getParticipants', { roomId });
    const delegatedParticipants = this.resolveDelegateParticipants(delegated);
    if (delegatedParticipants) {
      this.setLocalParticipants(roomId, delegatedParticipants);
      return delegatedParticipants;
    }
    return this.getLocalParticipants(roomId);
  }

  async startRecording(request: RTCChannelStartRecordingRequest): Promise<RTCChannelRecordingTask> {
    this.validateInitialized();
    const roomId = this.normalizeOpenApiIdentifier('roomId', request.roomId);

    const now = new Date();
    const extraStartOptions = this.readObjectConfig(
      'recordStartOptions',
      'volcRecordStartOptions',
    );
    const requestBody: Record<string, unknown> = {
      ...extraStartOptions,
      AppId: this.parseOpenApiAppIdForRecord(),
      RoomId: roomId,
      TaskId: this.resolveRecordingTaskId(roomId, request.taskId),
    };
    const requireStorageConfig = this.readBooleanConfig(
      true,
      'requireRecordStorageConfig',
      'volcRequireRecordStorageConfig',
    );
    if (requestBody.StorageConfig === undefined && requestBody.storageConfig === undefined) {
      if (requireStorageConfig) {
        throw new Error(
          'Volcengine StartRecord requires StorageConfig. Configure recordStartOptions.StorageConfig first.',
        );
      }
      rtcLogger.warn(
        'Volcengine',
        'StartRecord payload does not include StorageConfig. Ensure recordStartOptions contains provider storage settings.',
        { roomId },
      );
    }

    const response = await this.invokeRtcOpenApi({
      action: 'StartRecord',
      version: '2023-11-01',
      method: 'POST',
      payload: requestBody,
    });
    const result = response.Result || {};
    const taskId = this.pickString(
      result.TaskId,
      result.TaskID,
      result.TaskIDStr,
      requestBody.TaskId,
    );

    const task: RTCChannelRecordingTask = {
      taskId,
      roomId,
      status: this.normalizeRecordingStatus(result.Status, 'recording'),
      startTime: now,
      metadata: {
        requestId: response.ResponseMetadata?.RequestId,
        provider: this.getProvider(),
        raw: response,
      },
    };
    rtcLogger.log('Volcengine', 'StartRecord succeeded', {
      roomId,
      taskId,
      requestId: response.ResponseMetadata?.RequestId,
    });
    return task;
  }

  async stopRecording(request: RTCChannelStopRecordingRequest): Promise<RTCChannelRecordingTask> {
    this.validateInitialized();
    const roomId = this.normalizeOpenApiIdentifier('roomId', request.roomId);
    const taskId = this.normalizeOpenApiTaskId(request.taskId);

    const extraStopOptions = this.readObjectConfig(
      'recordStopOptions',
      'volcRecordStopOptions',
    );
    const requestBody: Record<string, unknown> = {
      ...extraStopOptions,
      AppId: this.parseOpenApiAppIdForRecord(),
      RoomId: roomId,
      TaskId: taskId,
    };

    const response = await this.invokeRtcOpenApi({
      action: 'StopRecord',
      version: '2023-11-01',
      method: 'POST',
      payload: requestBody,
    });
    const result = response.Result || {};
    const resolvedTaskId = this.pickString(result.TaskId, result.TaskID, taskId);
    const now = new Date();

    rtcLogger.log('Volcengine', 'StopRecord succeeded', {
      roomId,
      taskId: resolvedTaskId,
      requestId: response.ResponseMetadata?.RequestId,
    });
    return {
      taskId: resolvedTaskId,
      roomId,
      status: this.normalizeRecordingStatus(result.Status, 'stopped'),
      endTime: now,
      metadata: {
        requestId: response.ResponseMetadata?.RequestId,
        provider: this.getProvider(),
        raw: response,
      },
    };
  }

  async getRecordingTask(roomId: string, taskId: string): Promise<RTCChannelRecordingTask | null> {
    this.validateInitialized();
    if (!roomId?.trim() || !taskId?.trim()) {
      return null;
    }
    const normalizedRoomId = this.normalizeOpenApiIdentifier('roomId', roomId);
    const normalizedTaskId = this.normalizeOpenApiTaskId(taskId);

    const queryPayload: Record<string, unknown> = {
      AppId: this.parseOpenApiAppIdForRecord(),
      RoomId: normalizedRoomId,
      TaskId: normalizedTaskId,
    };
    const response = await this.invokeRtcOpenApi({
      action: 'GetRecordTask',
      version: '2023-11-01',
      method: 'GET',
      payload: queryPayload,
    });
    const result = response.Result || {};
    const resolvedTaskId = this.pickString(
      result.TaskId,
      result.TaskID,
      normalizedTaskId,
    );
    const resolvedRoomId = this.pickString(
      result.RoomId,
      result.RoomID,
      normalizedRoomId,
    );

    return {
      taskId: resolvedTaskId,
      roomId: resolvedRoomId,
      status: this.normalizeRecordingStatus(result.Status),
      startTime: this.pickDate(result.StartTime, result.StartTs, result.StartTimestamp),
      endTime: this.pickDate(result.EndTime, result.EndTs, result.EndTimestamp),
      fileName: this.pickString(result.FileName, result.ObjectName, result.OutputFileName),
      filePath: this.pickString(result.FilePath, result.FileUrl, result.PlayURL, result.Url),
      fileType: this.pickString(result.FileType, result.Format, result.Container),
      fileSize: this.pickNumber(result.FileSize, result.Size),
      metadata: {
        requestId: response.ResponseMetadata?.RequestId,
        provider: this.getProvider(),
        raw: response,
      },
    };
  }

  private resolveTokenMode(): VolcengineTokenMode {
    const raw =
      String(this.config?.volcTokenMode || this.config?.tokenMode || 'auto')
        .trim()
        .toLowerCase();
    if (raw === 'delegate' || raw === 'openapi' || raw === 'local' || raw === 'auto') {
      return raw;
    }
    return 'auto';
  }

  private allowLocalFallback(): boolean {
    const value = this.config?.allowLocalTokenFallback;
    if (typeof value === 'boolean') {
      return value;
    }
    return true;
  }

  private async tryGenerateTokenByDelegatedIssuer(
    roomId: string,
    userId: string,
    role: string,
    ttlSeconds: number,
  ): Promise<RTCChannelToken | null> {
    this.validateInitialized();
    const issuerUrl = this.readStringConfig('tokenIssuerUrl', 'volcTokenIssuerUrl');
    if (!issuerUrl) {
      return null;
    }

    try {
      const timeoutMs = this.readNumberConfig(2000, 'tokenIssuerTimeoutMs', 'volcTokenIssuerTimeoutMs');
      const authToken = this.readStringConfig('tokenIssuerAuthToken', 'volcTokenIssuerAuthToken');
      const extraHeaders = this.readObjectConfig('tokenIssuerHeaders', 'volcTokenIssuerHeaders');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      for (const [key, value] of Object.entries(extraHeaders)) {
        if (typeof value === 'string' && value.trim().length > 0) {
          headers[key] = value;
        }
      }

      const requestBody = {
        provider: 'volcengine',
        appId: this.config?.appId,
        appKey: this.config?.appKey,
        roomId,
        userId,
        role,
        expireSeconds: ttlSeconds,
      };
      const response = await axios.post<VolcengineTokenIssuerResponse>(issuerUrl, requestBody, {
        timeout: timeoutMs,
        headers,
      });
      const tokenValue = this.extractVolcengineToken(response.data);
      if (!tokenValue) {
        return null;
      }

      const expiresAt = this.extractExpiry(response.data, ttlSeconds);
      return {
        token: tokenValue,
        expiresAt,
        roomId,
        userId,
        role,
        issuer: 'volcengine-delegate',
        tokenMode: 'delegate',
      };
    } catch (error) {
      rtcLogger.warn('Volcengine', 'Delegated token issuance failed', {
        roomId,
        userId,
        error: String(error),
      });
      return null;
    }
  }

  private async tryGenerateTokenByOpenApi(
    roomId: string,
    userId: string,
    _role: string,
    ttlSeconds: number,
  ): Promise<RTCChannelToken | null> {
    this.validateInitialized();
    const credentials = this.getOpenApiCredentials();
    if (!credentials) {
      return null;
    }

    try {
      const appId = this.parseOpenApiNumeric('appId', this.config?.appId);
      const rtcUserId = this.parseOpenApiNumeric('userId', userId);
      const expireAtMs = (this.nowSeconds() + ttlSeconds) * 1000;
      const bodyObject: Record<string, unknown> = {
        AppId: appId,
        UserId: rtcUserId,
        ExpireTime: expireAtMs,
      };
      const response = await this.invokeRtcOpenApi({
        action: 'GetAppToken',
        version: '2020-12-01',
        method: 'POST',
        payload: bodyObject,
        credentials,
      });
      const tokenResponse = this.toTokenIssuerResponse(response);
      const tokenValue = this.extractVolcengineToken(tokenResponse);
      if (!tokenValue) {
        const fromOpenApiResult = response.Result?.Token || response.Result?.AppToken;
        if (typeof fromOpenApiResult !== 'string' || fromOpenApiResult.trim().length === 0) {
          const apiError = response.ResponseMetadata?.Error;
          if (apiError?.Code || apiError?.Message) {
            throw new Error(`${apiError.Code || 'VolcengineOpenApiError'}: ${apiError.Message || ''}`.trim());
          }
          return null;
        }
      }

      const resolvedToken = tokenValue
        || (response.Result?.Token || response.Result?.AppToken || '').trim();
      if (!resolvedToken) {
        return null;
      }
      return {
        token: resolvedToken,
        expiresAt: this.extractOpenApiExpiry(response, ttlSeconds),
        roomId,
        userId,
        role: _role,
        issuer: 'volcengine-openapi',
        tokenMode: 'openapi',
      };
    } catch (error) {
      rtcLogger.warn('Volcengine', 'OpenAPI GetAppToken failed', {
        roomId,
        userId,
        error: String(error),
      });
      return null;
    }
  }

  private extractVolcengineToken(data: VolcengineTokenIssuerResponse | undefined): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const direct = typeof data.token === 'string'
      ? data.token
      : typeof data.appToken === 'string'
        ? data.appToken
        : null;
    if (direct && direct.trim().length > 0) {
      return direct.trim();
    }
    if (data.data && typeof data.data === 'object') {
      const nested = typeof data.data.token === 'string'
        ? data.data.token
        : typeof data.data.appToken === 'string'
          ? data.data.appToken
          : null;
      if (nested && nested.trim().length > 0) {
        return nested.trim();
      }
    }
    return null;
  }

  private extractExpiry(
    data: VolcengineTokenIssuerResponse | undefined,
    fallbackTtlSeconds: number,
  ): Date {
    const fallback = new Date((this.nowSeconds() + fallbackTtlSeconds) * 1000);
    if (!data || typeof data !== 'object') {
      return fallback;
    }
    const candidate = data.expiresAt ?? data.expireAt ?? data.data?.expiresAt ?? data.data?.expireAt;
    if (typeof candidate === 'number') {
      const millis = candidate > 100000000000 ? candidate : candidate * 1000;
      return new Date(millis);
    }
    if (typeof candidate === 'string') {
      const asNumber = Number(candidate);
      if (Number.isFinite(asNumber) && asNumber > 0) {
        const millis = asNumber > 100000000000 ? asNumber : asNumber * 1000;
        return new Date(millis);
      }
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return fallback;
  }

  private extractOpenApiExpiry(
    data: VolcengineOpenApiResult | undefined,
    fallbackTtlSeconds: number,
  ): Date {
    const fallback = new Date((this.nowSeconds() + fallbackTtlSeconds) * 1000);
    if (!data || typeof data !== 'object') {
      return fallback;
    }
    const candidate = data.Result?.ExpireTime ?? data.Result?.ExpiresAt;
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      const millis = candidate > 100000000000 ? candidate : candidate * 1000;
      return new Date(millis);
    }
    return fallback;
  }

  private getOpenApiCredentials():
    | { accessKeyId: string; secretKey: string; sessionToken?: string }
    | null {
    this.validateInitialized();
    const accessKeyId = this.readStringConfig(
      'accessKeyId',
      'volcAccessKeyId',
      'volcengineAccessKeyId',
    );
    const secretKey = this.readStringConfig(
      'secretAccessKey',
      'secretKey',
      'volcSecretAccessKey',
      'volcengineSecretAccessKey',
    );
    if (!accessKeyId || !secretKey) {
      return null;
    }
    const sessionToken = this.readStringConfig(
      'sessionToken',
      'volcSessionToken',
      'securityToken',
    );
    return {
      accessKeyId,
      secretKey,
      sessionToken,
    };
  }

  private async invokeRtcOpenApi(args: {
    action: string;
    version: string;
    method: VolcengineOpenApiMethod;
    payload?: Record<string, unknown>;
    credentials?: { accessKeyId: string; secretKey: string; sessionToken?: string };
  }): Promise<VolcengineOpenApiResult> {
    this.validateInitialized();
    const credentials = args.credentials || this.getOpenApiCredentials();
    if (!credentials) {
      throw new Error('Volcengine OpenAPI credentials are not configured');
    }

    const host = this.resolveOpenApiHost();
    const region = this.config?.region || 'cn-north-1';
    const timeoutMs = this.readNumberConfig(3000, 'openApiTimeoutMs', 'volcOpenApiTimeoutMs');
    const payload = args.payload || {};
    const method = args.method;
    const body = method === 'POST'
      ? JSON.stringify(payload)
      : '';
    const signerRequest = {
      region,
      method,
      params: method === 'GET'
        ? { Action: args.action, Version: args.version, ...payload }
        : { Action: args.action, Version: args.version },
      headers: {
        Host: host,
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body,
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const openApiSdk = require('@volcengine/openapi') as { Signer?: new (...args: any[]) => any };
    if (!openApiSdk?.Signer) {
      throw new Error('Missing @volcengine/openapi Signer. Please install @volcengine/openapi');
    }
    const signer = new openApiSdk.Signer(signerRequest, 'rtc');
    signer.addAuthorization({
      accessKeyId: credentials.accessKeyId,
      secretKey: credentials.secretKey,
      sessionToken: credentials.sessionToken,
    });

    const url = `https://${host}/`;
    const response = method === 'GET'
      ? await axios.get<VolcengineOpenApiResult>(url, {
        timeout: timeoutMs,
        headers: signerRequest.headers,
        params: {
          ...payload,
          Action: args.action,
          Version: args.version,
        },
      })
      : await axios.post<VolcengineOpenApiResult>(`${url}?Action=${args.action}&Version=${args.version}`, body, {
        timeout: timeoutMs,
        headers: signerRequest.headers,
      });

    const result = response.data || {};
    this.assertOpenApiSuccess(args.action, result);
    return result;
  }

  private assertOpenApiSuccess(action: string, result: VolcengineOpenApiResult): void {
    const metadata = result?.ResponseMetadata;
    const error = metadata?.Error;
    if (!error) {
      return;
    }
    if (error.Code || error.Message || (typeof error.CodeN === 'number' && error.CodeN !== 0)) {
      const code = error.Code || (error.CodeN !== undefined ? String(error.CodeN) : 'VolcengineOpenApiError');
      const message = error.Message || 'Unknown Volcengine OpenAPI error';
      throw new Error(`[${action}] ${code}: ${message}`);
    }
  }

  private toTokenIssuerResponse(result: VolcengineOpenApiResult): VolcengineTokenIssuerResponse {
    return {
      token: this.pickString(result.Result?.Token),
      appToken: this.pickString(result.Result?.AppToken),
      expiresAt: this.pickNumber(result.Result?.ExpireTime, result.Result?.ExpiresAt),
    };
  }

  private normalizeRecordingStatus(
    input: unknown,
    fallback: RTCChannelRecordingTask['status'] = 'processing',
  ): RTCChannelRecordingTask['status'] {
    if (typeof input === 'number' && Number.isFinite(input)) {
      const value = Math.trunc(input);
      if (value === 0 || value === 1) return 'recording';
      if (value === 2) return 'processing';
      if (value === 3) return 'completed';
      if (value === 4) return 'failed';
      if (value === 5) return 'stopped';
      return fallback;
    }
    if (typeof input !== 'string') {
      return fallback;
    }
    const normalized = input.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    if (normalized.includes('record') || normalized.includes('running') || normalized === 'start') {
      return 'recording';
    }
    if (normalized.includes('process') || normalized.includes('upload') || normalized.includes('transcode')) {
      return 'processing';
    }
    if (normalized.includes('success') || normalized.includes('complete') || normalized.includes('finish')) {
      return 'completed';
    }
    if (normalized.includes('stop') || normalized.includes('cancel')) {
      return 'stopped';
    }
    if (normalized.includes('fail') || normalized.includes('error')) {
      return 'failed';
    }
    return fallback;
  }

  private pickString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return '';
  }

  private pickNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  private pickDate(...values: unknown[]): Date | undefined {
    for (const value of values) {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
      }
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        const millis = value > 100000000000 ? value : value * 1000;
        const date = new Date(millis);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
      if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric > 0) {
          const millis = numeric > 100000000000 ? numeric : numeric * 1000;
          const asDate = new Date(millis);
          if (!Number.isNaN(asDate.getTime())) {
            return asDate;
          }
        }
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  private toDeterministicPositiveInt(input: string): number {
    const digest = createHash('sha256').update(input).digest();
    const high = digest.readUInt32BE(0);
    const low = digest.readUInt32BE(4);
    const combined = (BigInt(high) << 32n) | BigInt(low);
    const safeRange = 9007199254740991n; // Number.MAX_SAFE_INTEGER
    return Number((combined % safeRange) + 1n);
  }

  private readStringConfig(...keys: string[]): string | undefined {
    this.validateInitialized();
    for (const key of keys) {
      const value = this.config?.[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }

  private readNumberConfig(fallback: number, ...keys: string[]): number {
    this.validateInitialized();
    for (const key of keys) {
      const value = this.config?.[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    return fallback;
  }

  private readBooleanConfig(fallback: boolean, ...keys: string[]): boolean {
    this.validateInitialized();
    for (const key of keys) {
      const value = this.config?.[key];
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
          return true;
        }
        if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
          return false;
        }
      }
    }
    return fallback;
  }

  private readObjectConfig(...keys: string[]): Record<string, unknown> {
    this.validateInitialized();
    for (const key of keys) {
      const value = this.config?.[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }
    return {};
  }

  private resolveOpenApiHost(): string {
    return this.readStringConfig('openApiHost', 'volcOpenApiHost') || 'rtc.volcengineapi.com';
  }

  private parseOpenApiAppIdForRecord(): string {
    const raw = this.config?.appId;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      return String(Math.trunc(raw));
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
    throw new Error('Volcengine recording OpenAPI requires non-empty appId');
  }

  private normalizeOpenApiIdentifier(label: string, value: unknown): string {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return String(Math.trunc(value));
    }
    if (typeof value !== 'string') {
      throw new Error(`Volcengine OpenAPI requires ${label}`);
    }
    const normalized = value.trim();
    if (!normalized) {
      throw new Error(`Volcengine OpenAPI requires ${label}`);
    }
    if (normalized.length > 128) {
      throw new Error(`Volcengine OpenAPI ${label} exceeds max length 128`);
    }
    return normalized;
  }

  private normalizeOpenApiTaskId(value: unknown): string {
    const normalized = this.normalizeOpenApiIdentifier('taskId', value);
    if (!/^[A-Za-z0-9_@.-]{1,128}$/.test(normalized)) {
      throw new Error('Volcengine OpenAPI taskId format is invalid');
    }
    return normalized;
  }

  private resolveRecordingTaskId(roomId: string, preferredTaskId?: string): string {
    if (preferredTaskId && preferredTaskId.trim().length > 0) {
      return this.normalizeOpenApiTaskId(preferredTaskId);
    }
    const roomPart = roomId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_@.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'room';
    return this.normalizeOpenApiTaskId(`rtc-${roomPart}-${Date.now().toString(36)}`);
  }

  private parseOpenApiNumeric(label: string, value: unknown): number {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string' && /^[0-9]+$/.test(value.trim())) {
      const parsed = Number(value.trim());
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
    if (label === 'userId' && typeof value === 'string' && value.trim().length > 0) {
      return this.toDeterministicPositiveInt(value.trim());
    }
    throw new Error(`Volcengine OpenAPI requires numeric ${label}`);
  }
}
