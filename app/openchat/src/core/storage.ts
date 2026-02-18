/**
 * Storage抽象层
 * 为不同平台提供统一的存储接口
 */

export interface StorageOptions {
  prefix?: string;
  encrypt?: boolean;
  expires?: number;
}

export interface StorageItem<T = any> {
  value: T;
  expires?: number;
}

export abstract class AbstractStorageService {
  protected prefix: string = 'openchat_';
  protected encrypt: boolean = false;

  constructor(options?: StorageOptions) {
    if (options?.prefix) {
      this.prefix = options.prefix;
    }
    this.encrypt = options?.encrypt ?? false;
  }

  protected getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  abstract get<T = any>(key: string): T | null;
  abstract set<T = any>(key: string, value: T, expires?: number): void;
  abstract remove(key: string): void;
  abstract clear(): void;
  abstract keys(): string[];
  abstract has(key: string): boolean;

  getOrDefault<T = any>(key: string, defaultValue: T): T {
    return this.get<T>(key) ?? defaultValue;
  }

  async getAsync<T = any>(key: string): Promise<T | null> {
    return this.get<T>(key);
  }

  async setAsync<T = any>(key: string, value: T, expires?: number): Promise<void> {
    this.set(key, value, expires);
  }
}

export class LocalStorageService extends AbstractStorageService {
  constructor(options?: StorageOptions) {
    super(options);
  }

  get<T = any>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (!item) return null;

      const parsed: StorageItem<T> = JSON.parse(item);
      if (parsed.expires && parsed.expires < Date.now()) {
        this.remove(key);
        return null;
      }

      return parsed.value;
    } catch {
      return null;
    }
  }

  set<T = any>(key: string, value: T, expires?: number): void {
    const item: StorageItem<T> = {
      value,
      expires: expires ? Date.now() + expires : undefined,
    };
    localStorage.setItem(this.getKey(key), JSON.stringify(item));
  }

  remove(key: string): void {
    localStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = this.keys();
    keys.forEach(key => this.remove(key));
  }

  keys(): string[] {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.slice(this.prefix.length));
  }

  has(key: string): boolean {
    return localStorage.getItem(this.getKey(key)) !== null;
  }
}

export class SessionStorageService extends AbstractStorageService {
  constructor(options?: StorageOptions) {
    super(options);
  }

  get<T = any>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(this.getKey(key));
      if (!item) return null;

      const parsed: StorageItem<T> = JSON.parse(item);
      if (parsed.expires && parsed.expires < Date.now()) {
        this.remove(key);
        return null;
      }

      return parsed.value;
    } catch {
      return null;
    }
  }

  set<T = any>(key: string, value: T, expires?: number): void {
    const item: StorageItem<T> = {
      value,
      expires: expires ? Date.now() + expires : undefined,
    };
    sessionStorage.setItem(this.getKey(key), JSON.stringify(item));
  }

  remove(key: string): void {
    sessionStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = this.keys();
    keys.forEach(key => this.remove(key));
  }

  keys(): string[] {
    return Object.keys(sessionStorage)
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.slice(this.prefix.length));
  }

  has(key: string): boolean {
    return sessionStorage.getItem(this.getKey(key)) !== null;
  }
}

export class MemoryStorageService extends AbstractStorageService {
  private store: Map<string, StorageItem> = new Map();

  constructor(options?: StorageOptions) {
    super(options);
  }

  get<T = any>(key: string): T | null {
    const item = this.store.get(this.getKey(key));
    if (!item) return null;

    if (item.expires && item.expires < Date.now()) {
      this.remove(key);
      return null;
    }

    return item.value as T;
  }

  set<T = any>(key: string, value: T, expires?: number): void {
    this.store.set(this.getKey(key), {
      value,
      expires: expires ? Date.now() + expires : undefined,
    });
  }

  remove(key: string): void {
    this.store.delete(this.getKey(key));
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return Array.from(this.store.keys())
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.slice(this.prefix.length));
  }

  has(key: string): boolean {
    return this.store.has(this.getKey(key));
  }
}

export function createStorageService(
  type: 'local' | 'session' | 'memory' = 'local',
  options?: StorageOptions
): AbstractStorageService {
  switch (type) {
    case 'local':
      return new LocalStorageService(options);
    case 'session':
      return new SessionStorageService(options);
    case 'memory':
    default:
      return new MemoryStorageService(options);
  }
}
