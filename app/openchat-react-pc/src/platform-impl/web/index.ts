/**
 * Web Platform 实现
 * 
 * 基于浏览器 API 的 Platform 实现
 * 用于 Web 环境
 */

import type { PlatformAPI, FileFilter } from '../../platform';

/**
 * 生成设备ID
 */
function generateDeviceId(): string {
  return 'web_' + Math.random().toString(36).substring(2, 15);
}

/**
 * 创建 Web Platform 实现
 */
export function createWebPlatform(): PlatformAPI {
  // 设备ID缓存
  let deviceId: string | null = null;

  return {
    // ==================== 平台信息 ====================
    
    getPlatform(): 'web' | 'desktop' {
      return 'web';
    },
    
    async getDeviceId(): Promise<string> {
      if (!deviceId) {
        deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
          deviceId = generateDeviceId();
          localStorage.setItem('device_id', deviceId);
        }
      }
      return deviceId;
    },
    
    // ==================== 存储 ====================
    
    async setStorage(key: string, value: string): Promise<void> {
      localStorage.setItem(key, value);
    },
    
    async getStorage(key: string): Promise<string | null> {
      return localStorage.getItem(key);
    },
    
    async removeStorage(key: string): Promise<void> {
      localStorage.removeItem(key);
    },
    
    // ==================== 剪贴板 ====================
    
    async copy(text: string): Promise<void> {
      await navigator.clipboard.writeText(text);
    },
    
    async readClipboard(): Promise<string> {
      return await navigator.clipboard.readText();
    },
    
    // ==================== 外部链接 ====================
    
    async openExternal(url: string): Promise<void> {
      window.open(url, '_blank');
    },
    
    // ==================== 文件系统 ====================
    
    async selectFile(options?: { multiple?: boolean; filters?: FileFilter[] }): Promise<string[]> {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options?.multiple ?? false;
        
        if (options?.filters) {
          const accept = options.filters
            .flatMap(f => f.extensions.map(e => `.${e}`))
            .join(',');
          input.accept = accept;
        }
        
        input.onchange = () => {
          const files = Array.from(input.files || []);
          const paths = files.map(f => f.name);
          resolve(paths);
        };
        
        input.click();
      });
    },
    
    async saveFile(data: Blob, filename: string): Promise<void> {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    
    async readFile(_path: string): Promise<string> {
      throw new Error('Web platform does not support readFile. Use selectFile instead.');
    },
    
    async writeFile(_path: string, _content: string): Promise<void> {
      throw new Error('Web platform does not support writeFile. Use saveFile instead.');
    },
    
    // ==================== 窗口控制 ====================
    
    async minimizeWindow(): Promise<void> {
      console.warn('Web platform does not support window controls');
    },
    
    async maximizeWindow(): Promise<void> {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    },
    
    async closeWindow(): Promise<void> {
      window.close();
    },
    
    async setFullscreen(fullscreen: boolean): Promise<void> {
      if (fullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    },
    
    // ==================== 终端 ====================
    
    async createPty(_id: string, _shell?: string): Promise<void> {
      console.warn('Web platform does not support PTY');
    },
    
    async writePty(_id: string, _data: string): Promise<void> {
      console.warn('Web platform does not support PTY');
    },
    
    async resizePty(_id: string, _cols: number, _rows: number): Promise<void> {
      console.warn('Web platform does not support PTY');
    },
    
    async destroyPty(_id: string): Promise<void> {
      console.warn('Web platform does not support PTY');
    },
    
    onPtyData(_id: string, _callback: (data: string) => void): () => void {
      console.warn('Web platform does not support PTY');
      return () => {};
    },
    
    // ==================== 通知 ====================
    
    async showNotification(options: { title: string; body: string; icon?: string }): Promise<void> {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: options.icon,
          });
        }
      }
    },
    
    // ==================== 网络 ====================
    
    isOnline(): boolean {
      return navigator.onLine;
    },
    
    onNetworkChange(callback: (online: boolean) => void): () => void {
      const handleOnline = () => callback(true);
      const handleOffline = () => callback(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    },
  };
}

export default createWebPlatform;
