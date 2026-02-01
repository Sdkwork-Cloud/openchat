/**
 * Platform 抽象层 - 系统能力唯一入口
 * 
 * 架构原则：
 * 1. Platform 是系统能力唯一入口
 * 2. 业务层永远不感知 Tauri / Rust
 * 3. 所有系统能力必须 Platform 化
 * 
 * 调用路径：
 * UI / Module / Service → Platform API → Platform Impl (web/desktop) → Tauri Command/Event → Rust
 */

/**
 * Platform API 接口定义
 * 
 * 所有系统能力的抽象定义，业务层只依赖此接口
 */
export interface PlatformAPI {
  // ==================== 平台信息 ====================
  
  /**
   * 获取当前平台类型
   */
  getPlatform(): 'web' | 'desktop';
  
  /**
   * 获取设备唯一标识
   */
  getDeviceId(): Promise<string>;
  
  // ==================== 存储 ====================
  
  /**
   * 设置本地存储
   */
  setStorage(key: string, value: string): Promise<void>;
  
  /**
   * 获取本地存储
   */
  getStorage(key: string): Promise<string | null>;
  
  /**
   * 删除本地存储
   */
  removeStorage(key: string): Promise<void>;
  
  // ==================== 剪贴板 ====================
  
  /**
   * 复制文本到剪贴板
   */
  copy(text: string): Promise<void>;
  
  /**
   * 从剪贴板读取文本
   */
  readClipboard(): Promise<string>;
  
  // ==================== 外部链接 ====================
  
  /**
   * 在外部浏览器打开链接
   */
  openExternal(url: string): Promise<void>;
  
  // ==================== 文件系统 ====================
  
  /**
   * 选择文件
   */
  selectFile(options?: { multiple?: boolean; filters?: FileFilter[] }): Promise<string[]>;
  
  /**
   * 保存文件
   */
  saveFile(data: Blob, filename: string): Promise<void>;
  
  /**
   * 读取文件
   */
  readFile(path: string): Promise<string>;
  
  /**
   * 写入文件
   */
  writeFile(path: string, content: string): Promise<void>;
  
  // ==================== 窗口控制 ====================
  
  /**
   * 最小化窗口
   */
  minimizeWindow(): Promise<void>;
  
  /**
   * 最大化窗口
   */
  maximizeWindow(): Promise<void>;
  
  /**
   * 关闭窗口
   */
  closeWindow(): Promise<void>;
  
  /**
   * 设置窗口全屏
   */
  setFullscreen(fullscreen: boolean): Promise<void>;
  
  // ==================== 终端 ====================
  
  /**
   * 创建 PTY 会话
   */
  createPty(id: string, shell?: string): Promise<void>;
  
  /**
   * 写入 PTY
   */
  writePty(id: string, data: string): Promise<void>;
  
  /**
   * 调整 PTY 大小
   */
  resizePty(id: string, cols: number, rows: number): Promise<void>;
  
  /**
   * 销毁 PTY
   */
  destroyPty(id: string): Promise<void>;
  
  /**
   * 监听 PTY 数据
   */
  onPtyData(id: string, callback: (data: string) => void): () => void;
  
  // ==================== 通知 ====================
  
  /**
   * 显示系统通知
   */
  showNotification(options: { title: string; body: string; icon?: string }): Promise<void>;
  
  // ==================== 网络 ====================
  
  /**
   * 检查网络状态
   */
  isOnline(): boolean;
  
  /**
   * 监听网络变化
   */
  onNetworkChange(callback: (online: boolean) => void): () => void;
}

/**
 * 文件过滤器
 */
export interface FileFilter {
  name: string;
  extensions: string[];
}

// ==================== Platform 实例管理 ====================

let platformInstance: PlatformAPI | null = null;

/**
 * 初始化 Platform
 * 在应用启动时调用
 */
export function initializePlatform(instance: PlatformAPI): void {
  platformInstance = instance;
}

/**
 * 获取 Platform 实例
 * 业务层通过此函数获取 Platform API
 */
export function getPlatform(): PlatformAPI {
  if (!platformInstance) {
    throw new Error('Platform not initialized. Call initializePlatform() first.');
  }
  return platformInstance;
}

/**
 * 检查是否在 Desktop 环境
 */
export function isDesktop(): boolean {
  return getPlatform().getPlatform() === 'desktop';
}

/**
 * 检查是否在 Web 环境
 */
export function isWeb(): boolean {
  return getPlatform().getPlatform() === 'web';
}

export default getPlatform;
