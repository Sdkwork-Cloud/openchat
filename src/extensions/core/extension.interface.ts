/**
 * 扩展插件体系 - 核心接口定义
 *
 * 职责：
 * 1. 定义插件基础接口
 * 2. 定义插件生命周期
 * 3. 定义插件能力声明
 * 4. 定义插件配置规范
 */

/**
 * 插件类型枚举
 */
export enum ExtensionType {
  /** 用户中心插件 - 提供用户认证和管理能力 */
  USER_CENTER = 'user-center',
  /** 认证策略插件 - 提供额外的认证方式 */
  AUTH_STRATEGY = 'auth-strategy',
  /** 存储插件 - 提供文件存储能力 */
  STORAGE = 'storage',
  /** 通知插件 - 提供消息通知能力 */
  NOTIFICATION = 'notification',
  /** AI 模型插件 - 提供 AI 模型调用能力 */
  AI_MODEL = 'ai-model',
  /** IM 渠道插件 - 提供 IM 消息渠道能力 */
  IM_CHANNEL = 'im-channel',
  /** 自定义插件 */
  CUSTOM = 'custom',
}

/**
 * 插件状态
 */
export enum ExtensionStatus {
  /** 未加载 */
  UNLOADED = 'unloaded',
  /** 加载中 */
  LOADING = 'loading',
  /** 已加载，未激活 */
  LOADED = 'loaded',
  /** 激活中 */
  ACTIVATING = 'activating',
  /** 已激活，正常运行 */
  ACTIVE = 'active',
  /** 停用中 */
  DEACTIVATING = 'deactivating',
  /** 已停用 */
  INACTIVE = 'inactive',
  /** 错误状态 */
  ERROR = 'error',
}

/**
 * 插件优先级
 */
export enum ExtensionPriority {
  /** 最高优先级 */
  HIGHEST = 0,
  /** 高优先级 */
  HIGH = 25,
  /** 普通优先级 */
  NORMAL = 50,
  /** 低优先级 */
  LOW = 75,
  /** 最低优先级 */
  LOWEST = 100,
}

/**
 * 插件元信息
 */
export interface ExtensionMeta {
  /** 插件唯一标识 */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 (语义化版本) */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 插件作者 */
  author?: string;
  /** 插件主页 */
  homepage?: string;
  /** 插件许可证 */
  license?: string;
  /** 插件图标 */
  icon?: string;
  /** 插件标签 */
  tags?: string[];
  /** 兼容的应用版本范围 */
  compatibleVersions?: string;
  /** 依赖的其他插件 */
  dependencies?: ExtensionDependency[];
  /** 可选依赖 */
  optionalDependencies?: string[];
}

/**
 * 插件依赖声明
 */
export interface ExtensionDependency {
  /** 依赖插件ID */
  extensionId: string;
  /** 版本范围要求 */
  versionRange?: string;
  /** 是否必须 */
  required?: boolean;
}

/**
 * 插件能力声明
 */
export interface ExtensionCapabilities {
  /** 提供的能力列表 */
  provides?: string[];
  /** 扩展的能力列表 */
  extends?: string[];
  /** 需要的能力列表 */
  requires?: string[];
  /** 支持的配置项 */
  configSchema?: Record<string, ConfigFieldSchema>;
}

/**
 * 配置字段 Schema
 */
export interface ConfigFieldSchema {
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  default?: any;
  /** 字段描述 */
  description?: string;
  /** 枚举值 */
  enum?: any[];
  /** 最小值 (number) */
  minimum?: number;
  /** 最大值 (number) */
  maximum?: number;
  /** 最小长度 (string/array) */
  minLength?: number;
  /** 最大长度 (string/array) */
  maxLength?: number;
  /** 正则模式 (string) */
  pattern?: string;
}

/**
 * 插件配置
 */
export interface ExtensionConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 优先级 */
  priority?: ExtensionPriority;
  /** 自定义配置 */
  settings?: Record<string, any>;
}

/**
 * 插件上下文
 * 提供插件运行时所需的依赖和服务
 */
export interface ExtensionContext {
  /** 插件配置 */
  config: ExtensionConfig;
  /** 日志服务 */
  logger: ExtensionLogger;
  /** 获取其他插件 */
  getExtension: (id: string) => IExtension | null;
  /** 获取所有指定类型的插件 */
  getExtensionsByType: (type: ExtensionType) => IExtension[];
  /** 发送事件 */
  emit: (event: string, ...args: any[]) => void;
  /** 监听事件 */
  on: (event: string, listener: (...args: any[]) => void) => void;
  /** 取消监听 */
  off: (event: string, listener: (...args: any[]) => void) => void;
  /** 应用配置 */
  appConfig?: Record<string, any>;
}

/**
 * 插件日志接口
 */
export interface ExtensionLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * 插件生命周期钩子
 */
