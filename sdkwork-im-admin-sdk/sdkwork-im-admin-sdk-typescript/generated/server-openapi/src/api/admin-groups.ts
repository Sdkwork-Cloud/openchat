import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';
import type { AdminGroupMemberMuteDto, AdminGroupMemberRoleUpdateDto, AdminGroupMemberUpdateDto, AdminGroupTransferOwnerDto, AdminGroupUpdateDto } from '../types';


export class AdminGroupsApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

async controllerList(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/groups`), params);
  }

async controllerGetDetail(id: string | number): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/groups/${id}`));
  }

async controllerUpdate(id: string | number, body: AdminGroupUpdateDto): Promise<unknown> {
    return this.client.put<unknown>(backendApiPath(`/groups/${id}`), body);
  }

async controllerDelete(id: string | number): Promise<unknown> {
    return this.client.delete<unknown>(backendApiPath(`/groups/${id}`));
  }

async controllerAddMember(id: string | number, body: AdminGroupMemberUpdateDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/groups/${id}/members`), body);
  }

async controllerUpdateMemberRole(id: string | number, userId: string | number, body: AdminGroupMemberRoleUpdateDto): Promise<unknown> {
    return this.client.put<unknown>(backendApiPath(`/groups/${id}/members/${userId}/role`), body);
  }

async controllerUpdateMemberMute(id: string | number, userId: string | number, body: AdminGroupMemberMuteDto): Promise<unknown> {
    return this.client.put<unknown>(backendApiPath(`/groups/${id}/members/${userId}/mute`), body);
  }

async controllerRemoveMember(id: string | number, userId: string | number): Promise<unknown> {
    return this.client.delete<unknown>(backendApiPath(`/groups/${id}/members/${userId}`));
  }

async controllerTransferOwner(id: string | number, body: AdminGroupTransferOwnerDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/groups/${id}/transfer`), body);
  }
}

export function createAdminGroupsApi(client: HttpClient): AdminGroupsApi {
  return new AdminGroupsApi(client);
}
