import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';
import type { AdminFriendPairDto } from '../types';


export class AdminFriendsApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

async controllerList(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/friends`), params);
  }

async controllerListRequests(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/friends/requests`), params);
  }

async controllerAcceptRequest(id: string | number): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/friends/requests/${id}/accept`));
  }

async controllerRejectRequest(id: string | number): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/friends/requests/${id}/reject`));
  }

async controllerRemoveFriendship(body: AdminFriendPairDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/friends/remove`), body);
  }

async controllerBlockFriendship(body: AdminFriendPairDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/friends/block`), body);
  }

async controllerUnblockFriendship(body: AdminFriendPairDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/friends/unblock`), body);
  }
}

export function createAdminFriendsApi(client: HttpClient): AdminFriendsApi {
  return new AdminFriendsApi(client);
}
