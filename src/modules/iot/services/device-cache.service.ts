/**
 * 设备信息缓存服务
 * 用于缓存设备信息，减少数据库查询
 */

import { Injectable, Logger } from '@nestjs/common';
import { DeviceEntity } from '../entities/device.entity';

@Injectable()
export class DeviceCacheService {
  private readonly logger = new Logger(DeviceCacheService.name);
  private readonly deviceCache = new Map<string, DeviceEntity>();
  private readonly deviceIdToCacheKey = new Map<string, string>();
  private readonly TTL = 5 * 60 * 1000; // 5分钟过期时间
  private readonly cacheTimestamps = new Map<string, number>();

  /**
   * 缓存设备信息
   */
  cacheDevice(device: DeviceEntity): void {
    const cacheKey = this.getCacheKey(device.id);
    this.deviceCache.set(cacheKey, device);
    this.deviceIdToCacheKey.set(device.deviceId, cacheKey);
    this.cacheTimestamps.set(cacheKey, Date.now());
    this.logger.debug(`Cached device: ${device.deviceId}`);
  }

  /**
   * 根据设备ID获取缓存的设备信息
   */
  getDeviceById(id: string): DeviceEntity | null {
    const cacheKey = this.getCacheKey(id);
    return this.getDeviceFromCache(cacheKey);
  }

  /**
   * 根据设备唯一标识获取缓存的设备信息
   */
  getDeviceByDeviceId(deviceId: string): DeviceEntity | null {
    const cacheKey = this.deviceIdToCacheKey.get(deviceId);
    if (!cacheKey) {
      return null;
    }
    return this.getDeviceFromCache(cacheKey);
  }

  /**
   * 从缓存中获取设备信息
   */
  private getDeviceFromCache(cacheKey: string): DeviceEntity | null {
    const device = this.deviceCache.get(cacheKey);
    if (!device) {
      return null;
    }

    // 检查是否过期
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (timestamp && Date.now() - timestamp > this.TTL) {
      this.removeDeviceFromCache(cacheKey);
      return null;
    }

    return device;
  }

  /**
   * 从缓存中移除设备信息
   */
  removeDeviceFromCache(cacheKey: string): void {
    const device = this.deviceCache.get(cacheKey);
    if (device) {
      this.deviceIdToCacheKey.delete(device.deviceId);
    }
    this.deviceCache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
    this.logger.debug(`Removed device from cache: ${cacheKey}`);
  }

  /**
   * 根据deviceId从缓存中移除设备信息
   */
  removeDeviceByDeviceId(deviceId: string): void {
    const cacheKey = this.deviceIdToCacheKey.get(deviceId);
    if (cacheKey) {
      this.removeDeviceFromCache(cacheKey);
      this.logger.debug(`Removed device from cache by deviceId: ${deviceId}`);
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.deviceCache.clear();
    this.deviceIdToCacheKey.clear();
    this.cacheTimestamps.clear();
    this.logger.debug('Cleared all device cache');
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): number {
    let count = 0;
    const now = Date.now();

    for (const [cacheKey, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.TTL) {
        this.removeDeviceFromCache(cacheKey);
        count++;
      }
    }

    if (count > 0) {
      this.logger.debug(`Cleared ${count} expired device cache entries`);
    }

    return count;
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.deviceCache.size;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(id: string): string {
    return `device:${id}`;
  }
}
