/**
 * 微前端通信通道实现
 * 
 * 提供微前端之间的安全通信机制，支持事件的发送和接收
 */

import { MicroFrontendEvent, MicroFrontendChannel } from './types';

// 自定义事件发射器，兼容浏览器环境
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (listeners) {
      this.events.set(event, listeners.filter(l => l !== listener));
    }
  }

  once(event: string, listener: Function): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }
}

export class DefaultMicroFrontendChannel extends EventEmitter implements MicroFrontendChannel {
  private static instance: DefaultMicroFrontendChannel;
  private eventListeners = new Map<string, Set<(event: MicroFrontendEvent) => void>>();

  private constructor() {
    super();
  }

  static getInstance(): DefaultMicroFrontendChannel {
    if (!DefaultMicroFrontendChannel.instance) {
      DefaultMicroFrontendChannel.instance = new DefaultMicroFrontendChannel();
    }
    return DefaultMicroFrontendChannel.instance;
  }

  /**
   * 发送事件
   */
  send(event: MicroFrontendEvent): void {
    const timestamp = Date.now();
    const eventWithTimestamp: MicroFrontendEvent = {
      ...event,
      timestamp,
    };

    console.log(`[MicroFrontendChannel] 发送事件: ${event.type} 从 ${event.source} 到 ${event.target || '所有'}`);

    // 触发全局事件
    this.emit('event', eventWithTimestamp);

    // 触发特定类型的事件
    this.emit(event.type, eventWithTimestamp);

    // 触发目标特定的事件
    if (event.target) {
      this.emit(`${event.type}:${event.target}`, eventWithTimestamp);
    }
  }

  /**
   * 监听事件
   */
  on(type: string, handler: (event: MicroFrontendEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }

    this.eventListeners.get(type)!.add(handler);
    super.on(type, handler);
    console.log(`[MicroFrontendChannel] 注册事件监听器: ${type}`);
  }

  /**
   * 移除事件监听
   */
  off(type: string, handler: (event: MicroFrontendEvent) => void): void {
    if (this.eventListeners.has(type)) {
      this.eventListeners.get(type)!.delete(handler);
      if (this.eventListeners.get(type)!.size === 0) {
        this.eventListeners.delete(type);
      }
    }

    super.off(type, handler);
    console.log(`[MicroFrontendChannel] 移除事件监听器: ${type}`);
  }

  /**
   * 清除所有事件监听
   */
  clear(): void {
    this.eventListeners.forEach((handlers, type) => {
      handlers.forEach(handler => {
        this.off(type, handler);
      });
    });

    this.eventListeners.clear();
    this.removeAllListeners();
    console.log('[MicroFrontendChannel] 清除所有事件监听器');
  }

  /**
   * 获取事件监听器数量
   */
  getListenerCount(type?: string): number {
    if (type) {
      return this.eventListeners.get(type)?.size || 0;
    }

    return Array.from(this.eventListeners.values()).reduce((total, handlers) => total + handlers.size, 0);
  }

  /**
   * 广播事件到所有微前端
   */
  broadcast(type: string, payload: any, source: string): void {
    this.send({
      type,
      payload,
      source,
      timestamp: Date.now(),
    });
  }

  /**
   * 发送定向事件到特定微前端
   */
  sendTo(target: string, type: string, payload: any, source: string): void {
    this.send({
      type,
      payload,
      source,
      target,
      timestamp: Date.now(),
    });
  }
}

// 导出单例
export const microFrontendChannel = DefaultMicroFrontendChannel.getInstance();

export default DefaultMicroFrontendChannel;
