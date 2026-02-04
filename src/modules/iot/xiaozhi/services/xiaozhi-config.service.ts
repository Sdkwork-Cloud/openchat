/**
 * 小智配置中心服务
 * 负责配置的管理、更新和服务发现
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService, EventType, EventPriority } from '../../../../common/events/event-bus.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 配置项接口
 */
interface ConfigItem {
  key: string;
  value: any;
  type: string;
  description: string;
  defaultValue: any;
  readonly: boolean;
}

/**
 * 服务信息接口
 */
interface ServiceInfo {
  serviceId: string;
  serviceName: string;
  host: string;
  port: number;
  healthCheckUrl: string;
  status: 'up' | 'down' | 'starting';
  lastHeartbeat: number;
  metadata: any;
}

/**
 * 配置存储接口
 */
interface ConfigStore {
  [key: string]: any;
}

@Injectable()
export class XiaoZhiConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XiaoZhiConfigService.name);
  private readonly configStore: ConfigStore = {};
  private readonly configItems = new Map<string, ConfigItem>();
  private readonly services = new Map<string, ServiceInfo>();
  private readonly configFile: string;
  private configWatchInterval: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private eventBusService: EventBusService
  ) {
    this.configFile = this.configService.get<string>('XIAOZHI_CONFIG_FILE') || path.join(__dirname, '..', 'config', 'xiaozhi.config.json');
  }

  async onModuleInit() {
    this.logger.log('Config service initialized');
    await this.loadConfig();
    await this.initializeDefaultConfig();
    this.startConfigWatch();
  }

  async onModuleDestroy() {
    this.logger.log('Config service destroying');
    this.stopConfigWatch();
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    try {
      // 确保配置目录存在
      const configDir = path.dirname(this.configFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        this.logger.log(`Created config directory: ${configDir}`);
      }

      // 读取配置文件
      if (fs.existsSync(this.configFile)) {
        const configContent = fs.readFileSync(this.configFile, 'utf8');
        const config = JSON.parse(configContent);
        Object.assign(this.configStore, config);
        this.logger.log(`Loaded config from file: ${this.configFile}`);
      } else {
        // 创建默认配置文件
        await this.saveConfig();
        this.logger.log(`Created default config file: ${this.configFile}`);
      }
    } catch (error) {
      this.logger.error('Failed to load config:', error);
    }
  }

  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.configStore, null, 2));
      this.logger.debug(`Saved config to file: ${this.configFile}`);
    } catch (error) {
      this.logger.error('Failed to save config:', error);
    }
  }

  /**
   * 初始化默认配置
   */
  private async initializeDefaultConfig(): Promise<void> {
    // 默认配置项
    const defaultConfigItems: ConfigItem[] = [
      {
        key: 'server.host',
        value: this.configService.get<string>('XIAOZHI_SERVER_HOST') || '0.0.0.0',
        type: 'string',
        description: 'Server host address',
        defaultValue: '0.0.0.0',
        readonly: false,
      },
      {
        key: 'server.websocketPort',
        value: this.configService.get<number>('XIAOZHI_WEBSOCKET_PORT') || 8084,
        type: 'number',
        description: 'WebSocket port',
        defaultValue: 8084,
        readonly: false,
      },
      {
        key: 'server.mqttPort',
        value: this.configService.get<number>('XIAOZHI_MQTT_PORT') || 1883,
        type: 'number',
        description: 'MQTT port',
        defaultValue: 1883,
        readonly: false,
      },
      {
        key: 'server.udpPort',
        value: this.configService.get<number>('XIAOZHI_UDP_PORT') || 8888,
        type: 'number',
        description: 'UDP port for audio',
        defaultValue: 8888,
        readonly: false,
      },
      {
        key: 'connection.maxConnections',
        value: 1000,
        type: 'number',
        description: 'Maximum number of connections',
        defaultValue: 1000,
        readonly: false,
      },
      {
        key: 'connection.maxIdleTime',
        value: 300000,
        type: 'number',
        description: 'Maximum idle time for connections (ms)',
        defaultValue: 300000,
        readonly: false,
      },
      {
        key: 'audio.format',
        value: 'opus',
        type: 'string',
        description: 'Audio format',
        defaultValue: 'opus',
        readonly: false,
      },
      {
        key: 'audio.sampleRate',
        value: 24000,
        type: 'number',
        description: 'Audio sample rate',
        defaultValue: 24000,
        readonly: false,
      },
      {
        key: 'security.jwtSecret',
        value: this.configService.get<string>('XIAOZHI_JWT_SECRET') || 'xiaozhi-secret-key',
        type: 'string',
        description: 'JWT secret key',
        defaultValue: 'xiaozhi-secret-key',
        readonly: true,
      },
      {
        key: 'security.jwtExpiry',
        value: 3600,
        type: 'number',
        description: 'JWT expiry time (seconds)',
        defaultValue: 3600,
        readonly: false,
      },
      {
        key: 'plugin.enabled',
        value: true,
        type: 'boolean',
        description: 'Enable plugin system',
        defaultValue: true,
        readonly: false,
      },
      {
        key: 'plugin.dir',
        value: path.join(__dirname, '..', 'plugins'),
        type: 'string',
        description: 'Plugin directory',
        defaultValue: path.join(__dirname, '..', 'plugins'),
        readonly: false,
      },
    ];

    // 添加默认配置项
    for (const item of defaultConfigItems) {
      this.addConfigItem(item);
    }
  }

  /**
   * 启动配置文件监控
   */
  private startConfigWatch(): void {
    this.configWatchInterval = setInterval(() => {
      this.checkConfigChanges();
    }, 5000); // 每5秒检查一次
    this.logger.log('Started config file watcher');
  }

  /**
   * 停止配置文件监控
   */
  private stopConfigWatch(): void {
    if (this.configWatchInterval) {
      clearInterval(this.configWatchInterval);
    }
    this.logger.log('Stopped config file watcher');
  }

  /**
   * 检查配置文件变化
   */
  private checkConfigChanges(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        const configContent = fs.readFileSync(this.configFile, 'utf8');
        const config = JSON.parse(configContent);

        // 检查是否有变化
        if (JSON.stringify(config) !== JSON.stringify(this.configStore)) {
          Object.assign(this.configStore, config);
          this.logger.log('Config file changed, reloaded config');
          
          // 发布配置变化事件
          this.eventBusService.publish(
            EventType.CONFIG_CHANGED,
            {
              timestamp: Date.now(),
              changes: config,
            },
            {
              priority: EventPriority.MEDIUM,
              source: 'XiaoZhiConfigService',
            }
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to check config changes:', error);
    }
  }

  /**
   * 添加配置项
   */
  addConfigItem(item: ConfigItem): boolean {
    if (this.configItems.has(item.key)) {
      this.logger.warn(`Config item ${item.key} already exists`);
      return false;
    }

    this.configItems.set(item.key, item);
    this.setConfig(item.key, item.value);
    this.logger.log(`Added config item: ${item.key}`);
    return true;
  }

  /**
   * 获取配置
   */
  getConfig(key: string, defaultValue?: any): any {
    // 从配置存储中获取
    const value = this.getNestedValue(this.configStore, key);
    if (value !== undefined) {
      return value;
    }

    // 从配置项中获取默认值
    const configItem = this.configItems.get(key);
    if (configItem) {
      return configItem.defaultValue;
    }

    // 返回用户提供的默认值
    return defaultValue;
  }

  /**
   * 设置配置
   */
  setConfig(key: string, value: any): boolean {
    // 检查配置项是否存在且只读
    const configItem = this.configItems.get(key);
    if (configItem && configItem.readonly) {
      this.logger.warn(`Cannot modify readonly config item: ${key}`);
      return false;
    }

    // 设置嵌套值
    this.setNestedValue(this.configStore, key, value);
    
    // 保存配置
    this.saveConfig();
    
    // 发布配置更新事件
    this.eventBusService.publish(
      EventType.CONFIG_UPDATED,
      {
        key,
        value,
        timestamp: Date.now(),
      },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiConfigService',
      }
    );

    this.logger.log(`Updated config: ${key} = ${value}`);
    return true;
  }

  /**
   * 删除配置
   */
  deleteConfig(key: string): boolean {
    // 检查配置项是否存在且只读
    const configItem = this.configItems.get(key);
    if (configItem && configItem.readonly) {
      this.logger.warn(`Cannot delete readonly config item: ${key}`);
      return false;
    }

    // 删除嵌套值
    this.deleteNestedValue(this.configStore, key);
    
    // 保存配置
    this.saveConfig();
    
    // 发布配置删除事件
    this.eventBusService.publish(
      EventType.CONFIG_DELETED,
      {
        key,
        timestamp: Date.now(),
      },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiConfigService',
      }
    );

    this.logger.log(`Deleted config: ${key}`);
    return true;
  }

  /**
   * 获取所有配置项
   */
  getAllConfigItems(): Array<ConfigItem> {
    return Array.from(this.configItems.values());
  }

  /**
   * 获取配置项
   */
  getConfigItem(key: string): ConfigItem | null {
    return this.configItems.get(key) || null;
  }

  /**
   * 注册服务
   */
  registerService(serviceInfo: ServiceInfo): boolean {
    if (this.services.has(serviceInfo.serviceId)) {
      this.logger.warn(`Service ${serviceInfo.serviceId} already registered`);
      return false;
    }

    serviceInfo.lastHeartbeat = Date.now();
    this.services.set(serviceInfo.serviceId, serviceInfo);
    this.logger.log(`Registered service: ${serviceInfo.serviceName} (${serviceInfo.serviceId})`);

    // 发布服务注册事件
    this.eventBusService.publish(
      EventType.SERVICE_REGISTERED,
      serviceInfo,
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiConfigService',
      }
    );

    return true;
  }

  /**
   * 注销服务
   */
  unregisterService(serviceId: string): boolean {
    const serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      this.logger.warn(`Service ${serviceId} not found`);
      return false;
    }

    this.services.delete(serviceId);
    this.logger.log(`Unregistered service: ${serviceId}`);

    // 发布服务注销事件
    this.eventBusService.publish(
      EventType.SERVICE_UNREGISTERED,
      { serviceId },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiConfigService',
      }
    );

    return true;
  }

  /**
   * 更新服务状态
   */
  updateServiceStatus(serviceId: string, status: 'up' | 'down' | 'starting'): boolean {
    const serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      this.logger.warn(`Service ${serviceId} not found`);
      return false;
    }

    serviceInfo.status = status;
    serviceInfo.lastHeartbeat = Date.now();
    this.services.set(serviceId, serviceInfo);
    this.logger.log(`Updated service status: ${serviceId} = ${status}`);

    // 发布服务状态更新事件
    this.eventBusService.publish(
      EventType.SERVICE_STATUS_UPDATED,
      { serviceId, status },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiConfigService',
      }
    );

    return true;
  }

  /**
   * 发送服务心跳
   */
  sendServiceHeartbeat(serviceId: string): boolean {
    const serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      this.logger.warn(`Service ${serviceId} not found`);
      return false;
    }

    serviceInfo.lastHeartbeat = Date.now();
    serviceInfo.status = 'up';
    this.services.set(serviceId, serviceInfo);
    this.logger.debug(`Received heartbeat from service: ${serviceId}`);
    return true;
  }

  /**
   * 获取服务信息
   */
  getService(serviceId: string): ServiceInfo | null {
    return this.services.get(serviceId) || null;
  }

  /**
   * 获取所有服务
   */
  getAllServices(): Array<ServiceInfo> {
    return Array.from(this.services.values());
  }

  /**
   * 发现服务
   */
  discoverServices(serviceName?: string): Array<ServiceInfo> {
    let services = Array.from(this.services.values());

    if (serviceName) {
      services = services.filter(service => service.serviceName === serviceName);
    }

    // 过滤掉状态为down的服务
    services = services.filter(service => service.status === 'up');

    return services;
  }

  /**
   * 清理过期服务
   */
  cleanupExpiredServices(): number {
    const now = Date.now();
    const expiredServices: string[] = [];

    for (const [serviceId, serviceInfo] of this.services.entries()) {
      // 超过30秒没有心跳的服务视为过期
      if (now - serviceInfo.lastHeartbeat > 30000) {
        expiredServices.push(serviceId);
      }
    }

    for (const serviceId of expiredServices) {
      this.unregisterService(serviceId);
    }

    if (expiredServices.length > 0) {
      this.logger.log(`Cleaned up ${expiredServices.length} expired services`);
    }

    return expiredServices.length;
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats(): {
    total: number;
    up: number;
    down: number;
    starting: number;
    services: string[];
  } {
    const services = Array.from(this.services.values());
    const up = services.filter(s => s.status === 'up').length;
    const down = services.filter(s => s.status === 'down').length;
    const starting = services.filter(s => s.status === 'starting').length;

    return {
      total: services.length,
      up,
      down,
      starting,
      services: services.map(s => s.serviceName),
    };
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, key: string): any {
    const keys = key.split('.');
    let value = obj;

    for (const k of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[k];
    }

    return value;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 删除嵌套值
   */
  private deleteNestedValue(obj: any, key: string): void {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) {
        return;
      }
      current = current[k];
    }

    delete current[keys[keys.length - 1]];
  }
}
