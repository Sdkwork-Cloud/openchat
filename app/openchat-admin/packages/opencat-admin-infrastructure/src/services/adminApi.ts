import {
  clearStoredSession,
  getAuthToken,
  isAdminUser,
  normalizeAuthUser,
  setStoredSession,
  updateStoredUser,
} from '../auth/session';
import type {
  AdminDevice,
  AdminDeviceMessage,
  AdminFriendRequest,
  AdminFriendship,
  AdminGroup,
  AdminGroupMember,
  AdminMessage,
  AdminUser,
  AdminUserDeviceSessionBulkLogoutResponse,
  AdminUserDeviceSessionListResponse,
  AdminUserDeviceSessionLogoutResponse,
  AuditLogListResponse,
  AuthUser,
  ConfigListResponse,
  DashboardOverview,
  DeviceDetailResponse,
  GroupDetailResponse,
  LoginPayload,
  LoginResponse,
  PaginatedResult,
  RtcChannel,
  RtcProviderCapabilities,
  RtcProviderHealthReport,
  RtcProviderOperationStat,
  SystemSummary,
  UserDetailResponse,
  WukongimHealthResponse,
} from '@openchat/opencat-admin-types';

type ViteLikeImportMeta = ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
};

type OpenChatAdminSdkModule = typeof import('@openchat/sdkwork-im-admin-sdk');
type OpenChatAdminClient = InstanceType<OpenChatAdminSdkModule['OpenChatAdminClient']>;

export function normalizeMessageContent(content: unknown): string {
  if (content === null || content === undefined) {
    return '-';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (typeof content === 'object') {
    try {
      if (
        'text' in (content as Record<string, unknown>)
        && typeof (content as Record<string, unknown>).text === 'string'
      ) {
        return String((content as Record<string, unknown>).text);
      }

      return JSON.stringify(content);
    } catch {
      return '[unserializable payload]';
    }
  }

  return String(content);
}

function normalizeLoginResponse(response: {
  user: unknown;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  imConfig?: LoginResponse['imConfig'];
}): LoginResponse {
  const user = normalizeAuthUser(response.user as Partial<AuthUser>);
  return {
    user,
    token: response.token,
    refreshToken: response.refreshToken,
    expiresIn: response.expiresIn,
    imConfig: response.imConfig,
  };
}

function resolveAdminSdkBaseUrl(input?: string): string {
  const raw = (input || 'http://localhost:3000').trim();
  const normalized = raw.replace(/\/+$/, '');

  if (normalized.endsWith('/api')) {
    return normalized.slice(0, -4);
  }

  return normalized;
}

let openChatAdminSdkPromise: Promise<OpenChatAdminSdkModule> | null = null;
let adminSdkClientPromise: Promise<OpenChatAdminClient> | null = null;

function loadOpenChatAdminSdk(): Promise<OpenChatAdminSdkModule> {
  if (!openChatAdminSdkPromise) {
    openChatAdminSdkPromise = import('@openchat/sdkwork-im-admin-sdk');
  }

  return openChatAdminSdkPromise;
}

async function getAdminSdkClient(): Promise<OpenChatAdminClient> {
  if (!adminSdkClientPromise) {
    const token = getAuthToken() || undefined;

    adminSdkClientPromise = loadOpenChatAdminSdk().then((sdkModule) =>
      sdkModule.createOpenChatAdminClient({
        baseUrl: resolveAdminSdkBaseUrl(
          (import.meta as ViteLikeImportMeta).env?.VITE_API_BASE_URL,
        ),
        authToken: token,
        accessToken: token,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }));
  }

  return adminSdkClientPromise;
}

async function syncAdminSdkAuth(): Promise<OpenChatAdminClient> {
  const client = await getAdminSdkClient();
  const token = getAuthToken();

  if (token) {
    client.setAuthToken(token);
  } else {
    client.clearAuth();
  }

  return client;
}

function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  const httpStatus = candidate.httpStatus;
  const status = candidate.status;
  const code = candidate.code;

  return httpStatus === 401
    || status === 401
    || code === 'UNAUTHORIZED'
    || code === 'TOKEN_EXPIRED'
    || code === 'TOKEN_INVALID';
}

function handleAdminSdkError(error: unknown, client?: OpenChatAdminClient): never {
  if (isUnauthorizedError(error)) {
    clearStoredSession();
    client?.clearAuth();
  }

  throw error;
}

async function runWithAdminSdk<T>(
  executor: (client: OpenChatAdminClient) => Promise<unknown>,
): Promise<T> {
  const client = await syncAdminSdkAuth();

  try {
    return await executor(client) as T;
  } catch (error) {
    return handleAdminSdkError(error, client);
  }
}

