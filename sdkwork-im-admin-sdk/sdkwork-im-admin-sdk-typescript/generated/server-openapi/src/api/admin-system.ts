import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';
import type { AdminConfigUpsertDto } from '../types';


export class AdminSystemApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

async controllerGetSummary(): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/system/summary`));
  }

async controllerListConfigs(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/system/configs`), params);
  }

async controllerUpsertConfig(body: AdminConfigUpsertDto): Promise<unknown> {
    return this.client.put<unknown>(backendApiPath(`/system/configs`), body);
  }

async controllerDeleteConfig(key: string | number): Promise<unknown> {
    return this.client.delete<unknown>(backendApiPath(`/system/configs/${key}`));
  }

async controllerListAuditLogs(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/system/audit-logs`), params);
  }
}

export function createAdminSystemApi(client: HttpClient): AdminSystemApi {
  return new AdminSystemApi(client);
}
