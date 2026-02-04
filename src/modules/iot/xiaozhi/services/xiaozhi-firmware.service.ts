/**
 * 小智固件升级服务
 * 负责设备固件的管理和升级
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService, EventType, EventPriority } from '../../../../common/events/event-bus.service';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';

/**
 * 固件信息接口
 */
interface FirmwareInfo {
  version: string;
  filename: string;
  size: number;
  checksum: string;
  releaseDate: string;
  description: string;
  hardwareVersion: string;
  minProtocolVersion: string;
  url: string;
}

/**
 * 固件升级状态接口
 */
interface FirmwareUpgradeState {
  deviceId: string;
  firmwareVersion: string;
  status: 'initiated' | 'downloading' | 'flashing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startTime: number;
  lastUpdate: number;
}

/**
 * 固件配置接口
 */
interface FirmwareConfig {
  firmwareDir: string;
  maxFirmwareSize: number;
  downloadTimeout: number;
  upgradeTimeout: number;
  checkInterval: number;
}

@Injectable()
export class XiaoZhiFirmwareService implements OnModuleInit {
  private readonly logger = new Logger(XiaoZhiFirmwareService.name);
  private readonly firmwares = new Map<string, FirmwareInfo>();
  private readonly upgradeStates = new Map<string, FirmwareUpgradeState>();
  private readonly config: FirmwareConfig;

  constructor(
    private configService: ConfigService,
    private eventBusService: EventBusService
  ) {
    this.config = {
      firmwareDir: this.configService.get<string>('XIAOZHI_FIRMWARE_DIR') || path.join(__dirname, '..', 'firmware'),
      maxFirmwareSize: this.configService.get<number>('XIAOZHI_MAX_FIRMWARE_SIZE') || 16 * 1024 * 1024, // 16MB
      downloadTimeout: this.configService.get<number>('XIAOZHI_DOWNLOAD_TIMEOUT') || 300000, // 5分钟
      upgradeTimeout: this.configService.get<number>('XIAOZHI_UPGRADE_TIMEOUT') || 600000, // 10分钟
      checkInterval: this.configService.get<number>('XIAOZHI_CHECK_INTERVAL') || 60000, // 1分钟
    };
  }

  async onModuleInit() {
    this.logger.log('Firmware service initialized');
    await this.initializeFirmwareDirectory();
    await this.scanFirmwares();
  }

  /**
   * 初始化固件目录
   */
  private async initializeFirmwareDirectory(): Promise<void> {
    try {
      if (!fs.existsSync(this.config.firmwareDir)) {
        fs.mkdirSync(this.config.firmwareDir, { recursive: true });
        this.logger.log(`Created firmware directory: ${this.config.firmwareDir}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize firmware directory:', error);
    }
  }

  /**
   * 扫描固件
   */
  private async scanFirmwares(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.firmwareDir);
      this.logger.log(`Found ${files.length} files in firmware directory`);

      for (const file of files) {
        const filePath = path.join(this.config.firmwareDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && (file.endsWith('.bin') || file.endsWith('.bin.gz'))) {
          // 解析固件文件名获取版本信息
          // 假设文件名为: firmware-{hardware}-{version}.bin
          const match = file.match(/firmware-(\w+)-(\d+\.\d+\.\d+)(?:-(\w+))?\.(bin|bin\.gz)/);
          if (match) {
            const [, hardwareVersion, version, variant, extension] = match;
            const firmwareInfo: FirmwareInfo = {
              version,
              filename: file,
              size: stats.size,
              checksum: await this.calculateChecksum(filePath),
              releaseDate: stats.mtime.toISOString(),
              description: `Firmware version ${version} for ${hardwareVersion}`,
              hardwareVersion,
              minProtocolVersion: '1.0.0',
              url: `http://localhost:3000/api/xiaozhi/firmware/${file}`,
            };

            this.firmwares.set(`${hardwareVersion}:${version}`, firmwareInfo);
            this.logger.log(`Found firmware: ${file}, version: ${version}, hardware: ${hardwareVersion}`);
          }
        }
      }