export interface ExtensionLifecycle {
  /**
   * 安装钩子
   * 在插件首次安装时调用，用于初始化数据等
   */
  install?(context: ExtensionContext): Promise<void>;

  /**
   * 卸载钩子
   * 在插件卸载时调用，用于清理数据等
   */
  uninstall?(context: ExtensionContext): Promise<void>;

  /**
   * 加载钩子
   * 在插件加载时调用，用于初始化资源
   */
  onLoad?(context: ExtensionContext): Promise<void>;

  /**
   * 卸载钩子
   * 在插件卸载前调用，用于释放资源
   */
  onUnload?(context: ExtensionContext): Promise<void>;

  /**
   * 激活钩子
   * 在插件激活时调用，用于启动服务
   */
  onActivate?(context: ExtensionContext): Promise<void>;

  /**
   * 停用钩子
   * 在插件停用时调用，用于停止服务
   */
  onDeactivate?(context: ExtensionContext): Promise<void>;

  /**
   * 配置变更钩子
   * 在插件配置变更时调用
   */
  onConfigChange?(oldConfig: ExtensionConfig, newConfig: ExtensionConfig): Promise<void>;
}

/**
 * 插件健康检查结果
 */
export interface ExtensionHealthCheck {
  /** 是否健康 */
  healthy: boolean;
  /** 状态消息 */
  message?: string;
  /** 详细信息 */
  details?: Record<string, any>;
  /** 检查时间 */
  timestamp: Date;
}

/**
 * 插件基础接口
 */
export interface IExtension extends ExtensionLifecycle {
  /** 插件元信息 */
  readonly meta: ExtensionMeta;

  /** 插件类型 */
  readonly type: ExtensionType;

  /** 插件状态 */
  readonly status: ExtensionStatus;

  /** 插件能力声明 */
  readonly capabilities?: ExtensionCapabilities;

  /**
   * 健康检查
   */
  healthCheck?(): Promise<ExtensionHealthCheck>;

  /**
   * 获取插件配置
   */
  getConfig(): ExtensionConfig;

  /**
   * 更新插件配置
   */
  updateConfig(config: Partial<ExtensionConfig>): Promise<void>;
}

/**
 * 插件工厂函数类型
 */
export type ExtensionFactory<T extends IExtension = IExtension> = (
  context: ExtensionContext,
) => T | Promise<T>;

/**
 * 插件注册信息
 */
export interface ExtensionRegistration {
  /** 插件实例 */
  extension: IExtension;
  /** 插件上下文 */
  context: ExtensionContext;
  /** 注册时间 */
  registeredAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * 插件事件
 */
export enum ExtensionEvent {
  /** 插件加载前 */
  BEFORE_LOAD = 'extension:before-load',
  /** 插件加载后 */
  AFTER_LOAD = 'extension:after-load',
  /** 插件激活前 */
  BEFORE_ACTIVATE = 'extension:before-activate',
  /** 插件激活后 */
  AFTER_ACTIVATE = 'extension:after-activate',
  /** 插件停用前 */
  BEFORE_DEACTIVATE = 'extension:before-deactivate',
  /** 插件停用后 */
  AFTER_DEACTIVATE = 'extension:after-deactivate',
  /** 插件卸载前 */
  BEFORE_UNLOAD = 'extension:before-unload',
  /** 插件卸载后 */
  AFTER_UNLOAD = 'extension:after-unload',
  /** 插件配置变更 */
  CONFIG_CHANGED = 'extension:config-changed',
  /** 插件错误 */
  ERROR = 'extension:error',
}

/**
 * 插件错误
 */
export class ExtensionError extends Error {
  constructor(
    public readonly extensionId: string,
    public readonly code: string,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

/**
 * 插件未找到错误
 */
export class ExtensionNotFoundError extends ExtensionError {
  constructor(extensionId: string) {
    super(extensionId, 'EXTENSION_NOT_FOUND', `Extension '${extensionId}' not found`);
    this.name = 'ExtensionNotFoundError';
  }
}

/**
 * 插件依赖错误
 */
export class ExtensionDependencyError extends ExtensionError {
  constructor(
    extensionId: string,
    public readonly missingDependency: string,
  ) {
    super(
      extensionId,
      'DEPENDENCY_MISSING',
      `Extension '${extensionId}' is missing required dependency '${missingDependency}'`,
    );
    this.name = 'ExtensionDependencyError';
  }
}

/**
 * 插件版本不兼容错误
 */
export class ExtensionVersionError extends ExtensionError {
  constructor(
    extensionId: string,
    public readonly requiredVersion: string,
    public readonly actualVersion: string,
  ) {
    super(
      extensionId,
      'VERSION_INCOMPATIBLE',
      `Extension '${extensionId}' requires version ${requiredVersion} but found ${actualVersion}`,
    );
    this.name = 'ExtensionVersionError';
  }
}
