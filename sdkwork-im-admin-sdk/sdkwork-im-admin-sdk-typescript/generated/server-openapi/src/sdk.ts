import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkBackendConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { AdminDashboardApi, createAdminDashboardApi } from './api/admin-dashboard';
import { AdminUsersApi, createAdminUsersApi } from './api/admin-users';
import { AdminGroupsApi, createAdminGroupsApi } from './api/admin-groups';
import { AdminFriendsApi, createAdminFriendsApi } from './api/admin-friends';
import { AdminMessagesApi, createAdminMessagesApi } from './api/admin-messages';
import { AdminIotApi, createAdminIotApi } from './api/admin-iot';
import { AdminSystemApi, createAdminSystemApi } from './api/admin-system';
import { RtcAdminApi, createRtcAdminApi } from './api/rtc-admin';
import { WukongimAdminApi, createWukongimAdminApi } from './api/wukongim-admin';

export class SdkworkBackendClient {
  private httpClient: HttpClient;

  public readonly adminDashboard: AdminDashboardApi;
  public readonly adminUsers: AdminUsersApi;
  public readonly adminGroups: AdminGroupsApi;
  public readonly adminFriends: AdminFriendsApi;
  public readonly adminMessages: AdminMessagesApi;
  public readonly adminIot: AdminIotApi;
  public readonly adminSystem: AdminSystemApi;
  public readonly rtcAdmin: RtcAdminApi;
  public readonly wukongimAdmin: WukongimAdminApi;

  constructor(config: SdkworkBackendConfig) {
    this.httpClient = createHttpClient(config);
    this.adminDashboard = createAdminDashboardApi(this.httpClient);

    this.adminUsers = createAdminUsersApi(this.httpClient);

    this.adminGroups = createAdminGroupsApi(this.httpClient);

    this.adminFriends = createAdminFriendsApi(this.httpClient);

    this.adminMessages = createAdminMessagesApi(this.httpClient);

    this.adminIot = createAdminIotApi(this.httpClient);

    this.adminSystem = createAdminSystemApi(this.httpClient);

    this.rtcAdmin = createRtcAdminApi(this.httpClient);

    this.wukongimAdmin = createWukongimAdminApi(this.httpClient);
  }

  setApiKey(apiKey: string): this {
    this.httpClient.setApiKey(apiKey);
    return this;
  }

  setAuthToken(token: string): this {
    this.httpClient.setAuthToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.httpClient.setAccessToken(token);
    return this;
  }

  setTokenManager(manager: AuthTokenManager): this {
    this.httpClient.setTokenManager(manager);
    return this;
  }

  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkBackendConfig): SdkworkBackendClient {
  return new SdkworkBackendClient(config);
}

export default SdkworkBackendClient;
