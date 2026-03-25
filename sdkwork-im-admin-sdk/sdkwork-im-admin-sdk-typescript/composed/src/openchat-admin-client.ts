import {
  createClient as createAppBackendClient,
  SdkworkBackendClient as ImBackendClient,
} from '@sdkwork/im-backend-sdk';
import {
  createClient as createAdminBackendClient,
  SdkworkBackendClient as ImAdminBackendClient,
} from '@sdkwork/im-admin-backend-sdk';

export interface OpenChatAdminSdkConfig {
  baseUrl: string;
  timeout?: number;
  apiKey?: string;
  authToken?: string;
  accessToken?: string;
  headers?: Record<string, string>;
}

export type AdminQueryParams = Record<
  string,
  string | number | boolean | undefined
>;

export class OpenChatAdminClient {
  readonly rawApp: ImBackendClient;

  readonly rawAdmin: ImAdminBackendClient;

  readonly auth: {
    login: (payload: { username: string; password: string }) => Promise<unknown>;
    logout: (payload?: Record<string, unknown>) => Promise<unknown>;
    getCurrentUser: () => Promise<unknown>;
  };

  readonly dashboard: {
    getOverview: () => Promise<unknown>;
  };

  readonly users: {
    list: (params?: AdminQueryParams) => Promise<unknown>;
    getDetail: (userId: string) => Promise<unknown>;
    listDeviceSessions: (userId: string, params?: AdminQueryParams) => Promise<unknown>;
    logoutDeviceSession: (userId: string, deviceId: string) => Promise<unknown>;
    logoutAllDeviceSessions: (userId: string) => Promise<unknown>;
    updateProfile: (userId: string, payload: Record<string, unknown>) => Promise<unknown>;
    updateRoles: (userId: string, payload: { roles: string[] }) => Promise<unknown>;
    resetPassword: (userId: string, payload: { newPassword: string }) => Promise<unknown>;
    delete: (userId: string) => Promise<unknown>;
  };

  readonly groups: {
    list: (params?: AdminQueryParams) => Promise<unknown>;
    getDetail: (groupId: string) => Promise<unknown>;
    update: (groupId: string, payload: Record<string, unknown>) => Promise<unknown>;
    addMember: (groupId: string, payload: { userId: string; role?: string }) => Promise<unknown>;
    updateMemberRole: (
      groupId: string,
      userId: string,
      payload: { role: 'admin' | 'member' },
    ) => Promise<unknown>;
    updateMemberMute: (
      groupId: string,
      userId: string,
      payload: { durationSeconds: number },
    ) => Promise<unknown>;
    removeMember: (groupId: string, userId: string) => Promise<unknown>;
    transferOwner: (groupId: string, payload: { newOwnerId: string }) => Promise<unknown>;
    delete: (groupId: string) => Promise<unknown>;
  };

  readonly friends: {
    list: (params?: AdminQueryParams) => Promise<unknown>;
    listRequests: (params?: AdminQueryParams) => Promise<unknown>;
    acceptRequest: (requestId: string) => Promise<unknown>;
    rejectRequest: (requestId: string) => Promise<unknown>;
    removeFriendship: (payload: { userId: string; friendId: string }) => Promise<unknown>;
    blockFriendship: (payload: { userId: string; friendId: string }) => Promise<unknown>;
    unblockFriendship: (payload: { userId: string; friendId: string }) => Promise<unknown>;
  };

  readonly messages: {
    list: (params?: AdminQueryParams) => Promise<unknown>;
    getDetail: (messageId: string) => Promise<unknown>;
    delete: (messageId: string) => Promise<unknown>;
    recall: (messageId: string) => Promise<unknown>;
  };

  readonly iot: {
    listDevices: (params?: AdminQueryParams) => Promise<unknown>;
    createDevice: (payload: Record<string, unknown>) => Promise<unknown>;
    getDeviceDetail: (deviceId: string) => Promise<unknown>;
    updateDeviceStatus: (deviceId: string, payload: { status: string }) => Promise<unknown>;
    controlDevice: (
      deviceId: string,
      payload: { action: string; params?: Record<string, unknown> },
    ) => Promise<unknown>;
    deleteDevice: (deviceId: string) => Promise<unknown>;
  };

  readonly system: {
    getSummary: () => Promise<unknown>;
    listConfigs: (params?: AdminQueryParams) => Promise<unknown>;
    upsertConfig: (payload: { key: string; value: unknown; description?: string }) => Promise<unknown>;
    deleteConfig: (key: string) => Promise<unknown>;
    listAuditLogs: (params?: AdminQueryParams) => Promise<unknown>;
  };

