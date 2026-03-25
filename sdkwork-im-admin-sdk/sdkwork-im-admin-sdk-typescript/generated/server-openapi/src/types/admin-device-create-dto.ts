export interface AdminDeviceCreateDto {
  deviceId: string;
  type: 'xiaozhi' | 'other';
  name: string;
  description?: string;
  ipAddress?: string;
  macAddress?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}
