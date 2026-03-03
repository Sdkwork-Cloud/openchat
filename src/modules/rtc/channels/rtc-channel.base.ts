import { AsyncLocalStorage } from 'async_hooks';
import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { RTCProviderType } from '../rtc.constants';
import { rtcLogger } from '../rtc.logger';
import {
  RTCChannel,
  RTCChannelConfig,
  RTCChannelRecordingTask,
  RTCChannelRoomInfo,
  RTCChannelStartRecordingRequest,
  RTCChannelStopRecordingRequest,
  RTCChannelToken,
  RTCChannelFactory,
} from './rtc-channel.interface';

interface RTCSignedTokenPayload {
  v: number;
  provider: RTCProviderType;
  roomId: string;
  userId: string;
  role: string;
  iat: number;
  exp: number;
  nonce: string;
}

type RTCControlPlaneMode = 'noop' | 'delegate';

type RTCControlPlaneOperation =
  | 'createRoom'
  | 'destroyRoom'
  | 'getRoomInfo'
  | 'addParticipant'
  | 'removeParticipant'
  | 'getParticipants';

const RTC_CONTROL_PLANE_OPERATIONS: RTCControlPlaneOperation[] = [
  'createRoom',
  'destroyRoom',
  'getRoomInfo',
  'addParticipant',
  'removeParticipant',
  'getParticipants',
];

interface RTCControlPlaneDelegatePayload {
  provider: RTCProviderType;
  operation: RTCControlPlaneOperation;
  roomId: string;
  roomName?: string;
  type?: 'p2p' | 'group';
  userId?: string;
  appId?: string;
  region?: string;
  endpoint?: string;
}

interface RTCControlPlaneDelegateRoomInfo {
  roomId: string;
  roomName?: string;
  type?: 'p2p' | 'group';
  participants?: string[];
}

interface RTCControlPlaneDelegateResponse {
  success?: boolean;
  message?: string;
  room?: RTCControlPlaneDelegateRoomInfo;
  participants?: string[];
  result?: unknown;
}

interface RTCControlPlaneCircuitState {
  consecutiveFailures: number;
  openedUntil: number;
  lastErrorAt: number;
}

interface RTCControlPlaneSignalCounter {
  invocations: number;
  retries: number;
  circuitOpenShortCircuits: number;
  unsafeIdempotencyCalls: number;
}

interface RTCControlPlaneSignalContextState extends RTCControlPlaneSignalCounter {
  operations: Map<RTCControlPlaneOperation, RTCControlPlaneSignalCounter>;
}

export interface RTCControlPlaneSignalSummary extends RTCControlPlaneSignalCounter {
  operations: Partial<Record<RTCControlPlaneOperation, RTCControlPlaneSignalCounter>>;
}

export type RTCControlPlaneSignalCaptureResult<T> =
  | { ok: true; result: T; signals: RTCControlPlaneSignalSummary }
  | { ok: false; error: unknown; signals: RTCControlPlaneSignalSummary };

export abstract class RTCChannelBase implements RTCChannel {
  protected config: RTCChannelConfig | null = null;
  protected isInitialized = false;
  private readonly localRooms: Map<string, RTCChannelRoomInfo> = new Map();
  private static readonly controlPlaneCircuitState: Map<string, RTCControlPlaneCircuitState> = new Map();
  private static readonly controlPlaneSignalContext =
    new AsyncLocalStorage<RTCControlPlaneSignalContextState>();

  abstract getProvider(): RTCProviderType;

  async initialize(config: RTCChannelConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
  }

  abstract createRoom(roomId: string, roomName?: string, type?: 'p2p' | 'group'): Promise<RTCChannelRoomInfo>;

  abstract destroyRoom(roomId: string): Promise<boolean>;

  abstract getRoomInfo(roomId: string): Promise<RTCChannelRoomInfo | null>;

  abstract generateToken(
    roomId: string,
    userId: string,
    role?: string,
    expireSeconds?: number,
  ): Promise<RTCChannelToken>;

  abstract validateToken(token: string): Promise<boolean>;

  abstract addParticipant(roomId: string, userId: string): Promise<boolean>;

  abstract removeParticipant(roomId: string, userId: string): Promise<boolean>;

  abstract getParticipants(roomId: string): Promise<string[]>;

  async isParticipantInRoom(roomId: string, userId: string): Promise<boolean> {
    const participants = await this.getParticipants(roomId);
    return participants.includes(userId);
  }

  async startRecording(_request: RTCChannelStartRecordingRequest): Promise<RTCChannelRecordingTask> {
    throw new Error(`${this.getProvider()} RTC channel does not support cloud recording`);
  }

  async stopRecording(_request: RTCChannelStopRecordingRequest): Promise<RTCChannelRecordingTask> {
    throw new Error(`${this.getProvider()} RTC channel does not support cloud recording`);
  }

  async getRecordingTask(_roomId: string, _taskId: string): Promise<RTCChannelRecordingTask | null> {
    return null;
  }