  readonly rtc: {
    createChannel: (payload: Record<string, unknown>) => Promise<unknown>;
    getChannels: () => Promise<unknown>;
    getChannel: (id: string) => Promise<unknown>;
    updateChannel: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
    deleteChannel: (id: string) => Promise<unknown>;
    getProviderStats: (params?: AdminQueryParams) => Promise<unknown>;
    getProviderHealth: (params?: AdminQueryParams) => Promise<unknown>;
    getProviderCapabilities: () => Promise<unknown>;
  };

  readonly wukongim: {
    sendMessage: (payload: Record<string, unknown>) => Promise<unknown>;
    sendBatchMessages: (payload: Array<Record<string, unknown>>) => Promise<unknown>;
    syncMessages: (params?: AdminQueryParams) => Promise<unknown>;
    createChannel: (payload: Record<string, unknown>) => Promise<unknown>;
    deleteChannel: (payload: Record<string, unknown>) => Promise<unknown>;
    addSubscribers: (payload: Record<string, unknown>) => Promise<unknown>;
    removeSubscribers: (payload: Record<string, unknown>) => Promise<unknown>;
    getChannelInfo: (params?: AdminQueryParams) => Promise<unknown>;
    healthCheck: () => Promise<unknown>;
    getSystemInfo: () => Promise<unknown>;
    getSubscribers: (params?: AdminQueryParams) => Promise<unknown>;
  };