      this.logger.log(`Scanned ${this.firmwares.size} firmwares`);
    } catch (error) {
      this.logger.error('Failed to scan firmwares:', error);
    }
  }

  /**
   * 计算文件校验和
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve) => {
      try {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => {
          hash.update(data);
        });

        stream.on('end', () => {
          resolve(hash.digest('hex'));
        });

        stream.on('error', () => {
          resolve('');
        });
      } catch (error) {
        resolve('');
      }
    });
  }

  /**
   * 获取固件信息
   */
  getFirmware(hardwareVersion: string, version: string): FirmwareInfo | null {
    return this.firmwares.get(`${hardwareVersion}:${version}`) || null;
  }

  /**
   * 获取最新固件
   */
  getLatestFirmware(hardwareVersion: string): FirmwareInfo | null {
    const firmwares = Array.from(this.firmwares.values()).filter(
      (fw) => fw.hardwareVersion === hardwareVersion
    );

    if (firmwares.length === 0) {
      return null;
    }

    // 按版本号排序
    firmwares.sort((a, b) => {
      const aParts = a.version.split('.').map(Number);
      const bParts = b.version.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) {
          return bVal - aVal;
        }
      }

      return 0;
    });

    return firmwares[0];
  }

  /**
   * 获取所有固件
   */
  getAllFirmwares(): Array<FirmwareInfo> {
    return Array.from(this.firmwares.values());
  }

  /**
   * 获取设备的固件升级状态
   */
  getUpgradeState(deviceId: string): FirmwareUpgradeState | null {
    return this.upgradeStates.get(deviceId) || null;
  }

  /**
   * 开始固件升级
   */
  async startFirmwareUpgrade(deviceId: string, hardwareVersion: string): Promise<FirmwareUpgradeState> {
    try {
      const latestFirmware = this.getLatestFirmware(hardwareVersion);
      if (!latestFirmware) {
        throw new Error(`No firmware found for hardware version ${hardwareVersion}`);
      }

      const upgradeState: FirmwareUpgradeState = {
        deviceId,
        firmwareVersion: latestFirmware.version,
        status: 'initiated',
        progress: 0,
        startTime: Date.now(),
        lastUpdate: Date.now(),
      };

      this.upgradeStates.set(deviceId, upgradeState);

      // 发布固件升级开始事件
      this.eventBusService.publish(
        EventType.FIRMWARE_UPGRADE_STARTED,
        {
          deviceId,
          firmwareVersion: latestFirmware.version,
          firmwareInfo: latestFirmware,
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiFirmwareService',
        }
      );

      this.logger.log(`Started firmware upgrade for device ${deviceId} to version ${latestFirmware.version}`);
      return upgradeState;
    } catch (error) {
      this.logger.error(`Failed to start firmware upgrade for device ${deviceId}:`, error);
      const errorState: FirmwareUpgradeState = {
        deviceId,
        firmwareVersion: 'unknown',
        status: 'failed',
        progress: 0,
        error: error.message,
        startTime: Date.now(),
        lastUpdate: Date.now(),
      };
      this.upgradeStates.set(deviceId, errorState);
      return errorState;
    }
  }

  /**
   * 更新固件升级状态
   */
  updateUpgradeState(
    deviceId: string,
    status: FirmwareUpgradeState['status'],
    progress: number,
    error?: string
  ): FirmwareUpgradeState | null {
    const state = this.upgradeStates.get(deviceId);
    if (!state) {
      this.logger.warn(`No upgrade state found for device ${deviceId}`);
      return null;
    }

    state.status = status;
    state.progress = progress;
    state.error = error;
    state.lastUpdate = Date.now();

    this.upgradeStates.set(deviceId, state);

    // 发布固件升级状态更新事件
    this.eventBusService.publish(
      EventType.FIRMWARE_UPGRADE_STATUS_UPDATED,
      {
        deviceId,
        status,
        progress,
        error,
        firmwareVersion: state.firmwareVersion,
      },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiFirmwareService',
      }
    );

    // 如果升级完成或失败，清理状态
    if (status === 'completed' || status === 'failed') {
      setTimeout(() => {
        this.upgradeStates.delete(deviceId);
      }, 3600000); // 1小时后清理
    }

    this.logger.log(`Updated firmware upgrade state for device ${deviceId}: ${status}, progress: ${progress}%`);
    return state;
  }

  /**
   * 下载固件
   */
  async downloadFirmware(url: string, destination: string): Promise<boolean> {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destination);

      protocol
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            this.logger.error(`Failed to download firmware: HTTP ${response.statusCode}`);
            file.close();
            fs.unlinkSync(destination);
            resolve(false);
            return;
          }

          const totalSize = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedSize = 0;

          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const progress = Math.round((downloadedSize / totalSize) * 100);
            this.logger.debug(`Downloading firmware: ${progress}%`);
            file.write(chunk);
          });

          response.on('end', () => {
            file.close();
            this.logger.log('Firmware downloaded successfully');
            resolve(true);
          });
        })
        .on('error', (error) => {
          this.logger.error('Failed to download firmware:', error);
          file.close();
          fs.unlinkSync(destination);
          resolve(false);
        });
    });
  }

  /**
   * 上传固件
   */
  async uploadFirmware(file: Buffer, filename: string, hardwareVersion: string): Promise<FirmwareInfo> {
    try {
      const firmwareDir = path.join(this.config.firmwareDir, hardwareVersion);
      if (!fs.existsSync(firmwareDir)) {
        fs.mkdirSync(firmwareDir, { recursive: true });
      }

      const filePath = path.join(firmwareDir, filename);
      fs.writeFileSync(filePath, file);

      const stats = fs.statSync(filePath);
      const checksum = await this.calculateChecksum(filePath);

      const versionMatch = filename.match(/firmware-\w+-(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : '1.0.0';

      const firmwareInfo: FirmwareInfo = {
        version,
        filename,
        size: stats.size,
        checksum,
        releaseDate: stats.mtime.toISOString(),
        description: `Uploaded firmware version ${version}`,
        hardwareVersion,
        minProtocolVersion: '1.0.0',
        url: `http://localhost:3000/api/xiaozhi/firmware/${hardwareVersion}/${filename}`,
      };

      this.firmwares.set(`${hardwareVersion}:${version}`, firmwareInfo);
      this.logger.log(`Uploaded firmware: ${filename}, version: ${version}`);

      return firmwareInfo;
    } catch (error) {
      this.logger.error('Failed to upload firmware:', error);
      throw error;
    }
  }

  /**
   * 删除固件
   */
  deleteFirmware(hardwareVersion: string, version: string): boolean {
    try {
      const firmwareInfo = this.firmwares.get(`${hardwareVersion}:${version}`);
      if (!firmwareInfo) {
        return false;
      }

      const filePath = path.join(this.config.firmwareDir, firmwareInfo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.firmwares.delete(`${hardwareVersion}:${version}`);
      this.logger.log(`Deleted firmware: ${hardwareVersion}:${version}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete firmware:', error);
      return false;
    }
  }

  /**
   * 检查固件更新
   */
  checkForFirmwareUpdate(deviceId: string, hardwareVersion: string, currentVersion: string): FirmwareInfo | null {
    const latestFirmware = this.getLatestFirmware(hardwareVersion);
    if (!latestFirmware) {
      return null;
    }

    // 比较版本号
    if (this.compareVersions(latestFirmware.version, currentVersion) > 0) {
      return latestFirmware;
    }

    return null;
  }

  /**
   * 比较版本号
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;

      if (v1 > v2) return 1;
      if (v1 < v2) return -1;
    }

    return 0;
  }

  /**
   * 获取固件统计信息
   */
  getFirmwareStats(): {
    total: number;
    byHardware: { [key: string]: number };
    latestVersions: { [key: string]: string };
  } {
    const stats = {
      total: this.firmwares.size,
      byHardware: {} as { [key: string]: number },
      latestVersions: {} as { [key: string]: string },
    };

    const hardwareVersions = new Set<string>();
    for (const firmware of this.firmwares.values()) {
      hardwareVersions.add(firmware.hardwareVersion);
      stats.byHardware[firmware.hardwareVersion] = (stats.byHardware[firmware.hardwareVersion] || 0) + 1;
    }

    for (const hardwareVersion of hardwareVersions) {
      const latestFirmware = this.getLatestFirmware(hardwareVersion);
      if (latestFirmware) {
        stats.latestVersions[hardwareVersion] = latestFirmware.version;
      }
    }

    return stats;
  }
}
