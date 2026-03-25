import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';
import type { AdminUserProfileUpdateDto, AdminUserResetPasswordDto, AdminUserRolesUpdateDto } from '../types';


export class AdminUsersApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

async controllerList(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/users`), params);
  }

async controllerListDeviceSessions(id: string | number, params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/users/${id}/device-sessions`), params);
  }

async controllerLogoutAllDeviceSessions(id: string | number): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/users/${id}/device-sessions/logout-all`));
  }

async controllerLogoutDeviceSession(id: string | number, deviceId: string | number): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/users/${id}/device-sessions/${deviceId}/logout`));
  }

async controllerGetDetail(id: string | number): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/users/${id}`));
  }

async controllerDelete(id: string | number): Promise<unknown> {
    return this.client.delete<unknown>(backendApiPath(`/users/${id}`));
  }

async controllerUpdateProfile(id: string | number, body: AdminUserProfileUpdateDto): Promise<unknown> {
    return this.client.put<unknown>(backendApiPath(`/users/${id}/profile`), body);
  }

async controllerUpdateRoles(id: string | number, body: AdminUserRolesUpdateDto): Promise<unknown> {
    return this.client.put<unknown>(backendApiPath(`/users/${id}/roles`), body);
  }

async controllerResetPassword(id: string | number, body: AdminUserResetPasswordDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/users/${id}/reset-password`), body);
  }
}

export function createAdminUsersApi(client: HttpClient): AdminUsersApi {
  return new AdminUsersApi(client);
}
