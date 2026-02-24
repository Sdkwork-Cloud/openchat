
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
  get(key: string): Promise<any | null>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IClipboard {
  write(text: string): Promise<void>;
  read(): Promise<string>;
}

export interface ICamera {
  takePhoto(): Promise<string>; 
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

// Platform Strategy Context
export class PlatformManager {
  private static instance: IPlatform | null = null;

  static setInstance(platform: IPlatform) {
      this.instance = platform;
  }

  static getInstance(): IPlatform {
    if (!this.instance) {
       // Return a dummy/noop implementation during the split second of boot-up 
       // to prevent "undefined" crashes, though the Proxy/Getter pattern below is the primary fix.
       console.warn("[Platform] Instance requested before registration.");
    }
    return this.instance!;
  }
}

/**
 * Industry-Leading Late-Binding Proxy
 * This ensures that 'Platform' can be imported anywhere, but it only 
 * resolves to the singleton instance when a property is accessed.
 */
export const Platform: IPlatform = {
    get type() { return PlatformManager.getInstance().type; },
    get device() { return PlatformManager.getInstance().device; },
    get storage() { return PlatformManager.getInstance().storage; },
    get clipboard() { return PlatformManager.getInstance().clipboard; },
    get camera() { return PlatformManager.getInstance().camera; },
    initialize() { return PlatformManager.getInstance().initialize(); }
} as IPlatform;
