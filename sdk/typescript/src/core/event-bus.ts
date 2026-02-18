/**
 * 事件总线
 * 用于组件间解耦通信
 */

import { EventEmitter } from 'eventemitter3';

export type EventMap = Record<string, any>;
export type EventKey<T extends EventMap> = string & keyof T;
export type EventReceiver<T> = (params: T) => void;

export interface Emitter<T extends EventMap> {
  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
  emit<K extends EventKey<T>>(eventName: K, params: T[K]): void;
  once<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
}

export class EventBus<T extends EventMap = any> implements Emitter<T> {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void {
    this.emitter.on(eventName as string, fn);
  }

  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void {
    this.emitter.off(eventName as string, fn);
  }

  emit<K extends EventKey<T>>(eventName: K, params: T[K]): void {
    this.emitter.emit(eventName as string, params);
  }

  once<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void {
    this.emitter.once(eventName as string, fn);
  }

  removeAllListeners(event?: string): void {
    this.emitter.removeAllListeners(event);
  }

  listenerCount(event?: string): number {
    return this.emitter.listenerCount(event as string);
  }

  eventNames(): Array<string | symbol> {
    return this.emitter.eventNames();
  }
}

export const globalEventBus = new EventBus();
