/**
 * 小智安全服务
 * 负责设备认证、授权和数据加密
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceConnection } from '../xiaozhi.types';
import { EventBusService, EventTypeConstants, EventPriority } from '../../../../common/events/event-bus.service';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * 设备认证信息接口
 */
interface DeviceAuthInfo {
  deviceId: string;
  deviceSecret: string;
  certificate?: string;
  lastAuthTime: number;
  authStatus: 'pending' | 'authenticated' | 'rejected';
}

/**
 * 安全配置接口
 */
interface SecurityConfig {
  jwtSecret: string;
  jwtExpiry: number;
  encryptionAlgorithm: string;
  hashAlgorithm: string;
  authTimeout: number;
  maxAuthAttempts: number;
}

@Injectable()
export class XiaoZhiSecurityService implements OnModuleInit {
  private readonly logger = new Logger(XiaoZhiSecurityService.name);
  private readonly deviceAuthStore = new Map<string, DeviceAuthInfo>();
  private readonly securityConfig: SecurityConfig;
  private readonly authAttempts = new Map<string, number>();

  constructor(
    private configService: ConfigService,
    private eventBusService: EventBusService
  ) {
    this.securityConfig = {
      jwtSecret: this.configService.get<string>('XIAOZHI_JWT_SECRET') || 'xiaozhi-secret-key',
      jwtExpiry: this.configService.get<number>('XIAOZHI_JWT_EXPIRY') || 3600,
      encryptionAlgorithm: 'aes-256-cbc',
      hashAlgorithm: 'sha256',
      authTimeout: 30000,
      maxAuthAttempts: 5,
    };
  }

  async onModuleInit() {
    this.logger.log('Security service initialized with authentication and encryption');
  }

  /**
   * 生成设备认证令牌
   */
  generateAuthToken(deviceId: string): string {
    const payload = {
      deviceId,
      timestamp: Date.now(),
      type: 'device_auth',
    };

    return jwt.sign(payload, this.securityConfig.jwtSecret, {
      expiresIn: this.securityConfig.jwtExpiry,
    });
  }

  /**
   * 验证设备认证令牌
   */
  verifyAuthToken(token: string): { deviceId: string } | null {
    try {
      const decoded = jwt.verify(token, this.securityConfig.jwtSecret) as any;
      return { deviceId: decoded.deviceId };
    } catch (error) {
      this.logger.error('Failed to verify auth token:', error);
      return null;
    }
  }

  /**
   * 处理设备认证
   */
  authenticateDevice(deviceId: string, authData: any): boolean {
    // 检查认证尝试次数
    const attempts = this.authAttempts.get(deviceId) || 0;
    if (attempts >= this.securityConfig.maxAuthAttempts) {
      this.logger.warn(`Device ${deviceId} exceeded max auth attempts`);
      return false;
    }

    try {
      // 验证设备认证数据
      const deviceAuthInfo = this.deviceAuthStore.get(deviceId);
      if (!deviceAuthInfo) {
        // 新设备，注册认证信息
        this.registerDevice(deviceId, authData);
        return true;
      }

      // 验证设备密钥
      if (!this.verifyDeviceSecret(deviceId, authData.secret)) {
        this.authAttempts.set(deviceId, attempts + 1);
        return false;
      }

      // 验证证书（如果有）
      if (deviceAuthInfo.certificate && !this.verifyCertificate(deviceId, authData.certificate)) {
        this.authAttempts.set(deviceId, attempts + 1);
        return false;
      }

      // 认证成功
      deviceAuthInfo.lastAuthTime = Date.now();
      deviceAuthInfo.authStatus = 'authenticated';
      this.deviceAuthStore.set(deviceId, deviceAuthInfo);
      this.authAttempts.delete(deviceId);

      // 发布认证成功事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          timestamp: Date.now(),
          type: 'device_authenticated'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiSecurityService',
        }
      );

