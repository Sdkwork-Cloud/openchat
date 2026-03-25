export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColor = 'tech-blue' | 'green-tech' | 'zinc' | 'rose' | 'lobster' | 'violet';
export type SupportedLanguage = 'zh-CN' | 'en-US';
export type LanguagePreference = SupportedLanguage | 'system';

export interface AuthUser {
  id: string;
  username: string;
  nickname?: string;
  displayName: string;
  email?: string;
  phone?: string;
  status?: string;
  roles: string[];
  avatar?: unknown;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface StoredSession {
  token: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  imConfig?: {
    wsUrl?: string;
    uid?: string;
    token?: string;
  };
}

export interface PaginatedResult<T> {
  total: number;
  page: number;
  limit: number;
  items: T[];
}

export interface AdminUser extends AuthUser {
  uuid?: string;
  lastLoginIp?: string;
  resources?: Record<string, unknown>;
  isDeleted?: boolean;
}

export interface AdminAuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  result?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
}

export interface AdminMessage {
  id: string;
  type: string;
  content: unknown;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  status: string;
  seq?: number;
  retryCount?: number;
  recalledAt?: string;
  createdAt: string;
}

export interface AdminDevice {
  id: string;
  deviceId: string;
  type: string;
  name: string;
  description?: string;
  status: string;
  ipAddress?: string;
  macAddress?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDeviceMessage {
  id: string;
  deviceId: string;
  type: string;
  direction: string;
  payload: unknown;
  topic?: string;
  processed?: boolean;
  error?: string;
  createdAt: string;
}

export interface AdminGroup {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  ownerId: string;
  maxMembers: number;
  announcement?: string;
  status: string;
  joinType: string;
  muteAll: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGroupMember {
  id: string;
  groupId: string;
  userId: string;
  nickname?: string;
  role: string;
  status: string;
  muteUntil?: string;
  joinedAt?: string;
  createdAt?: string;
}

export interface AdminFriendship {
  id: string;
  userId: string;
  friendId: string;
  remark?: string;
  group?: string;
  status: string;
  acceptedAt?: string;
  blockedAt?: string;
  createdAt: string;
}

export interface AdminFriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  message?: string;
  expiresAt?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface DashboardOverview {
  totals: {
    users: number;
    onlineUsers: number;
    groups: number;
    messages: number;
    devices: number;
    pendingFriendRequests: number;
  };
  recentUsers: AdminUser[];
  recentMessages: AdminMessage[];
  recentDevices: AdminDevice[];
  recentAudits: AdminAuditLog[];
}

export interface UserDetailResponse {
  user: AdminUser;
  stats: {
    friendCount: number;
    groupCount: number;
  };
  recentAudits: AdminAuditLog[];
}

export interface AdminUserDeviceSession {
  deviceId: string;
  tokenCount: number;
  conversationCount: number;
  lastActiveAt: string | null;
  isCurrentDevice: boolean;
}

export interface AdminUserDeviceSessionListResponse {
  total: number;
  items: AdminUserDeviceSession[];
}

export interface AdminUserDeviceSessionLogoutResponse {
  success: boolean;
  deviceId: string;
  revokedTokens: number;
  clearedCursors: number;
}

export interface AdminUserDeviceSessionBulkLogoutResponse {
  success: boolean;
  total: number;
  revokedTokens: number;
  clearedCursors: number;
  items: Array<{
    deviceId: string;
    revokedTokens: number;
    clearedCursors: number;
  }>;
}

export interface GroupDetailResponse {
  group: AdminGroup;
  members: AdminGroupMember[];
  recentMessages: AdminMessage[];
}

export interface DeviceDetailResponse {
  device: AdminDevice;
  recentMessages: AdminDeviceMessage[];
}

export interface SystemSummary {
  runtime: {
    uptimeSeconds: number;
    nodeVersion: string;
    timestamp: string;
  };
  configStats: {
    totalKeys?: number;
    sources?: Record<string, number>;
    encrypted?: number;
    overrides?: number;
  };
  auditLogCount: number;
  recentAudits: AdminAuditLog[];
  cloudServices: Array<{
    id: string;
    label: string;
    configuredKeys: number;
    configured: boolean;
    sampleKeys: string[];
  }>;
}

export interface ConfigEntry {
  key: string;
  value: unknown;
  rawValue?: unknown;
  source?: string;
  updatedAt?: number;
  encrypted?: boolean;
  description?: string;
  masked: boolean;
}

export interface ConfigListResponse {
  total: number;
  items: ConfigEntry[];
}

export interface AuditLogListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminAuditLog[];
}

export interface RtcChannel {
  id: string;
  provider: string;
  appId: string;
  appKey: string;
  appSecret: string;
  region?: string;
  endpoint?: string;
  extraConfig?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RtcProviderOperationStat {
  provider: string;
  operation: string;
  total: number;
  success: number;
  failure: number;
  retryableFailure: number;
  avgDurationMs: number;
  controlPlaneInvocations: number;
  controlPlaneRetries: number;
  controlPlaneCircuitOpenShortCircuits: number;
  controlPlaneUnsafeIdempotencyCalls: number;
  lastStatus: string;
  lastDurationMs: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  topErrors: Array<{ code: string; count: number }>;
  updatedAt?: string;
}

export interface RtcProviderHealthReport {
  generatedAt: string;
  windowMinutes: number;
  operation?: string;
  recommendedPrimary?: string;
  fallbackOrder: string[];
  providers: Array<{
    provider: string;
    status: string;
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
    topErrors: Array<{ code: string; count: number }>;
    updatedAt?: string;
  }>;
}

export interface RtcProviderCapabilities {
  defaultProvider: string;
  recommendedPrimary?: string;
  fallbackOrder: string[];
  activeProviders: string[];
  providers: Array<{
    provider: string;
    configured: boolean;
    channelId?: string;
    supportsRecording: boolean;
    tokenStrategies: string[];
    supportsControlPlaneDelegate: boolean;
  }>;
}

export interface WukongimHealthResponse {
  status: string;
  timestamp: string;
}
