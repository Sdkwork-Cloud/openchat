
import { IPlatform, PlatformType, IDevice, IStorage, IClipboard, ICamera } from '../../platform';

export class WebPlatform implements IPlatform {
  type = PlatformType.WEB;

  async initialize(): Promise<void> {
    console.log('[System] Web Platform Initialized');
  }

  device: IDevice = {
    async getUUID(): Promise<string> {
      let uuid = localStorage.getItem('sys_device_uuid');
      if (!uuid) {
        uuid = crypto.randomUUID();
        localStorage.setItem('sys_device_uuid', uuid);
      }
      return uuid;
    },
    async getInfo(): Promise<any> {
      return {
        model: 'Browser',
        os: navigator.userAgent,
        version: '1.0.0',
      };
    },
    vibrate(pattern: number | number[]): void {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    }
  };

  storage: IStorage = {
    async get(key: string): Promise<string | null> {
      return localStorage.getItem(key);
    },
    async set(key: string, value: string): Promise<void> {
      localStorage.setItem(key, value);
    },
    async remove(key: string): Promise<void> {
      localStorage.removeItem(key);
    },
    async clear(): Promise<void> {
      localStorage.clear();
    }
  };

  clipboard: IClipboard = {
    async write(text: string): Promise<void> {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        console.warn("Clipboard API not available");
      }
    },
    async read(): Promise<string> {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
      return '';
    }
  };

  camera: ICamera = {
    async takePhoto(): Promise<string> {
        console.log('[WebPlatform] Camera simulated');
        return 'https://picsum.photos/200/300';
    },
    async scanQRCode(): Promise<string> {
        console.log('[WebPlatform] QR Scan simulated');
        return 'https://example.com';
    }
  };
}
