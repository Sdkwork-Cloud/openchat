import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';


export class AdminDashboardApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

async controllerGetOverview(): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/dashboard/overview`));
  }
}

export function createAdminDashboardApi(client: HttpClient): AdminDashboardApi {
  return new AdminDashboardApi(client);
}
