import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';


export class AdminMessagesApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

async controllerList(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/messages`), params);
  }

async controllerGetDetail(id: string | number): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/messages/${id}`));
  }

async controllerDelete(id: string | number): Promise<unknown> {
    return this.client.delete<unknown>(backendApiPath(`/messages/${id}`));
  }

async controllerRecall(id: string | number): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/messages/${id}/recall`));
  }
}

export function createAdminMessagesApi(client: HttpClient): AdminMessagesApi {
  return new AdminMessagesApi(client);
}
