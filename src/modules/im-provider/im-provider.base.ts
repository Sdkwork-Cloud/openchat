import { IMProvider, IMProviderConfig, IMMessage, IMUser, IMGroup, IMConnectionStatus, IMProviderFactory, IMProviderPlugin, IMProviderPluginManager } from './im-provider.interface';

// IMProvider抽象基类
export abstract class IMProviderBase implements IMProvider {
  protected config: IMProviderConfig | null = null;
  protected isInitialized: boolean = false;
  protected messageCallbacks: ((message: IMMessage) => void)[] = [];
  protected connectionStatusCallbacks: ((status: IMConnectionStatus) => void)[] = [];
  protected userStatusCallbacks: ((userId: string, status: 'online' | 'offline') => void)[] = [];

  // 获取Provider名称
  abstract getProviderName(): string;

  // 初始化Provider
  async initialize(config: IMProviderConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
  }

  // 发送消息
  abstract sendMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage>;

  // 发送群消息
  abstract sendGroupMessage(message: Omit<IMMessage, 'id' | 'timestamp' | 'status'>): Promise<IMMessage>;

  // 获取消息历史
  abstract getMessageHistory(conversationId: string, limit: number, before?: number): Promise<IMMessage[]>;

  // 获取群消息历史
  abstract getGroupMessageHistory(groupId: string, limit: number, before?: number): Promise<IMMessage[]>;

  // 标记消息已读
  abstract markMessageAsRead(messageId: string): Promise<boolean>;

  // 标记所有消息已读
  abstract markAllMessagesAsRead(conversationId: string): Promise<boolean>;

  // 创建用户
  abstract createUser(user: Omit<IMUser, 'id'>): Promise<IMUser>;

  // 获取用户信息
  abstract getUserInfo(userId: string): Promise<IMUser | null>;

  // 更新用户信息
  abstract updateUserInfo(userId: string, user: Partial<IMUser>): Promise<IMUser | null>;

  // 创建群组
  abstract createGroup(group: Omit<IMGroup, 'id' | 'createdAt'>): Promise<IMGroup>;

  // 获取群组信息
  abstract getGroupInfo(groupId: string): Promise<IMGroup | null>;

  // 更新群组信息
  abstract updateGroupInfo(groupId: string, group: Partial<IMGroup>): Promise<IMGroup | null>;

  // 添加群成员
  abstract addGroupMember(groupId: string, userId: string): Promise<boolean>;

  // 移除群成员
  abstract removeGroupMember(groupId: string, userId: string): Promise<boolean>;

  // 加入群组
  abstract joinGroup(groupId: string, userId: string): Promise<boolean>;

  // 离开群组
  abstract leaveGroup(groupId: string, userId: string): Promise<boolean>;

  // 建立连接
  abstract connect(userId: string, token?: string): Promise<IMConnectionStatus>;

  // 断开连接
  abstract disconnect(): Promise<boolean>;

  // 订阅消息
  subscribeToMessages(callback: (message: IMMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  // 订阅连接状态
  subscribeToConnectionStatus(callback: (status: IMConnectionStatus) => void): void {
    this.connectionStatusCallbacks.push(callback);
  }

  // 订阅用户状态
  subscribeToUserStatus(callback: (userId: string, status: 'online' | 'offline') => void): void {
    this.userStatusCallbacks.push(callback);
  }

  // 生成认证令牌
  abstract generateToken(userId: string, expiresIn?: number): Promise<string>;

  // 验证令牌
  abstract validateToken(token: string): Promise<{ userId: string; valid: boolean }>;

  // 健康检查
  abstract healthCheck(): Promise<boolean>;

  // 触发消息回调
  protected triggerMessageCallbacks(message: IMMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  // 触发连接状态回调
  protected triggerConnectionStatusCallbacks(status: IMConnectionStatus): void {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  // 触发用户状态回调
  protected triggerUserStatusCallbacks(userId: string, status: 'online' | 'offline'): void {
    this.userStatusCallbacks.forEach(callback => {
      try {
        callback(userId, status);
      } catch (error) {
        console.error('Error in user status callback:', error);
      }
    });
  }

  // 验证是否已初始化
  protected validateInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error('IM Provider not initialized');
    }
  }

  // 获取配置值
  protected getConfig(key: string, defaultValue?: any): any {
    if (!this.config) {
      return defaultValue;
    }
    return this.config[key] || defaultValue;
  }
}

// IMProvider工厂类
export class IMProviderFactoryImpl implements IMProviderFactory {
  private providers: Map<string, new () => IMProvider> = new Map();

  // 注册Provider
  registerProvider(provider: string, providerClass: new () => IMProvider): void {
    this.providers.set(provider, providerClass);
  }

  // 创建Provider实例
  createProvider(provider: string): IMProvider {
    const providerClass = this.providers.get(provider);
    if (!providerClass) {
      throw new Error(`IM Provider ${provider} not registered`);
    }
    return new providerClass();
  }

  // 获取所有支持的Provider
  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// IMProvider插件管理器
export class IMProviderPluginManagerImpl implements IMProviderPluginManager {
  private plugins: IMProviderPlugin[] = [];

  // 注册插件
  registerPlugin(plugin: IMProviderPlugin): void {
    this.plugins.push(plugin);
    // 按优先级排序，优先级高的先执行
    this.plugins.sort((a, b) => b.getPriority() - a.getPriority());
  }

  // 初始化所有插件
  async initializePlugins(provider: IMProvider): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        await plugin.initialize(provider);
        console.log(`IM Provider plugin initialized: ${plugin.getName()}`);
      } catch (error) {
        console.error(`Error initializing plugin ${plugin.getName()}:`, error);
      }
    }
  }

  // 销毁所有插件
  async destroyPlugins(): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        await plugin.destroy();
        console.log(`IM Provider plugin destroyed: ${plugin.getName()}`);
      } catch (error) {
        console.error(`Error destroying plugin ${plugin.getName()}:`, error);
      }
    }
  }

  // 获取所有插件
  getPlugins(): IMProviderPlugin[] {
    return this.plugins;
  }
}

// 导出默认实例
export const imProviderFactory = new IMProviderFactoryImpl();
export const imProviderPluginManager = new IMProviderPluginManagerImpl();