async function ensureAdmin(user: unknown): Promise<AuthUser> {
  const normalized = normalizeAuthUser(user as Partial<AuthUser>);

  if (!isAdminUser(normalized)) {
    clearStoredSession();
    throw new Error('Current account does not have admin privileges.');
  }

  updateStoredUser(normalized);
  return normalized;
}

export const adminApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const client = await getAdminSdkClient();
    client.clearAuth();

    let response: {
      user: unknown;
      token: string;
      refreshToken?: string;
      expiresIn?: number;
      imConfig?: LoginResponse['imConfig'];
    };

    try {
      response = await client.auth.login(payload) as {
        user: unknown;
        token: string;
        refreshToken?: string;
        expiresIn?: number;
        imConfig?: LoginResponse['imConfig'];
      };
    } catch (error) {
      return handleAdminSdkError(error, client);
    }

    const normalized = normalizeLoginResponse(response);
    if (!isAdminUser(normalized.user)) {
      clearStoredSession();
      throw new Error('Current account does not have admin privileges.');
    }

    setStoredSession({
      token: normalized.token,
      refreshToken: normalized.refreshToken,
      user: normalized.user,
    });
    client.setAuthToken(normalized.token);

    return normalized;
  },

  async getCurrentUser(): Promise<AuthUser> {
    const user = await runWithAdminSdk<unknown>((client) => client.auth.getCurrentUser());
    return ensureAdmin(user);
  },

  async logout(): Promise<void> {
    const client = await syncAdminSdkAuth();

    try {
      await client.auth.logout();
    } catch (error) {
      handleAdminSdkError(error, client);
    } finally {
      client.clearAuth();
      clearStoredSession();
    }
  },

  getDashboardOverview(): Promise<DashboardOverview> {
    return runWithAdminSdk<DashboardOverview>((client) => client.dashboard.getOverview());
  },

  listUsers(params: Record<string, string | number | undefined>): Promise<PaginatedResult<AdminUser>> {
    return runWithAdminSdk<PaginatedResult<AdminUser>>((client) => client.users.list(params));
  },

  getUserDetail(userId: string): Promise<UserDetailResponse> {
    return runWithAdminSdk<UserDetailResponse>((client) => client.users.getDetail(userId));
  },

  listUserDeviceSessions(
    userId: string,
    params: Record<string, string | number | undefined>,
  ): Promise<AdminUserDeviceSessionListResponse> {
    return runWithAdminSdk<AdminUserDeviceSessionListResponse>((client) =>
      client.users.listDeviceSessions(userId, params));
  },

  logoutUserDeviceSession(
    userId: string,
    deviceId: string,
  ): Promise<AdminUserDeviceSessionLogoutResponse> {
    return runWithAdminSdk<AdminUserDeviceSessionLogoutResponse>((client) =>
      client.users.logoutDeviceSession(userId, deviceId));
  },

  logoutAllUserDeviceSessions(userId: string): Promise<AdminUserDeviceSessionBulkLogoutResponse> {
    return runWithAdminSdk<AdminUserDeviceSessionBulkLogoutResponse>((client) =>
      client.users.logoutAllDeviceSessions(userId));
  },

  updateUserProfile(userId: string, payload: Record<string, unknown>): Promise<AdminUser> {
    return runWithAdminSdk<AdminUser>((client) => client.users.updateProfile(userId, payload));
  },

  updateUserRoles(userId: string, roles: string[]): Promise<AdminUser> {
    return runWithAdminSdk<AdminUser>((client) => client.users.updateRoles(userId, { roles }));
  },

  resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) =>
      client.users.resetPassword(userId, { newPassword }));
  },

  deleteUser(userId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) => client.users.delete(userId));
  },

  listGroups(params: Record<string, string | number | undefined>): Promise<PaginatedResult<AdminGroup>> {
    return runWithAdminSdk<PaginatedResult<AdminGroup>>((client) => client.groups.list(params));
  },

  getGroupDetail(groupId: string): Promise<GroupDetailResponse> {
    return runWithAdminSdk<GroupDetailResponse>((client) => client.groups.getDetail(groupId));
  },

  updateGroup(groupId: string, payload: Record<string, unknown>): Promise<AdminGroup> {
    return runWithAdminSdk<AdminGroup>((client) => client.groups.update(groupId, payload));
  },

  addGroupMember(groupId: string, payload: { userId: string; role?: string }): Promise<AdminGroupMember> {
    return runWithAdminSdk<AdminGroupMember>((client) => client.groups.addMember(groupId, payload));
  },

  updateGroupMemberRole(
    groupId: string,
    userId: string,
    payload: { role: 'admin' | 'member' },
  ): Promise<AdminGroupMember> {
    return runWithAdminSdk<AdminGroupMember>((client) =>
      client.groups.updateMemberRole(groupId, userId, payload));
  },

  updateGroupMemberMute(
    groupId: string,
    userId: string,
    payload: { durationSeconds: number },
  ): Promise<AdminGroupMember> {
    return runWithAdminSdk<AdminGroupMember>((client) =>
      client.groups.updateMemberMute(groupId, userId, payload));
  },

  removeGroupMember(groupId: string, userId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) =>
      client.groups.removeMember(groupId, userId));
  },

  transferGroupOwner(groupId: string, newOwnerId: string): Promise<AdminGroup> {
    return runWithAdminSdk<AdminGroup>((client) =>
      client.groups.transferOwner(groupId, { newOwnerId }));
  },

  deleteGroup(groupId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) => client.groups.delete(groupId));
  },

  listFriends(params: Record<string, string | number | undefined>): Promise<PaginatedResult<AdminFriendship>> {
    return runWithAdminSdk<PaginatedResult<AdminFriendship>>((client) => client.friends.list(params));
  },

  listFriendRequests(params: Record<string, string | number | undefined>): Promise<PaginatedResult<AdminFriendRequest>> {
    return runWithAdminSdk<PaginatedResult<AdminFriendRequest>>((client) =>
      client.friends.listRequests(params));
  },

  removeFriendship(userId: string, friendId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) =>
      client.friends.removeFriendship({ userId, friendId }));
  },

  acceptFriendRequest(requestId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) =>
      client.friends.acceptRequest(requestId));
  },

  rejectFriendRequest(requestId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) =>
      client.friends.rejectRequest(requestId));
  },

  blockFriendship(userId: string, friendId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) =>
      client.friends.blockFriendship({ userId, friendId }));
  },

  unblockFriendship(userId: string, friendId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) =>
      client.friends.unblockFriendship({ userId, friendId }));
  },

  listMessages(params: Record<string, string | number | undefined>): Promise<PaginatedResult<AdminMessage>> {
    return runWithAdminSdk<PaginatedResult<AdminMessage>>((client) => client.messages.list(params));
  },

  getMessageDetail(messageId: string): Promise<AdminMessage> {
    return runWithAdminSdk<AdminMessage>((client) => client.messages.getDetail(messageId));
  },

  deleteMessage(messageId: string): Promise<{ success: boolean; message: AdminMessage }> {
    return runWithAdminSdk<{ success: boolean; message: AdminMessage }>((client) =>
      client.messages.delete(messageId));
  },

  recallMessage(messageId: string): Promise<{ success: boolean; message: AdminMessage }> {
    return runWithAdminSdk<{ success: boolean; message: AdminMessage }>((client) =>
      client.messages.recall(messageId));
  },

  listDevices(params: Record<string, string | number | undefined>): Promise<PaginatedResult<AdminDevice>> {
    return runWithAdminSdk<PaginatedResult<AdminDevice>>((client) => client.iot.listDevices(params));
  },

  createDevice(payload: {
    deviceId: string;
    type: 'xiaozhi' | 'other';
    name: string;
    description?: string;
    ipAddress?: string;
    macAddress?: string;
    metadata?: Record<string, unknown>;
    userId?: string;
  }): Promise<AdminDevice> {
    return runWithAdminSdk<AdminDevice>((client) => client.iot.createDevice(payload));
  },

  getDeviceDetail(deviceId: string): Promise<DeviceDetailResponse> {
    return runWithAdminSdk<DeviceDetailResponse>((client) => client.iot.getDeviceDetail(deviceId));
  },

  updateDeviceStatus(deviceId: string, status: string): Promise<AdminDevice> {
    return runWithAdminSdk<AdminDevice>((client) =>
      client.iot.updateDeviceStatus(deviceId, { status }));
  },

  controlDevice(
    deviceId: string,
    payload: { action: string; params?: Record<string, unknown> },
  ): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) =>
      client.iot.controlDevice(deviceId, payload));
  },

  deleteDevice(deviceId: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) => client.iot.deleteDevice(deviceId));
  },

  getSystemSummary(): Promise<SystemSummary> {
    return runWithAdminSdk<SystemSummary>((client) => client.system.getSummary());
  },

  listConfigs(params: Record<string, string | number | boolean | undefined>): Promise<ConfigListResponse> {
    return runWithAdminSdk<ConfigListResponse>((client) => client.system.listConfigs(params));
  },

  upsertConfig(payload: {
    key: string;
    value: unknown;
    description?: string;
  }): Promise<{ success: boolean; config: unknown }> {
    return runWithAdminSdk<{ success: boolean; config: unknown }>((client) =>
      client.system.upsertConfig(payload));
  },

  deleteConfig(key: string): Promise<{ success: boolean }> {
    return runWithAdminSdk<{ success: boolean }>((client) => client.system.deleteConfig(key));
  },

  listAuditLogs(params: Record<string, string | number | undefined>): Promise<AuditLogListResponse> {
    return runWithAdminSdk<AuditLogListResponse>((client) => client.system.listAuditLogs(params));
  },

  listRtcChannels(): Promise<RtcChannel[]> {
    return runWithAdminSdk<RtcChannel[]>((client) => client.rtc.getChannels());
  },

  createRtcChannel(payload: Record<string, unknown>): Promise<RtcChannel> {
    return runWithAdminSdk<RtcChannel>((client) => client.rtc.createChannel(payload));
  },

  updateRtcChannel(id: string, payload: Record<string, unknown>): Promise<RtcChannel> {
    return runWithAdminSdk<RtcChannel>((client) => client.rtc.updateChannel(id, payload));
  },

  deleteRtcChannel(id: string): Promise<boolean> {
    return runWithAdminSdk<boolean>((client) => client.rtc.deleteChannel(id));
  },

  getRtcProviderStats(params: Record<string, string | number | undefined>): Promise<RtcProviderOperationStat[]> {
    return runWithAdminSdk<RtcProviderOperationStat[]>((client) =>
      client.rtc.getProviderStats(params));
  },

  getRtcProviderHealth(params: Record<string, string | number | undefined>): Promise<RtcProviderHealthReport> {
    return runWithAdminSdk<RtcProviderHealthReport>((client) =>
      client.rtc.getProviderHealth(params));
  },

  getRtcProviderCapabilities(): Promise<RtcProviderCapabilities> {
    return runWithAdminSdk<RtcProviderCapabilities>((client) =>
      client.rtc.getProviderCapabilities());
  },

  getWukongimHealth(): Promise<WukongimHealthResponse> {
    return runWithAdminSdk<WukongimHealthResponse>((client) => client.wukongim.healthCheck());
  },

  getWukongimSystemInfo(): Promise<Record<string, unknown>> {
    return runWithAdminSdk<Record<string, unknown>>((client) => client.wukongim.getSystemInfo());
  },

  getWukongimChannelInfo(channelId: string, channelType: number): Promise<Record<string, unknown>> {
    return runWithAdminSdk<Record<string, unknown>>((client) =>
      client.wukongim.getChannelInfo({ channelId, channelType }));
  },

  getWukongimSubscribers(channelId: string, channelType: number): Promise<Record<string, unknown>> {
    return runWithAdminSdk<Record<string, unknown>>((client) =>
      client.wukongim.getSubscribers({ channelId, channelType }));
  },

  syncWukongimMessages(params: {
    channelId: string;
    channelType: number;
    lastMessageSeq?: number;
    limit?: number;
  }): Promise<unknown> {
    return runWithAdminSdk<unknown>((client) => client.wukongim.syncMessages(params));
  },

  sendWukongimMessage(payload: {
    channelId: string;
    channelType: number;
    payload: string;
    clientMsgNo?: string;
  }): Promise<unknown> {
    return runWithAdminSdk<unknown>((client) => client.wukongim.sendMessage(payload));
  },

  createWukongimChannel(payload: {
    channelId: string;
    channelType: number;
    name?: string;
    avatar?: string;
  }): Promise<unknown> {
    return runWithAdminSdk<unknown>((client) => client.wukongim.createChannel(payload));
  },

  deleteWukongimChannel(payload: { channelId: string; channelType: number }): Promise<unknown> {
    return runWithAdminSdk<unknown>((client) => client.wukongim.deleteChannel(payload));
  },

  addWukongimSubscribers(payload: {
    channelId: string;
    channelType: number;
    subscribers: string[];
  }): Promise<unknown> {
    return runWithAdminSdk<unknown>((client) => client.wukongim.addSubscribers(payload));
  },

  removeWukongimSubscribers(payload: {
    channelId: string;
    channelType: number;
    subscribers: string[];
  }): Promise<unknown> {
    return runWithAdminSdk<unknown>((client) => client.wukongim.removeSubscribers(payload));
  },
};