  static async captureControlPlaneSignals<T>(
    executor: () => Promise<T>,
  ): Promise<RTCControlPlaneSignalCaptureResult<T>> {
    const state = RTCChannelBase.createControlPlaneSignalState();
    return RTCChannelBase.controlPlaneSignalContext.run(state, async () => {
      try {
        const result = await executor();
        return {
          ok: true,
          result,
          signals: RTCChannelBase.snapshotControlPlaneSignals(state),
        };
      } catch (error) {
        return {
          ok: false,
          error,
          signals: RTCChannelBase.snapshotControlPlaneSignals(state),
        };
      }
    });
  }

  protected validateInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error('RTC Channel not initialized');
    }
  }

  protected getConfig(key: string, defaultValue?: any): any {
    if (!this.config) {
      return defaultValue;
    }
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  protected normalizeExpireSeconds(
    expireSeconds?: number,
    options?: {
      defaultSeconds?: number;
      min?: number;
      max?: number;
    },
  ): number {
    const defaultSeconds = options?.defaultSeconds ?? 7200;
    const min = options?.min ?? 60;
    const max = options?.max ?? 86400;
    const candidate = Number.isFinite(expireSeconds as number)
      ? Number(expireSeconds)
      : defaultSeconds;
    return Math.max(min, Math.min(candidate, max));
  }

  protected nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  protected issueSignedToken(
    roomId: string,
    userId: string,
    role?: string,
    expireSeconds?: number,
    extraClaims?: Record<string, unknown>,
  ): RTCChannelToken {
    this.validateInitialized();
    const provider = this.getProvider();
    const nowSeconds = this.nowSeconds();
    const ttlSeconds = this.normalizeExpireSeconds(expireSeconds);
    const payload: RTCSignedTokenPayload = {
      v: 1,
      provider,
      roomId,
      userId,
      role: role || 'participant',
      iat: nowSeconds,
      exp: nowSeconds + ttlSeconds,
      nonce: randomBytes(8).toString('hex'),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = this.signEncodedPayload(provider, encodedPayload);

    return {
      token: `rtc.${provider}.${encodedPayload}.${signature}`,
      expiresAt: new Date(payload.exp * 1000),
      roomId,
      userId,
      role: payload.role,
      ...extraClaims,
    };
  }

  protected verifySignedToken(token: string, expectedProvider: RTCProviderType): boolean {
    this.validateInitialized();
    if (!token || typeof token !== 'string') {
      return false;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 4) {
        return false;
      }
      const [prefix, providerRaw, encodedPayload, signatureRaw] = parts;
      if (prefix !== 'rtc') {
        return false;
      }
      if (providerRaw !== expectedProvider) {
        return false;
      }

      const expectedSignature = this.signEncodedPayload(expectedProvider, encodedPayload);
      if (!this.safeEquals(expectedSignature, signatureRaw)) {
        return false;
      }

      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as RTCSignedTokenPayload;
      if (
        payload.v !== 1
        || payload.provider !== expectedProvider
        || !payload.roomId
        || !payload.userId
        || !payload.exp
      ) {
        return false;
      }
      const nowSeconds = this.nowSeconds();
      return payload.exp > nowSeconds;
    } catch {
      return false;
    }
  }

  protected createOrUpdateLocalRoom(
    roomId: string,
    roomName: string | undefined,
    type: 'p2p' | 'group',
  ): RTCChannelRoomInfo {
    const existing = this.localRooms.get(roomId);
    const next: RTCChannelRoomInfo = {
      roomId,
      roomName: roomName ?? existing?.roomName,
      type: type || existing?.type || 'p2p',
      participants: this.normalizeParticipantIds(existing?.participants || []),
    };
    this.localRooms.set(roomId, this.cloneRoomInfo(next));
    return this.cloneRoomInfo(next);
  }

  protected getLocalRoom(roomId: string): RTCChannelRoomInfo | null {
    const room = this.localRooms.get(roomId);
    if (!room) {
      return null;
    }
    return this.cloneRoomInfo(room);
  }

  protected removeLocalRoom(roomId: string): boolean {
    return this.localRooms.delete(roomId);
  }

  protected getLocalParticipants(roomId: string): string[] {
    const room = this.localRooms.get(roomId);
    if (!room) {
      return [];
    }
    return this.normalizeParticipantIds(room.participants || []);
  }

  protected setLocalParticipants(roomId: string, participants: string[]): string[] {
    const room = this.localRooms.get(roomId) || {
      roomId,
      type: 'group' as const,
      participants: [],
    };
    const normalized = this.normalizeParticipantIds(participants);
    room.participants = normalized;
    this.localRooms.set(roomId, this.cloneRoomInfo(room));
    return [...normalized];
  }

  protected addLocalParticipant(roomId: string, userId: string): string[] {
    const normalizedUserId = userId.trim();
    if (normalizedUserId.length === 0) {
      return this.getLocalParticipants(roomId);
    }
    return this.setLocalParticipants(roomId, [
      ...this.getLocalParticipants(roomId),
      normalizedUserId,
    ]);
  }

  protected removeLocalParticipant(roomId: string, userId: string): string[] {
    const normalizedUserId = userId.trim();
    if (normalizedUserId.length === 0) {
      return this.getLocalParticipants(roomId);
    }
    const next = this.getLocalParticipants(roomId).filter((item) => item !== normalizedUserId);
    return this.setLocalParticipants(roomId, next);
  }

  protected mergeLocalRoomWithDelegate(
    fallback: RTCChannelRoomInfo,
    delegated: RTCControlPlaneDelegateResponse | null,
  ): RTCChannelRoomInfo {
    const delegatedRoom = delegated?.room;
    if (!delegatedRoom) {
      this.localRooms.set(fallback.roomId, this.cloneRoomInfo(fallback));
      return this.cloneRoomInfo(fallback);
    }

    const merged: RTCChannelRoomInfo = {
      roomId: delegatedRoom.roomId || fallback.roomId,
      roomName: delegatedRoom.roomName ?? fallback.roomName,
      type: delegatedRoom.type || fallback.type,
      participants: this.normalizeParticipantIds(
        delegatedRoom.participants || fallback.participants || [],
      ),
    };

    // Delegate may canonicalize roomId. Keep only canonical key to avoid stale alias state.
    if (fallback.roomId !== merged.roomId) {
      this.localRooms.delete(fallback.roomId);
    }
    this.localRooms.set(merged.roomId, this.cloneRoomInfo(merged));
    return this.cloneRoomInfo(merged);
  }

  protected resolveDelegateParticipants(delegated: RTCControlPlaneDelegateResponse | null): string[] | null {
    if (!delegated || !Array.isArray(delegated.participants)) {
      return null;
    }
    return this.normalizeParticipantIds(delegated.participants);
  }

  protected async invokeControlPlaneDelegate(
    operation: RTCControlPlaneOperation,
    payload: Omit<RTCControlPlaneDelegatePayload, 'provider' | 'operation'>,
  ): Promise<RTCControlPlaneDelegateResponse | null> {
    this.validateInitialized();
    const provider = this.getProvider();
    const mode = this.resolveControlPlaneMode(provider);
    const strict = this.resolveControlPlaneStrict(provider);

    if (mode !== 'delegate') {
      if (strict) {
        throw new Error(
          `${provider} RTC control plane is strict but controlPlaneMode is not delegate`,
        );
      }
      return null;
    }

    const url = this.resolveControlPlaneOperationUrl(provider, operation, payload.roomId, payload.userId);
    if (!url) {
      if (strict) {
        throw new Error(`${provider} RTC control plane delegate URL is not configured`);
      }
      rtcLogger.warn(provider, 'Control plane delegate URL missing, skip operation', {
        operation,
        roomId: payload.roomId,
      });
      return null;
    }

    const timeout = this.readConfigNumber(
      2000,
      'controlPlaneTimeoutMs',
      this.providerScopedKey(provider, 'controlPlaneTimeoutMs'),
    );
    const maxRetries = this.readConfigInteger(
      1,
      0,
      8,
      'controlPlaneMaxRetries',
      this.providerScopedKey(provider, 'controlPlaneMaxRetries'),
    );
    const retryBaseDelayMs = this.readConfigInteger(
      100,
      1,
      10000,
      'controlPlaneRetryBaseDelayMs',
      this.providerScopedKey(provider, 'controlPlaneRetryBaseDelayMs'),
    );
    const retryMaxDelayMs = this.readConfigInteger(
      1000,
      1,
      60000,
      'controlPlaneRetryMaxDelayMs',
      this.providerScopedKey(provider, 'controlPlaneRetryMaxDelayMs'),
    );
    const retryJitterRatio = this.readConfigFloat(
      0.2,
      0,
      1,
      'controlPlaneRetryJitterRatio',
      this.providerScopedKey(provider, 'controlPlaneRetryJitterRatio'),
    );
    const retryUnsafeOperations = this.readConfigBoolean(
      false,
      'controlPlaneRetryUnsafeOperations',
      this.providerScopedKey(provider, 'controlPlaneRetryUnsafeOperations'),
    );
    const idempotencyHeaderName = this.readConfigString(
      'controlPlaneIdempotencyHeader',
      this.providerScopedKey(provider, 'controlPlaneIdempotencyHeader'),
    ) || 'Idempotency-Key';
    const idempotencyPrefix = this.readConfigString(
      'controlPlaneIdempotencyPrefix',
      this.providerScopedKey(provider, 'controlPlaneIdempotencyPrefix'),
    ) || `${provider}:${operation}`;
    const circuitBreakerFailureThreshold = this.readConfigInteger(
      5,
      1,
      100,
      'controlPlaneCircuitBreakerFailureThreshold',
      this.providerScopedKey(provider, 'controlPlaneCircuitBreakerFailureThreshold'),
    );
    const circuitBreakerOpenMs = this.readConfigInteger(
      30000,
      100,
      600000,
      'controlPlaneCircuitBreakerOpenMs',
      this.providerScopedKey(provider, 'controlPlaneCircuitBreakerOpenMs'),
    );
    const normalizedRetryMaxDelayMs = Math.max(retryBaseDelayMs, retryMaxDelayMs);
    const authToken = this.readConfigString(
      'controlPlaneAuthToken',
      this.providerScopedKey(provider, 'controlPlaneAuthToken'),
    );
    const extraHeaders = this.readConfigObject(
      'controlPlaneHeaders',
      this.providerScopedKey(provider, 'controlPlaneHeaders'),
    );
    const method = this.getControlPlaneHttpMethod(operation);
    const requestPayload: RTCControlPlaneDelegatePayload = {
      provider,
      operation,
      ...payload,
      appId: this.config?.appId,
      region: this.config?.region,
      endpoint: this.config?.endpoint,
    };
    const idempotencyKey = this.isUnsafeControlPlaneOperation(operation)
      ? this.buildControlPlaneIdempotencyKey(
          idempotencyPrefix,
          payload.roomId,
          payload.userId,
        )
      : undefined;
    const circuitScope = this.resolveControlPlaneCircuitScope(provider, operation);

    const circuitState = this.getControlPlaneCircuitState(provider, operation, circuitScope);
    if (this.isControlPlaneCircuitOpen(provider, operation, circuitScope)) {
      const reopenInMs = Math.max(0, circuitState.openedUntil - Date.now());
      const circuitMessage = `${provider} RTC control plane circuit is open for operation ${operation}`;
      RTCChannelBase.recordControlPlaneSignal({
        operation,
        retries: 0,
        circuitOpenShortCircuit: true,
        unsafeIdempotencyCall: false,
      });
      if (strict) {
        throw new Error(circuitMessage);
      }
      rtcLogger.warn(provider, 'Control plane circuit open, fallback to local state', {
        operation,
        roomId: payload.roomId,
        userId: payload.userId,
        reopenInMs,
      });
      return null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    for (const [key, value] of Object.entries(extraHeaders)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        headers[key] = value;
      }
    }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    if (idempotencyKey && idempotencyHeaderName.trim().length > 0) {
      headers[idempotencyHeaderName] = idempotencyKey;
    }
    const idempotencyApplied = !!(idempotencyKey && idempotencyHeaderName.trim().length > 0);

    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      timeout,
      headers,
    };
    if (method === 'GET' || method === 'DELETE') {
      requestConfig.params = requestPayload;
    } else {
      requestConfig.data = requestPayload;
    }

    const maxAttempts = Math.max(1, maxRetries + 1);
    const retryOperationAllowed = this.isRetryableControlPlaneOperation(
      operation,
      retryUnsafeOperations,
    );
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await axios.request<unknown>(requestConfig);
        const delegated = this.normalizeControlPlaneDelegateResponse(response.data);
        if (delegated.success === false) {
          throw new Error(
            delegated.message
            || `${provider} delegate rejected operation ${operation}`,
          );
        }
        this.markControlPlaneCircuitSuccess(provider, operation, circuitScope);
        RTCChannelBase.recordControlPlaneSignal({
          operation,
          retries: Math.max(0, attempt - 1),
          circuitOpenShortCircuit: false,
          unsafeIdempotencyCall: idempotencyApplied,
        });
        return delegated;
      } catch (error) {
        lastError = error;
        const retryable = this.isRetryableControlPlaneError(error);
        const shouldRetry = retryable && retryOperationAllowed && attempt < maxAttempts;
        if (shouldRetry) {
          const retryDelayMs = this.computeRetryBackoffMs(
            attempt,
            retryBaseDelayMs,
            normalizedRetryMaxDelayMs,
            retryJitterRatio,
          );
          rtcLogger.warn(provider, 'Control plane delegate request failed, retrying', {
            operation,
            roomId: payload.roomId,
            userId: payload.userId,
            attempt,
            maxAttempts,
            retryDelayMs,
            retryOperationAllowed,
            error: String(error),
          });
          await this.sleep(retryDelayMs);
          continue;
        }

        this.markControlPlaneCircuitFailure(
          provider,
          operation,
          circuitScope,
          circuitBreakerFailureThreshold,
          circuitBreakerOpenMs,
        );
        RTCChannelBase.recordControlPlaneSignal({
          operation,
          retries: Math.max(0, attempt - 1),
          circuitOpenShortCircuit: false,
          unsafeIdempotencyCall: idempotencyApplied,
        });
        if (strict) {
          throw error instanceof Error
            ? error
            : new Error(`${provider} delegate control plane failed`);
        }
        rtcLogger.warn(provider, 'Control plane delegate operation failed, fallback to local state', {
          operation,
          roomId: payload.roomId,
          userId: payload.userId,
          attempt,
          maxAttempts,
          retryable,
          retryOperationAllowed,
          error: String(error),
        });
        return null;
      }
    }

    RTCChannelBase.recordControlPlaneSignal({
      operation,
      retries: Math.max(0, maxAttempts - 1),
      circuitOpenShortCircuit: false,
      unsafeIdempotencyCall: idempotencyApplied,
    });
    if (strict) {
      throw lastError instanceof Error
        ? lastError
        : new Error(`${provider} delegate control plane failed`);
    }
    return null;
  }

  protected normalizeParticipantIds(participants: string[]): string[] {
    const set = new Set<string>();
    for (const participant of participants) {
      if (typeof participant !== 'string') {
        continue;
      }
      const normalized = participant.trim();
      if (normalized.length > 0) {
        set.add(normalized);
      }
    }
    return Array.from(set);
  }

  private normalizeControlPlaneDelegateResponse(raw: unknown): RTCControlPlaneDelegateResponse {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { success: true };
    }
    const record = raw as Record<string, unknown>;
    const nestedData = this.asRecord(record.data);
    const nestedResult = this.asRecord(record.result);
    const room = this.parseDelegateRoomInfo(record.room)
      || this.parseDelegateRoomInfo(nestedData?.room)
      || this.parseDelegateRoomInfo(nestedData)
      || this.parseDelegateRoomInfo(nestedResult?.room)
      || this.parseDelegateRoomInfo(nestedResult);
    const participants = this.parseDelegateParticipants(record.participants)
      || this.parseDelegateParticipants(record.users)
      || this.parseDelegateParticipants(record.userIds)
      || this.parseDelegateParticipants(record.participantIds)
      || this.parseDelegateParticipants(nestedData?.participants)
      || this.parseDelegateParticipants(nestedData?.users)
      || this.parseDelegateParticipants(nestedData?.userIds)
      || this.parseDelegateParticipants(nestedData?.participantIds)
      || this.parseDelegateParticipants(nestedResult?.participants)
      || this.parseDelegateParticipants(nestedResult?.users)
      || this.parseDelegateParticipants(nestedResult?.userIds)
      || this.parseDelegateParticipants(nestedResult?.participantIds)
      || room?.participants;
    const delegateCode = this.readDelegateCode(
      record.code,
      record.ret,
      record.status,
      record.errcode,
      record.errorCode,
      nestedData?.code,
      nestedData?.ret,
      nestedData?.status,
      nestedData?.errcode,
      nestedData?.errorCode,
      nestedResult?.code,
      nestedResult?.ret,
      nestedResult?.status,
      nestedResult?.errcode,
      nestedResult?.errorCode,
    );
    const success = typeof record.success === 'boolean'
      ? record.success
      : typeof nestedData?.success === 'boolean'
        ? nestedData.success
        : typeof nestedResult?.success === 'boolean'
          ? nestedResult.success
          : delegateCode !== undefined
            ? delegateCode === 0
            : true;
    const message = typeof record.message === 'string'
      ? record.message
      : typeof nestedData?.message === 'string'
        ? nestedData.message
        : typeof nestedResult?.message === 'string'
          ? nestedResult.message
          : this.pickDelegateString(record, ['msg', 'errorMessage', 'error'])
            || this.pickDelegateString(nestedData, ['msg', 'errorMessage', 'error'])
            || this.pickDelegateString(nestedResult, ['msg', 'errorMessage', 'error']);

    return {
      success,
      message,
      room,
      participants,
      result: record.result ?? nestedData?.result ?? nestedResult?.result,
    };
  }

  private parseDelegateRoomInfo(raw: unknown): RTCControlPlaneDelegateRoomInfo | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return undefined;
    }
    const record = raw as Record<string, unknown>;
    const roomId = this.pickDelegateString(record, ['roomId', 'room_id', 'id']);
    if (!roomId) {
      return undefined;
    }
    const roomName = this.pickDelegateString(record, ['roomName', 'room_name', 'name']);
    const roomTypeRaw = this.pickDelegateString(record, ['type', 'roomType', 'room_type']);
    const type = this.normalizeDelegateRoomType(roomTypeRaw);
    const participants = this.parseDelegateParticipants(record.participants)
      || this.parseDelegateParticipants(record.users)
      || this.parseDelegateParticipants(record.userIds)
      || this.parseDelegateParticipants(record.participantIds);

    return {
      roomId,
      roomName,
      type,
      participants,
    };
  }

  private asRecord(raw: unknown): Record<string, unknown> | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return undefined;
    }
    return raw as Record<string, unknown>;
  }

  private parseDelegateParticipants(raw: unknown): string[] | undefined {
    if (!Array.isArray(raw)) {
      return undefined;
    }
    const participants: string[] = [];
    for (const item of raw) {
      if (typeof item === 'string') {
        participants.push(item);
        continue;
      }
      if (typeof item === 'number' && Number.isFinite(item)) {
        participants.push(String(Math.trunc(item)));
        continue;
      }
      if (typeof item === 'bigint') {
        participants.push(item.toString());
        continue;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }
      const fromRecord = this.pickDelegateString(item as Record<string, unknown>, [
        'userId',
        'user_id',
        'uid',
        'id',
      ]);
      if (fromRecord) {
        participants.push(fromRecord);
        continue;
      }
      const nestedUser = this.asRecord((item as Record<string, unknown>).user);
      const fromNestedUser = this.pickDelegateString(nestedUser, ['id', 'userId', 'user_id', 'uid']);
      if (fromNestedUser) {
        participants.push(fromNestedUser);
      }
    }
    return this.normalizeParticipantIds(participants);
  }

  private pickDelegateString(
    raw: Record<string, unknown> | undefined,
    keys: string[],
  ): string | undefined {
    if (!raw) {
      return undefined;
    }
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(Math.trunc(value));
      }
      if (typeof value === 'bigint') {
        return value.toString();
      }
    }
    return undefined;
  }

  private normalizeDelegateRoomType(raw: string | undefined): 'p2p' | 'group' | undefined {
    if (!raw) {
      return undefined;
    }
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'p2p' || normalized === 'single' || normalized === 'one2one' || normalized === 'one_to_one') {
      return 'p2p';
    }
    if (normalized === 'group' || normalized === 'multi' || normalized === 'conference' || normalized === 'group_call') {
      return 'group';
    }
    return undefined;
  }

  private readDelegateCode(...values: unknown[]): number | undefined {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return Math.trunc(parsed);
        }
      }
    }
    return undefined;
  }

  private resolveControlPlaneMode(provider: RTCProviderType): RTCControlPlaneMode {
    const raw = this.readConfigString(
      'controlPlaneMode',
      this.providerScopedKey(provider, 'controlPlaneMode'),
    );
    if (!raw) {
      return 'noop';
    }
    return raw.trim().toLowerCase() === 'delegate' ? 'delegate' : 'noop';
  }

  private resolveControlPlaneStrict(provider: RTCProviderType): boolean {
    return this.readConfigBoolean(
      false,
      'controlPlaneStrict',
      this.providerScopedKey(provider, 'controlPlaneStrict'),
    );
  }

  private resolveControlPlaneOperationUrl(
    provider: RTCProviderType,
    operation: RTCControlPlaneOperation,
    roomId: string,
    userId?: string,
  ): string | undefined {
    const specificKey = this.getControlPlaneOperationUrlConfigKey(operation);
    const urlTemplate = this.readConfigString(
      specificKey,
      this.providerScopedKey(provider, specificKey),
    );
    if (urlTemplate) {
      return this.interpolateControlPlaneUrl(urlTemplate, roomId, userId);
    }

    const baseUrl = this.readConfigString(
      'controlPlaneBaseUrl',
      this.providerScopedKey(provider, 'controlPlaneBaseUrl'),
      'controlPlaneUrl',
      this.providerScopedKey(provider, 'controlPlaneUrl'),
    );
    if (!baseUrl) {
      return undefined;
    }

    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
    const encodedRoomId = encodeURIComponent(roomId);
    const encodedUserId = userId ? encodeURIComponent(userId) : '';
    switch (operation) {
      case 'createRoom':
        return `${normalizedBaseUrl}/rooms`;
      case 'destroyRoom':
      case 'getRoomInfo':
        return `${normalizedBaseUrl}/rooms/${encodedRoomId}`;
      case 'addParticipant':
      case 'getParticipants':
        return `${normalizedBaseUrl}/rooms/${encodedRoomId}/participants`;
      case 'removeParticipant':
        if (!encodedUserId) {
          return undefined;
        }
        return `${normalizedBaseUrl}/rooms/${encodedRoomId}/participants/${encodedUserId}`;
      default:
        return undefined;
    }
  }

  private resolveControlPlaneCircuitScope(
    provider: RTCProviderType,
    operation: RTCControlPlaneOperation,
  ): string {
    const specificKey = this.getControlPlaneOperationUrlConfigKey(operation);
    const specificUrlTemplate = this.readConfigString(
      specificKey,
      this.providerScopedKey(provider, specificKey),
    );
    if (specificUrlTemplate) {
      return `specific:${specificUrlTemplate.trim()}`;
    }

    const baseUrl = this.readConfigString(
      'controlPlaneBaseUrl',
      this.providerScopedKey(provider, 'controlPlaneBaseUrl'),
      'controlPlaneUrl',
      this.providerScopedKey(provider, 'controlPlaneUrl'),
    );
    if (!baseUrl) {
      return `default:${provider}:${operation}`;
    }
    return `base:${baseUrl.replace(/\/+$/, '').trim()}:${operation}`;
  }

  private getControlPlaneHttpMethod(operation: RTCControlPlaneOperation): Method {
    if (operation === 'createRoom' || operation === 'addParticipant') {
      return 'POST';
    }
    if (operation === 'getRoomInfo' || operation === 'getParticipants') {
      return 'GET';
    }
    return 'DELETE';
  }

  private getControlPlaneOperationUrlConfigKey(operation: RTCControlPlaneOperation): string {
    if (operation === 'createRoom') {
      return 'controlPlaneCreateRoomUrl';
    }
    if (operation === 'destroyRoom') {
      return 'controlPlaneDestroyRoomUrl';
    }
    if (operation === 'getRoomInfo') {
      return 'controlPlaneGetRoomInfoUrl';
    }
    if (operation === 'addParticipant') {
      return 'controlPlaneAddParticipantUrl';
    }
    if (operation === 'removeParticipant') {
      return 'controlPlaneRemoveParticipantUrl';
    }
    return 'controlPlaneGetParticipantsUrl';
  }

  private interpolateControlPlaneUrl(template: string, roomId: string, userId?: string): string {
    return template
      .trim()
      .replaceAll('{roomId}', encodeURIComponent(roomId))
      .replaceAll('{userId}', encodeURIComponent(userId || ''));
  }

  private providerScopedKey(provider: RTCProviderType, key: string): string {
    return `${provider}${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  }

  private readConfigString(...keys: string[]): string | undefined {
    this.validateInitialized();
    for (const key of keys) {
      const value = this.config?.[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }

  private readConfigBoolean(defaultValue: boolean, ...keys: string[]): boolean {
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
    return defaultValue;
  }

  private readConfigNumber(defaultValue: number, ...keys: string[]): number {
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
    return defaultValue;
  }

  private readConfigInteger(
    defaultValue: number,
    min: number,
    max: number,
    ...keys: string[]
  ): number {
    this.validateInitialized();
    const normalizedDefault = Math.max(min, Math.min(max, Math.trunc(defaultValue)));
    for (const key of keys) {
      const value = this.config?.[key];
      if (value === undefined || value === null) {
        continue;
      }

      const parsed = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(parsed)) {
        continue;
      }
      const integer = Math.trunc(parsed);
      return Math.max(min, Math.min(max, integer));
    }
    return normalizedDefault;
  }

  private readConfigFloat(
    defaultValue: number,
    min: number,
    max: number,
    ...keys: string[]
  ): number {
    this.validateInitialized();
    const normalizedDefault = Math.max(min, Math.min(max, defaultValue));
    for (const key of keys) {
      const value = this.config?.[key];
      if (value === undefined || value === null) {
        continue;
      }
      const parsed = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(parsed)) {
        continue;
      }
      return Math.max(min, Math.min(max, parsed));
    }
    return normalizedDefault;
  }

  private sleep(ms: number): Promise<void> {
    if (!Number.isFinite(ms) || ms <= 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private computeRetryBackoffMs(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
    jitterRatio: number,
  ): number {
    const safeAttempt = Math.max(1, attempt);
    const rawDelay = Math.min(maxDelayMs, baseDelayMs * (2 ** (safeAttempt - 1)));
    const normalizedJitterRatio = Math.max(0, Math.min(1, jitterRatio));
    const jitterWindow = Math.floor(rawDelay * normalizedJitterRatio);
    if (jitterWindow <= 0) {
      return Math.max(0, Math.trunc(rawDelay));
    }

    const jitter = randomInt(jitterWindow * 2 + 1) - jitterWindow;
    return Math.max(0, Math.min(maxDelayMs, Math.trunc(rawDelay + jitter)));
  }

  private isUnsafeControlPlaneOperation(operation: RTCControlPlaneOperation): boolean {
    return operation === 'createRoom' || operation === 'addParticipant';
  }

  private isRetryableControlPlaneOperation(
    operation: RTCControlPlaneOperation,
    retryUnsafeOperations: boolean,
  ): boolean {
    return !this.isUnsafeControlPlaneOperation(operation) || retryUnsafeOperations;
  }

  private buildControlPlaneIdempotencyKey(
    prefix: string,
    roomId: string,
    userId?: string,
  ): string {
    const normalizedPrefix = prefix.trim().replace(/[\s:]+/g, '-').slice(0, 64) || 'rtc';
    const roomPart = encodeURIComponent(roomId.trim()).slice(0, 64) || 'room';
    const userPart = userId && userId.trim().length > 0
      ? encodeURIComponent(userId.trim()).slice(0, 64)
      : 'anonymous';
    const nonce = randomBytes(8).toString('hex');
    return `${normalizedPrefix}:${roomPart}:${userPart}:${Date.now().toString(36)}:${nonce}`;
  }

  private isRetryableControlPlaneError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (typeof status === 'number') {
        return status === 408 || status === 429 || status >= 500;
      }

      const code = typeof error.code === 'string' ? error.code.toUpperCase() : '';
      if (
        code === 'ECONNABORTED'
        || code === 'ETIMEDOUT'
        || code === 'EAI_AGAIN'
        || code === 'ECONNREFUSED'
        || code === 'ECONNRESET'
        || code === 'ENOTFOUND'
      ) {
        return true;
      }

      // Axios errors without response status are typically transient transport failures.
      return !error.response;
    }

    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('temporarily') || message.includes('network');
  }

  private getControlPlaneCircuitKey(
    provider: RTCProviderType,
    operation: RTCControlPlaneOperation,
    scope: string,
  ): string {
    return `${provider}:${operation}:${scope}`;
  }

  private getControlPlaneCircuitState(
    provider: RTCProviderType,
    operation: RTCControlPlaneOperation,
    scope: string,
  ): RTCControlPlaneCircuitState {
    const key = this.getControlPlaneCircuitKey(provider, operation, scope);
    const existing = RTCChannelBase.controlPlaneCircuitState.get(key);
    if (existing) {
      return existing;
    }
    const created: RTCControlPlaneCircuitState = {
      consecutiveFailures: 0,
      openedUntil: 0,
      lastErrorAt: 0,
    };
    RTCChannelBase.controlPlaneCircuitState.set(key, created);
    return created;
  }

  private isControlPlaneCircuitOpen(
    provider: RTCProviderType,
    operation: RTCControlPlaneOperation,
    scope: string,
  ): boolean {
    const state = this.getControlPlaneCircuitState(provider, operation, scope);
    return state.openedUntil > Date.now();
  }

  private markControlPlaneCircuitSuccess(
    provider: RTCProviderType,
    operation: RTCControlPlaneOperation,
    scope: string,
  ): void {
    const key = this.getControlPlaneCircuitKey(provider, operation, scope);
    RTCChannelBase.controlPlaneCircuitState.set(key, {
      consecutiveFailures: 0,
      openedUntil: 0,
      lastErrorAt: 0,
    });
  }

  private markControlPlaneCircuitFailure(
    provider: RTCProviderType,
    operation: RTCControlPlaneOperation,
    scope: string,
    failureThreshold: number,
    openDurationMs: number,
  ): void {
    const key = this.getControlPlaneCircuitKey(provider, operation, scope);
    const now = Date.now();
    const state = this.getControlPlaneCircuitState(provider, operation, scope);
    const nextFailures = state.consecutiveFailures + 1;
    if (nextFailures >= failureThreshold) {
      RTCChannelBase.controlPlaneCircuitState.set(key, {
        consecutiveFailures: 0,
        openedUntil: now + openDurationMs,
        lastErrorAt: now,
      });
      return;
    }

    RTCChannelBase.controlPlaneCircuitState.set(key, {
      consecutiveFailures: nextFailures,
      openedUntil: 0,
      lastErrorAt: now,
    });
  }

  private static createControlPlaneSignalCounter(): RTCControlPlaneSignalCounter {
    return {
      invocations: 0,
      retries: 0,
      circuitOpenShortCircuits: 0,
      unsafeIdempotencyCalls: 0,
    };
  }

  private static createControlPlaneSignalState(): RTCControlPlaneSignalContextState {
    return {
      ...RTCChannelBase.createControlPlaneSignalCounter(),
      operations: new Map<RTCControlPlaneOperation, RTCControlPlaneSignalCounter>(),
    };
  }

  private static snapshotControlPlaneSignals(
    state: RTCControlPlaneSignalContextState,
  ): RTCControlPlaneSignalSummary {
    const operations: Partial<Record<RTCControlPlaneOperation, RTCControlPlaneSignalCounter>> = {};
    for (const operation of RTC_CONTROL_PLANE_OPERATIONS) {
      const value = state.operations.get(operation) || RTCChannelBase.createControlPlaneSignalCounter();
      operations[operation] = {
        invocations: value.invocations,
        retries: value.retries,
        circuitOpenShortCircuits: value.circuitOpenShortCircuits,
        unsafeIdempotencyCalls: value.unsafeIdempotencyCalls,
      };
    }

    return {
      invocations: state.invocations,
      retries: state.retries,
      circuitOpenShortCircuits: state.circuitOpenShortCircuits,
      unsafeIdempotencyCalls: state.unsafeIdempotencyCalls,
      operations,
    };
  }

  private static recordControlPlaneSignal(signal: {
    operation: RTCControlPlaneOperation;
    retries: number;
    circuitOpenShortCircuit: boolean;
    unsafeIdempotencyCall: boolean;
  }): void {
    const state = RTCChannelBase.controlPlaneSignalContext.getStore();
    if (!state) {
      return;
    }

    const safeRetries = Math.max(0, Math.trunc(signal.retries));
    state.invocations += 1;
    state.retries += safeRetries;
    state.circuitOpenShortCircuits += signal.circuitOpenShortCircuit ? 1 : 0;
    state.unsafeIdempotencyCalls += signal.unsafeIdempotencyCall ? 1 : 0;

    const operationCounter = state.operations.get(signal.operation)
      || RTCChannelBase.createControlPlaneSignalCounter();
    operationCounter.invocations += 1;
    operationCounter.retries += safeRetries;
    operationCounter.circuitOpenShortCircuits += signal.circuitOpenShortCircuit ? 1 : 0;
    operationCounter.unsafeIdempotencyCalls += signal.unsafeIdempotencyCall ? 1 : 0;
    state.operations.set(signal.operation, operationCounter);
  }

  private readConfigObject(...keys: string[]): Record<string, unknown> {
    this.validateInitialized();
    for (const key of keys) {
      const value = this.config?.[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }
    return {};
  }

  private cloneRoomInfo(room: RTCChannelRoomInfo): RTCChannelRoomInfo {
    return {
      ...room,
      participants: this.normalizeParticipantIds(room.participants || []),
    };
  }

  private signEncodedPayload(provider: RTCProviderType, encodedPayload: string): string {
    this.validateInitialized();
    const secret = this.config?.appSecret;
    if (!secret || secret.length < 8) {
      throw new Error(`${provider} RTC appSecret is missing or too short`);
    }
    return createHmac('sha256', secret)
      .update(`${provider}.${encodedPayload}`)
      .digest('base64url');
  }

  protected safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');
    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}

export class RTCChannelFactoryImpl implements RTCChannelFactory {
  private providers: Map<string, new () => RTCChannel> = new Map();

  registerProvider(provider: RTCProviderType, channelClass: new () => RTCChannel): void {
    this.providers.set(provider, channelClass);
  }

  createChannel(provider: RTCProviderType): RTCChannel {
    const channelClass = this.providers.get(provider);
    if (!channelClass) {
      throw new Error(`RTC Channel provider ${provider} not registered`);
    }
    return new channelClass();
  }

  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const rtcChannelFactory = new RTCChannelFactoryImpl();