      this.logger.log(`Device ${deviceId} authenticated successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to authenticate device ${deviceId}:`, error);
      this.authAttempts.set(deviceId, attempts + 1);
      return false;
    }
  }

  /**
   * 验证设备密钥
   */
  private verifyDeviceSecret(deviceId: string, secret: string): boolean {
    const deviceAuthInfo = this.deviceAuthStore.get(deviceId);
    if (!deviceAuthInfo) {
      return false;
    }

    // 验证密钥哈希
    const hashedSecret = this.hashData(secret);
    return hashedSecret === deviceAuthInfo.deviceSecret;
  }

  /**
   * 验证设备证书
   */
  private verifyCertificate(deviceId: string, certificate: string): boolean {
    // 这里可以实现证书验证逻辑
    // 实际应用中应该使用PKI体系
    const deviceAuthInfo = this.deviceAuthStore.get(deviceId);
    if (!deviceAuthInfo || !deviceAuthInfo.certificate) {
      return false;
    }

    return certificate === deviceAuthInfo.certificate;
  }

  /**
   * 注册新设备
   */
  private registerDevice(deviceId: string, authData: any): void {
    const deviceAuthInfo: DeviceAuthInfo = {
      deviceId,
      deviceSecret: this.hashData(authData.secret || this.generateRandomSecret()),
      certificate: authData.certificate,
      lastAuthTime: Date.now(),
      authStatus: 'authenticated',
    };

    this.deviceAuthStore.set(deviceId, deviceAuthInfo);
    this.logger.log(`New device ${deviceId} registered`);
  }

  /**
   * 生成随机设备密钥
   */
  private generateRandomSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 加密数据
   */
  encryptData(data: string | Buffer, deviceId: string): Buffer {
    const key = this.generateDeviceKey(deviceId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.securityConfig.encryptionAlgorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * 解密数据
   */
  decryptData(encryptedData: Buffer, deviceId: string): Buffer {
    const key = this.generateDeviceKey(deviceId);
    const iv = encryptedData.slice(0, 16);
    const data = encryptedData.slice(16);
    const decipher = crypto.createDecipheriv(this.securityConfig.encryptionAlgorithm, key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  /**
   * 生成设备特定的加密密钥
   */
  private generateDeviceKey(deviceId: string): Buffer {
    const seed = `${deviceId}:${this.securityConfig.jwtSecret}`;
    return crypto.createHash(this.securityConfig.hashAlgorithm).update(seed).digest().slice(0, 32);
  }

  /**
   * 哈希数据
   */
  private hashData(data: string): string {
    return crypto.createHash(this.securityConfig.hashAlgorithm).update(data).digest('hex');
  }

  /**
   * 生成数据签名
   */
  generateDataSignature(data: string | Buffer, deviceId: string): string {
    const key = this.generateDeviceKey(deviceId);
    return crypto.createHmac(this.securityConfig.hashAlgorithm, key).update(data).digest('hex');
  }

  /**
   * 验证数据签名
   */
  verifyDataSignature(data: string | Buffer, signature: string, deviceId: string): boolean {
    const expectedSignature = this.generateDataSignature(data, deviceId);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * 检查设备是否已认证
   */
  isDeviceAuthenticated(deviceId: string): boolean {
    const deviceAuthInfo = this.deviceAuthStore.get(deviceId);
    if (!deviceAuthInfo) {
      return false;
    }

    return deviceAuthInfo.authStatus === 'authenticated';
  }

  /**
   * 刷新设备认证状态
   */
  refreshDeviceAuth(deviceId: string): boolean {
    const deviceAuthInfo = this.deviceAuthStore.get(deviceId);
    if (!deviceAuthInfo) {
      return false;
    }

    deviceAuthInfo.lastAuthTime = Date.now();
    this.deviceAuthStore.set(deviceId, deviceAuthInfo);
    return true;
  }

  /**
   * 吊销设备认证
   */
  revokeDeviceAuth(deviceId: string): void {
    const deviceAuthInfo = this.deviceAuthStore.get(deviceId);
    if (deviceAuthInfo) {
      deviceAuthInfo.authStatus = 'rejected';
      this.deviceAuthStore.set(deviceId, deviceAuthInfo);
      this.logger.log(`Device ${deviceId} authentication revoked`);
    }
  }

  /**
   * 获取设备认证状态
   */
  getDeviceAuthStatus(deviceId: string): DeviceAuthInfo | null {
    return this.deviceAuthStore.get(deviceId) || null;
  }

  /**
   * 清理过期的认证信息
   */
  cleanupExpiredAuth(): void {
    const now = Date.now();
    const expiredDevices: string[] = [];

    for (const [deviceId, authInfo] of this.deviceAuthStore.entries()) {
      if (now - authInfo.lastAuthTime > this.securityConfig.jwtExpiry * 1000) {
        expiredDevices.push(deviceId);
      }
    }

    for (const deviceId of expiredDevices) {
      this.deviceAuthStore.delete(deviceId);
      this.authAttempts.delete(deviceId);
      this.logger.debug(`Cleaned up expired auth for device ${deviceId}`);
    }

    if (expiredDevices.length > 0) {
      this.logger.log(`Cleaned up ${expiredDevices.length} expired auth entries`);
    }
  }

  /**
   * 验证设备操作权限
   */
  verifyDevicePermission(deviceId: string, operation: string): boolean {
    // 检查设备是否已认证
    if (!this.isDeviceAuthenticated(deviceId)) {
      return false;
    }

    // 这里可以实现更细粒度的权限控制
    // 例如基于设备类型、角色等的权限检查
    const allowedOperations = [
      'audio_stream',
      'command_execution',
      'status_update',
      'configuration_change',
    ];

    return allowedOperations.includes(operation);
  }

  /**
   * 生成安全的设备会话ID
   */
  generateSecureSessionId(deviceId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const seed = `${deviceId}:${timestamp}:${random}`;
    return crypto.createHash(this.securityConfig.hashAlgorithm).update(seed).digest('hex');
  }
}
