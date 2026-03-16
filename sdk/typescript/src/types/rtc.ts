export type RTCCanonicalProvider = 'volcengine' | 'tencent' | 'alibaba' | 'livekit';
export type RTCDateValue = string | Date;
export type RTCRecordStatus = 'recording' | 'completed' | 'failed' | 'processing';
export type RTCRecordSyncStatus = 'pending' | 'synced' | 'failed';
export type RTCProviderOperation = 'createRoom' | 'generateToken' | 'validateToken';
export type RTCProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export enum RTCRoomType {
  P2P = 'p2p',
  GROUP = 'group',
}

export interface RTCRoom {
  id: string;
  uuid?: string;
  name?: string;
  type: RTCRoomType;
  creatorId: string;
  participants: string[];
  status: 'active' | 'ended';
  channelId?: string;
  provider?: RTCCanonicalProvider;
  externalRoomId?: string;
  aiEnabled?: boolean;
  aiMetadata?: Record<string, any>;
  startedAt: RTCDateValue;
  endedAt?: RTCDateValue;
}

export interface RTCToken {
  id: string;
  uuid?: string;
  roomId: string;
  userId: string;
  channelId?: string;
  provider?: RTCCanonicalProvider;
  token: string;
  role?: string;
  metadata?: Record<string, any>;
  expiresAt: RTCDateValue;
  createdAt: RTCDateValue;
}

export interface RTCTokenValidationResult {
  valid: boolean;
  roomId?: string;
  userId?: string;
  provider?: RTCCanonicalProvider;
  channelId?: string;
  role?: string;
  expiresAt?: RTCDateValue;
}

export interface RTCChannelEntity {
  id: string;
  uuid?: string;
  provider: RTCCanonicalProvider;
  appId: string;
  appKey: string;
  appSecret: string;
  region?: string;
  endpoint?: string;
  extraConfig?: Record<string, any>;
  isActive: boolean;
  createdAt: RTCDateValue;
  updatedAt: RTCDateValue;
}

export interface RTCVideoRecord {
  id: string;
  uuid?: string;
  roomId: string;
  channelId?: string;
  provider?: RTCCanonicalProvider;
  externalTaskId?: string;
  userId?: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  startTime: RTCDateValue;
  endTime?: RTCDateValue;
  status: RTCRecordStatus;
  syncStatus?: RTCRecordSyncStatus;
  lastSyncedAt?: RTCDateValue;
  metadata?: Record<string, any>;
  errorMessage?: string;
  syncError?: string;
  createdAt: RTCDateValue;
  updatedAt: RTCDateValue;
}

export interface CreateRTCRoomParams {
  type: RTCRoomType;
  participants: string[];
  name?: string;
  channelId?: string;
  provider?: RTCCanonicalProvider;
  aiMetadata?: Record<string, any>;
}

export interface GenerateRTCTokenParams {
  roomId: string;
  userId?: string;
  channelId?: string;
  provider?: RTCCanonicalProvider;
  role?: string;
  expireSeconds?: number;
}

export interface CreateRTCChannelParams {
  provider: RTCCanonicalProvider;
  appId: string;
  appKey: string;
  appSecret: string;
  region?: string;
  endpoint?: string;
  isActive?: boolean;
  extraConfig?: Record<string, any>;
}

export interface UpdateRTCChannelParams {
  provider?: RTCCanonicalProvider;
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
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  startTime: RTCDateValue;
  endTime?: RTCDateValue;
  status?: RTCRecordStatus;
  metadata?: Record<string, any>;
}

export interface StartRTCRecordingParams {
  taskId?: string;
  metadata?: Record<string, any>;
}

export interface StopRTCRecordingParams {
  recordId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

export interface SyncRTCVideoRecordParams {
  roomId?: string;
  taskId?: string;
}

export interface UpdateVideoRecordStatusParams {
  status: RTCRecordStatus;
  errorMessage?: string;
}

export interface VideoRecordListQuery {
  limit?: number;
  offset?: number;
  status?: RTCRecordStatus;
  syncStatus?: RTCRecordSyncStatus;
}

export interface RTCProviderOperationErrorCount {
  code: string;
  count: number;
}

export interface RTCProviderOperationStat {
  provider: RTCCanonicalProvider;
  operation: RTCProviderOperation;
  total: number;
  success: number;
  failure: number;
  retryableFailure: number;
  avgDurationMs: number;
  controlPlaneInvocations: number;
  controlPlaneRetries: number;
  controlPlaneCircuitOpenShortCircuits: number;
  controlPlaneUnsafeIdempotencyCalls: number;
  lastStatus: 'success' | 'failure';
  lastDurationMs: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  topErrors: RTCProviderOperationErrorCount[];
  updatedAt: RTCDateValue;
}

export interface RTCProviderOperationStatsQuery {
  provider?: RTCCanonicalProvider;
  operation?: RTCProviderOperation;
  windowMinutes?: number;
  topErrorLimit?: number;
}

export interface RTCProviderHealthItem {
  provider: RTCCanonicalProvider;
  status: RTCProviderHealthStatus;
  healthReasons: string[];
  total: number;
  success: number;
  failure: number;
  retryableFailure: number;
  failureRate: number;
  retryableFailureRate: number;
  avgDurationMs: number;
  controlPlaneInvocations: number;
  controlPlaneRetries: number;
  controlPlaneCircuitOpenShortCircuits: number;
  controlPlaneUnsafeIdempotencyCalls: number;
  controlPlaneRetryRate: number;
  controlPlaneCircuitOpenRate: number;
  controlPlaneSignalsEvaluated: boolean;
  topErrors: RTCProviderOperationErrorCount[];
  updatedAt?: RTCDateValue;
}

export interface RTCProviderHealthReport {
  generatedAt: RTCDateValue;
  windowMinutes: number;
  operation?: RTCProviderOperation;
  recommendedPrimary?: RTCCanonicalProvider;
  fallbackOrder: RTCCanonicalProvider[];
  providers: RTCProviderHealthItem[];
}

export interface RTCProviderHealthQuery {
  provider?: RTCCanonicalProvider;
  operation?: RTCProviderOperation;
  windowMinutes?: number;
  topErrorLimit?: number;
  minSamples?: number;
  controlPlaneMinSamples?: number;
  degradedFailureRate?: number;
  unhealthyFailureRate?: number;
  degradedLatencyMs?: number;
  unhealthyLatencyMs?: number;
  degradedControlPlaneRetryRate?: number;
  unhealthyControlPlaneRetryRate?: number;
  degradedControlPlaneCircuitOpenRate?: number;
  unhealthyControlPlaneCircuitOpenRate?: number;
}

export interface RTCProviderCapabilityItem {
  provider: RTCCanonicalProvider;
  configured: boolean;
  channelId?: string;
  supportsRecording: boolean;
  tokenStrategies: string[];
  supportsControlPlaneDelegate: boolean;
}

export interface RTCProviderCapabilitiesResponse {
  defaultProvider: RTCCanonicalProvider;
  recommendedPrimary?: RTCCanonicalProvider;
  fallbackOrder: RTCCanonicalProvider[];
  activeProviders: RTCCanonicalProvider[];
  providers: RTCProviderCapabilityItem[];
}
