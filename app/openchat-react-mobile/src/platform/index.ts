
import { WebPlatform } from '../platform-impl/web';

export enum PlatformType {
  WEB = 'WEB',
  TAURI = 'TAURI',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

// Hardware Abstraction Layer (HAL) Interfaces
export interface IDevice {
  getUUID(): Promise<string>;
  getInfo(): Promise<{ model: string; os: string; version: string }>;
  vibrate(pattern: number | number[]): void;
}

export interface IStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IClipboard {
  write(text: string): Promise<void>;
  read(): Promise<string>;
}

export interface ICamera {
  takePhoto(): Promise<string>; // returns base64 or url
  scanQRCode(): Promise<string>;
}

export interface IPlatform {
  type: PlatformType;
  initialize(): Promise<void>;
  device: IDevice;
  storage: IStorage;
  clipboard: IClipboard;
  camera: ICamera;
}

// Platform Factory / Strategy Context
class PlatformManager {
  private static instance: IPlatform;

  static getInstance(): IPlatform {
    if (!this.instance) {
      // Runtime Environment Detection
      // In a real build, strictly use build flags to tree-shake unused platforms
      const isTauri = Boolean((window as any).__TAURI__);
      
      if (isTauri) {
         // this.instance = new TauriPlatform(); // Future implementation
         console.log("Tauri detected, but using Web fallback for demo");
         this.instance = new WebPlatform();
      } else {
         this.instance = new WebPlatform();
      }
    }
    return this.instance;
  }
}

export const Platform = PlatformManager.getInstance();
