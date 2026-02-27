/**
 * 全局事件系统
 */

// 事件类型定义
export enum AppEvents {
  USER_LOGIN = 'user:login',
  USER_LOGOUT = 'user:logout',
  MESSAGE_RECEIVED = 'message:received',
  NOTIFICATION_RECEIVED = 'notification:received',
  SETTINGS_CHANGED = 'settings:changed',
  THEME_CHANGED = 'theme:changed',
  DATA_UPDATED = 'data:updated',
  ERROR_OCCURRED = 'error:occurred',
}

// 事件常量
export const EVENTS = AppEvents;

// 事件发射器
class EventEmitter {
  private listeners: Map<string, Set<(data?: unknown) => void>> = new Map();

  on(event: string, callback: (data?: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event: string, callback: (data?: unknown) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  once(event: string, callback: (data?: unknown) => void): () => void {
    const onceCallback = (data?: unknown) => {
      this.off(event, onceCallback);
      callback(data);
    };
    return this.on(event, onceCallback);
  }
}

export const eventEmitter = new EventEmitter();

// 兼容旧API
export const on = (event: string, callback: (data?: unknown) => void) =>
  eventEmitter.on(event, callback);
export const off = (event: string, callback: (data?: unknown) => void) =>
  eventEmitter.off(event, callback);
export const emit = (event: string, data?: unknown) =>
  eventEmitter.emit(event, data);
