import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';
import type { QueryParams } from '../types/common';
import type { AdminDeviceCommandDto, AdminDeviceCreateDto, AdminDeviceStatusUpdateDto } from '../types';


export class AdminIotApi {
  private client: HttpClient;
  
  constructor(client: HttpClient) { 
    this.client = client; 
  }

async controllerListDevices(params?: QueryParams): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/iot/devices`), params);
  }

async controllerCreateDevice(body: AdminDeviceCreateDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/iot/devices`), body);
  }

async controllerGetDeviceDetail(deviceId: string | number): Promise<unknown> {
    return this.client.get<unknown>(backendApiPath(`/iot/devices/${deviceId}`));
  }

async controllerDeleteDevice(deviceId: string | number): Promise<unknown> {
    return this.client.delete<unknown>(backendApiPath(`/iot/devices/${deviceId}`));
  }

async controllerUpdateDeviceStatus(deviceId: string | number, body: AdminDeviceStatusUpdateDto): Promise<unknown> {
    return this.client.put<unknown>(backendApiPath(`/iot/devices/${deviceId}/status`), body);
  }

async controllerControlDevice(deviceId: string | number, body: AdminDeviceCommandDto): Promise<unknown> {
    return this.client.post<unknown>(backendApiPath(`/iot/devices/${deviceId}/control`), body);
  }
}

export function createAdminIotApi(client: HttpClient): AdminIotApi {
  return new AdminIotApi(client);
}
