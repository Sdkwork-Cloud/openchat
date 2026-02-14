/**
 * IoT服务
 * 负责设备管理和消息处理
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceEntity, DeviceType, DeviceStatus } from './entities/device.entity';
import { DeviceMessageEntity, DeviceMessageType, DeviceMessageDirection } from './entities/device-message.entity';
import { XiaoZhiService } from './xiaozhi/xiaozhi.service';
import { IoTException, IoTErrorCode } from './exceptions/iot.exception';
import { DeviceCacheService } from './services/device-cache.service';

@Injectable()
export class IoTService {
  private readonly logger = new Logger(IoTService.name);

  constructor(
    @InjectRepository(DeviceEntity)
    private deviceRepository: Repository<DeviceEntity>,
    @InjectRepository(DeviceMessageEntity)
    private deviceMessageRepository: Repository<DeviceMessageEntity>,
    private xiaoZhiService: XiaoZhiService,
    private deviceCacheService: DeviceCacheService,
  ) {}

  /**
   * 模块初始化时启动缓存清理定时器
   */
  onModuleInit(): void {
    // 每10分钟清理一次过期缓存
    this.cacheCleanupInterval = setInterval(() => {
      const count = this.deviceCacheService.clearExpiredCache();
      if (count > 0) {
        this.logger.debug(`Cleaned up ${count} expired device cache entries`);
      }
    }, 10 * 60 * 1000);
  }

  /**
   * 模块销毁时清理定时器
   */
  onModuleDestroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
  }

  private cacheCleanupInterval: NodeJS.Timeout;

  // ==================== 设备管理 ====================

  /**
   * 注册设备
   */
  async registerDevice(deviceData: {
    deviceId: string;
    type: DeviceType;
    name: string;
    description?: string;
    ipAddress?: string;
    macAddress?: string;
    metadata?: any;
    userId?: string;
  }): Promise<DeviceEntity> {
    try {
      // 检查设备是否已存在
      let device = await this.deviceRepository.findOne({
        where: { deviceId: deviceData.deviceId },
      });

      if (device) {
        // 更新设备信息
        await this.deviceRepository.update(device.id, {
          type: deviceData.type,
          name: deviceData.name,
          description: deviceData.description,
          ipAddress: deviceData.ipAddress,
          macAddress: deviceData.macAddress,
          metadata: deviceData.metadata,
          userId: deviceData.userId,
          status: DeviceStatus.ONLINE,
        });
        device = await this.deviceRepository.findOne({
          where: { deviceId: deviceData.deviceId },
        });
        // 更新缓存
        if (device) {
          this.deviceCacheService.cacheDevice(device);
        }
      } else {
        // 创建新设备
        device = this.deviceRepository.create({
          ...deviceData,
          status: DeviceStatus.ONLINE,
        });
        device = await this.deviceRepository.save(device);
        // 缓存新设备
        this.deviceCacheService.cacheDevice(device);
      }

      if (!device) {
        throw new Error('Failed to register device');
      }
      this.logger.log(`Device registered: ${device.deviceId}, type: ${device.type}`);
      return device;
    } catch (error) {
      this.logger.error('Failed to register device:', error);
      throw error;
    }
  }

  /**
   * 获取设备列表
   */
  async getDevices(userId?: string, page: number = 1, limit: number = 20): Promise<{
    devices: DeviceEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const query = this.deviceRepository.createQueryBuilder('device');
      if (userId) {
        query.where('device.userId = :userId', { userId });
      }

      // 计算总数
      const total = await query.getCount();
      
      // 计算总页数
      const totalPages = Math.ceil(total / limit);
      
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      // 获取分页数据
      const devices = await query
        .skip(offset)
        .take(limit)
        .getMany();

      return {
        devices,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Failed to get devices:', error);
      throw IoTException.internalError((error as Error).message);
    }
  }

  /**
   * 获取设备详情
   */
  async getDevice(deviceId: string): Promise<DeviceEntity> {
    try {
      // 先从缓存中获取
      const cachedDevice = this.deviceCacheService.getDeviceByDeviceId(deviceId);
      if (cachedDevice) {
        this.logger.debug(`Retrieved device from cache: ${deviceId}`);
        return cachedDevice;
      }

      // 缓存中没有，从数据库获取
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
      });
      if (!device) {
        throw IoTException.deviceNotFound(deviceId);
      }

      // 缓存设备信息
      this.deviceCacheService.cacheDevice(device);
      this.logger.debug(`Retrieved device from database and cached: ${deviceId}`);
      return device;
    } catch (error) {
      if (error instanceof IoTException) {
        throw error;
      }
      this.logger.error(`Failed to get device ${deviceId}:`, error);
      throw IoTException.internalError((error as Error).message);
    }
  }

  /**
   * 更新设备状态
   */
  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<DeviceEntity> {
    try {
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
      });
      if (!device) {
        throw IoTException.deviceNotFound(deviceId);
      }

      device.status = status;
      const updatedDevice = await this.deviceRepository.save(device);
      
      // 更新缓存
      this.deviceCacheService.cacheDevice(updatedDevice);
      this.logger.debug(`Updated device status in cache: ${deviceId}, status: ${status}`);
      
      return updatedDevice;
    } catch (error) {
      if (error instanceof IoTException) {
        throw error;
      }
      this.logger.error(`Failed to update device status ${deviceId}:`, error);
      throw IoTException.internalError((error as Error).message);
    }
  }

  /**
   * 删除设备
   */
  async deleteDevice(deviceId: string): Promise<boolean> {
    try {
      // 先获取设备信息，用于后续缓存清理
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
      });
      
      const result = await this.deviceRepository.delete({
        deviceId,
      });
      
      // 如果设备存在且删除成功，从缓存中移除
      if (device && (result.affected ?? 0) > 0) {
        this.deviceCacheService.removeDeviceByDeviceId(deviceId);
        this.logger.debug(`Removed device from cache after deletion: ${deviceId}`);
      }
      
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.logger.error(`Failed to delete device ${deviceId}:`, error);
      throw error;
    }
  }

  // ==================== 消息管理 ====================

  /**
   * 发送消息到设备
   */
  async sendMessageToDevice(
    deviceId: string,
    message: {
      type: DeviceMessageType;
      payload: any;
      topic?: string;
    },
  ): Promise<DeviceMessageEntity> {
    try {
      // 检查设备是否存在
      const device = await this.getDevice(deviceId);

      // 创建消息记录
      const deviceMessage = this.deviceMessageRepository.create({
        deviceId,
        type: message.type,
        direction: DeviceMessageDirection.TO_DEVICE,
        payload: message.payload,
        topic: message.topic,
        processed: false,
      });

      const savedMessage = await this.deviceMessageRepository.save(deviceMessage);

      try {
        // 根据设备类型处理消息
        if (device.type === DeviceType.XIAOZHI) {
          // 发送消息到开源小智
          await this.xiaoZhiService.sendMessage(deviceId, message.payload);
        }
      } catch (sendError) {
        // 标记消息为处理失败
        savedMessage.processed = true;
        savedMessage.error = (sendError as Error).message;
        await this.deviceMessageRepository.save(savedMessage);
        throw IoTException.messageSendFailed(deviceId, (sendError as Error).message);
      }

      // 标记消息为已处理
      savedMessage.processed = true;
      await this.deviceMessageRepository.save(savedMessage);

      this.logger.log(`Message sent to device: ${deviceId}, type: ${message.type}`);
      return savedMessage;
    } catch (error) {
      if (error instanceof IoTException) {
        throw error;
      }
      this.logger.error(`Failed to send message to device ${deviceId}:`, error);
      throw IoTException.internalError((error as Error).message);
    }
  }

  /**
   * 接收来自设备的消息
   */
  async receiveMessageFromDevice(
    deviceId: string,
    message: {
      type: DeviceMessageType;
      payload: any;
      topic?: string;
    },
  ): Promise<DeviceMessageEntity> {
    try {
      // 检查设备是否存在
      const device = await this.getDevice(deviceId);

      // 创建消息记录
      const deviceMessage = this.deviceMessageRepository.create({
        deviceId,
        type: message.type,
        direction: DeviceMessageDirection.FROM_DEVICE,
        payload: message.payload,
        topic: message.topic,
        processed: false,
      });

      const savedMessage = await this.deviceMessageRepository.save(deviceMessage);

      // 根据设备类型处理消息
      if (device.type === DeviceType.XIAOZHI) {
        // 处理来自开源小智的消息
        await this.xiaoZhiService.processMessage(deviceId, message.payload);
      }

      // 标记消息为已处理
      savedMessage.processed = true;
      await this.deviceMessageRepository.save(savedMessage);

      this.logger.log(`Message received from device: ${deviceId}, type: ${message.type}`);
      return savedMessage;
    } catch (error) {
      this.logger.error(`Failed to receive message from device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * 获取设备消息历史
   */
  async getDeviceMessages(
    deviceId: string,
    limit: number = 100,
    before?: Date,
  ): Promise<DeviceMessageEntity[]> {
    try {
      const query = this.deviceMessageRepository.createQueryBuilder('message')
        .where('message.deviceId = :deviceId', { deviceId })
        .orderBy('message.createdAt', 'DESC')
        .limit(limit);

      if (before) {
        query.andWhere('message.createdAt < :before', { before });
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error(`Failed to get device messages ${deviceId}:`, error);
      throw error;
    }
  }

  // ==================== 设备控制 ====================

  /**
   * 控制设备
   */
  async controlDevice(
    deviceId: string,
    command: {
      action: string;
      params?: any;
    },
  ): Promise<boolean> {
    try {
      // 检查设备是否存在
      const device = await this.getDevice(deviceId);

      // 创建控制消息
      const message = {
        type: DeviceMessageType.COMMAND,
        payload: command,
        topic: 'control',
      };

      // 发送控制消息
      await this.sendMessageToDevice(deviceId, message);

      this.logger.log(`Device controlled: ${deviceId}, action: ${command.action}`);
      return true;
    } catch (error) {
      if (error instanceof IoTException) {
        if (error.errorCode === IoTErrorCode.MESSAGE_SEND_FAILED) {
          throw IoTException.deviceControlFailed(deviceId, error.message);
        }
        throw error;
      }
      this.logger.error(`Failed to control device ${deviceId}:`, error);
      throw IoTException.deviceControlFailed(deviceId, (error as Error).message);
    }
  }
}