  constructor(config: OpenChatAdminSdkConfig) {
    this.rawApp = createAppBackendClient(config);
    this.rawAdmin = createAdminBackendClient(config);

    if (config.apiKey) {
      this.setApiKey(config.apiKey);
    }
    if (config.authToken) {
      this.setAuthToken(config.authToken);
    }
    if (config.accessToken) {
      this.setAccessToken(config.accessToken);
    }

    this.auth = {
      login: (payload) => this.rawApp.auth.controllerLogin(payload as never),
      logout: (payload = {}) => this.rawApp.auth.controllerLogout(payload as never),
      getCurrentUser: () => this.rawApp.auth.controllerGetCurrentUser(),
    };

    this.dashboard = {
      getOverview: () => this.rawAdmin.adminDashboard.controllerGetOverview(),
    };

    this.users = {
      list: (params) => this.rawAdmin.adminUsers.controllerList(params),
      getDetail: (userId) => this.rawAdmin.adminUsers.controllerGetDetail(userId),
      listDeviceSessions: (userId, params) =>
        this.rawAdmin.adminUsers.controllerListDeviceSessions(userId, params),
      logoutDeviceSession: (userId, deviceId) =>
        this.rawAdmin.adminUsers.controllerLogoutDeviceSession(
          userId,
          encodeURIComponent(deviceId),
        ),
      logoutAllDeviceSessions: (userId) =>
        this.rawAdmin.adminUsers.controllerLogoutAllDeviceSessions(userId),
      updateProfile: (userId, payload) =>
        this.rawAdmin.adminUsers.controllerUpdateProfile(userId, payload as never),
      updateRoles: (userId, payload) =>
        this.rawAdmin.adminUsers.controllerUpdateRoles(userId, payload as never),
      resetPassword: (userId, payload) =>
        this.rawAdmin.adminUsers.controllerResetPassword(userId, payload as never),
      delete: (userId) => this.rawAdmin.adminUsers.controllerDelete(userId),
    };

    this.groups = {
      list: (params) => this.rawAdmin.adminGroups.controllerList(params),
      getDetail: (groupId) => this.rawAdmin.adminGroups.controllerGetDetail(groupId),
      update: (groupId, payload) =>
        this.rawAdmin.adminGroups.controllerUpdate(groupId, payload as never),
      addMember: (groupId, payload) =>
        this.rawAdmin.adminGroups.controllerAddMember(groupId, payload as never),
      updateMemberRole: (groupId, userId, payload) =>
        this.rawAdmin.adminGroups.controllerUpdateMemberRole(groupId, userId, payload as never),
      updateMemberMute: (groupId, userId, payload) =>
        this.rawAdmin.adminGroups.controllerUpdateMemberMute(groupId, userId, payload as never),
      removeMember: (groupId, userId) =>
        this.rawAdmin.adminGroups.controllerRemoveMember(groupId, userId),
      transferOwner: (groupId, payload) =>
        this.rawAdmin.adminGroups.controllerTransferOwner(groupId, payload as never),
      delete: (groupId) => this.rawAdmin.adminGroups.controllerDelete(groupId),
    };

    this.friends = {
      list: (params) => this.rawAdmin.adminFriends.controllerList(params),
      listRequests: (params) => this.rawAdmin.adminFriends.controllerListRequests(params),
      acceptRequest: (requestId) =>
        this.rawAdmin.adminFriends.controllerAcceptRequest(requestId),
      rejectRequest: (requestId) =>
        this.rawAdmin.adminFriends.controllerRejectRequest(requestId),
      removeFriendship: (payload) =>
        this.rawAdmin.adminFriends.controllerRemoveFriendship(payload as never),
      blockFriendship: (payload) =>
        this.rawAdmin.adminFriends.controllerBlockFriendship(payload as never),
      unblockFriendship: (payload) =>
        this.rawAdmin.adminFriends.controllerUnblockFriendship(payload as never),
    };

    this.messages = {
      list: (params) => this.rawAdmin.adminMessages.controllerList(params),
      getDetail: (messageId) => this.rawAdmin.adminMessages.controllerGetDetail(messageId),
      delete: (messageId) => this.rawAdmin.adminMessages.controllerDelete(messageId),
      recall: (messageId) => this.rawAdmin.adminMessages.controllerRecall(messageId),
    };

    this.iot = {
      listDevices: (params) => this.rawAdmin.adminIot.controllerListDevices(params),
      createDevice: (payload) => this.rawAdmin.adminIot.controllerCreateDevice(payload as never),
      getDeviceDetail: (deviceId) =>
        this.rawAdmin.adminIot.controllerGetDeviceDetail(deviceId),
      updateDeviceStatus: (deviceId, payload) =>
        this.rawAdmin.adminIot.controllerUpdateDeviceStatus(deviceId, payload as never),
      controlDevice: (deviceId, payload) =>
        this.rawAdmin.adminIot.controllerControlDevice(deviceId, payload as never),
      deleteDevice: (deviceId) => this.rawAdmin.adminIot.controllerDeleteDevice(deviceId),
    };

    this.system = {
      getSummary: () => this.rawAdmin.adminSystem.controllerGetSummary(),
      listConfigs: (params) => this.rawAdmin.adminSystem.controllerListConfigs(params),
      upsertConfig: (payload) =>
        this.rawAdmin.adminSystem.controllerUpsertConfig(payload as never),
      deleteConfig: (key) =>
        this.rawAdmin.adminSystem.controllerDeleteConfig(encodeURIComponent(key)),
      listAuditLogs: (params) => this.rawAdmin.adminSystem.controllerListAuditLogs(params),
    };

    this.rtc = {
      createChannel: (payload) => this.rawAdmin.rtcAdmin.controllerCreateChannel(payload as never),
      getChannels: () => this.rawAdmin.rtcAdmin.controllerGetChannels(),
      getChannel: (id) => this.rawAdmin.rtcAdmin.controllerGetChannel(id),
      updateChannel: (id, payload) =>
        this.rawAdmin.rtcAdmin.controllerUpdateChannel(id, payload as never),
      deleteChannel: (id) => this.rawAdmin.rtcAdmin.controllerDeleteChannel(id),
      getProviderStats: (params) =>
        this.rawAdmin.rtcAdmin.controllerGetProviderOperationStats(params),
      getProviderHealth: (params) =>
        this.rawAdmin.rtcAdmin.controllerGetProviderHealthReport(params),
      getProviderCapabilities: () =>
        this.rawAdmin.rtcAdmin.controllerGetProviderCapabilities(),
    };

    this.wukongim = {
      sendMessage: (payload) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerSendMessage(payload as never),
      sendBatchMessages: (payload) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerSendBatchMessages(payload as never),
      syncMessages: (params) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerSyncMessages(params),
      createChannel: (payload) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerCreateChannel(payload as never),
      deleteChannel: (payload) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerDeleteChannel(payload as never),
      addSubscribers: (payload) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerAddSubscribers(payload as never),
      removeSubscribers: (payload) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerRemoveSubscribers(payload as never),
      getChannelInfo: (params) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerGetChannelInfo(params),
      healthCheck: () => this.rawAdmin.wukongimAdmin.wukongImadminControllerHealthCheck(),
      getSystemInfo: () =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerGetSystemInfo(),
      getSubscribers: (params) =>
        this.rawAdmin.wukongimAdmin.wukongImadminControllerGetSubscribers(params),
    };
  }

  setApiKey(apiKey: string): this {
    this.rawApp.setApiKey(apiKey);
    this.rawAdmin.setApiKey(apiKey);
    return this;
  }

  setAuthToken(token: string): this {
    this.rawApp.setAuthToken(token);
    this.rawApp.setAccessToken(token);
    this.rawAdmin.setAuthToken(token);
    this.rawAdmin.setAccessToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.rawApp.setAccessToken(token);
    this.rawAdmin.setAccessToken(token);
    return this;
  }

  clearAuth(): this {
    return this.setAuthToken('');
  }
}

export function createOpenChatAdminClient(
  config: OpenChatAdminSdkConfig,
): OpenChatAdminClient {
  return new OpenChatAdminClient(config);
}
