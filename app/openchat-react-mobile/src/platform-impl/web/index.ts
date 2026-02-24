
import { IPlatform, PlatformType, IDevice, IStorage, IClipboard, ICamera } from '../../platform';
import { IDB } from '../../utils/indexedDB';

export class WebPlatform implements IPlatform {
  type = PlatformType.WEB;

  async initialize(): Promise<void> {
    console.log('[System] Web Platform Initializing...');
    await this.migrateFromLocalStorage();
    console.log('[System] Storage Engine: IndexedDB (Ready)');
  }

  /**
   * One-time migration to move data from LocalStorage (Sync/Blocking) 
   * to IndexedDB (Async/Non-blocking).
   */
  private async migrateFromLocalStorage() {
      const MIGRATION_FLAG = 'sys_migration_v1_complete';
      if (localStorage.getItem(MIGRATION_FLAG)) return;

      console.log('[System] Migrating data from LocalStorage to IndexedDB...');
      
      const keysToMigrate = [
          'sys_chat_sessions_v4', 
          'sys_user_profile_v3', 
          'sys_app_config_v2',
          'sys_contacts_v2',
          'sys_wallet_transactions_v1',
          'sys_moments_v2',
          'sys_videos_v2',
          'sys_custom_agents_v1',
          'sys_search_history_v1',
          'sys_creations_v1',
          'sys_call_history_v1',
          'sys_favorites_v1',
          'sys_scan_history_v1',
          'sys_articles_v1',
          'sys_cloud_drive_v1',
          'sys_friend_requests_v1',
          'sys_orders_v2',
          'sys_appointments_v5',
          'sys_user_addresses_v1',
          'sys_user_invoices_v1'
      ];

      for (const key of keysToMigrate) {
          const raw = localStorage.getItem(key);
          if (raw) {
              try {
                  const data = JSON.parse(raw);
                  await IDB.set(key, data);
                  // localStorage.removeItem(key); // Optional: Clear old data immediately or keep as backup
              } catch (e) {
                  console.warn(`Failed to migrate key: ${key}`, e);
              }
          }
      }

      localStorage.setItem(MIGRATION_FLAG, 'true');
  }

  device: IDevice = {
    async getUUID(): Promise<string> {
      // UUID is small, okay to keep in LocalStorage for sync access if needed, 
      // but let's move to IDB for consistency or keep in LS for persistence across clearing IDB.
      // Keeping in LS for device identity is standard practice for simple web apps.
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
        version: '2.0.0 (IDB Enhanced)',
      };
    },
    vibrate(pattern: number | number[]): void {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    }
  };

  storage: IStorage = {
    async get(key: string): Promise<any | null> {
      return IDB.get(key);
    },
    async set(key: string, value: any): Promise<void> {
      return IDB.set(key, value);
    },
    async remove(key: string): Promise<void> {
      return IDB.remove(key);
    },
    async clear(): Promise<void> {
      return IDB.clear();
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
