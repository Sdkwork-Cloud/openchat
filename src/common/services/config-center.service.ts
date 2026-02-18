import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ConfigSourceType = 'file' | 'env' | 'database' | 'remote' | 'memory';
export type ConfigChangeType = 'created' | 'updated' | 'deleted';

export interface ConfigEntry {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  source: ConfigSourceType;
  version: number;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
  encrypted?: boolean;
  sensitive?: boolean;
  description?: string;
  tags?: string[];
}

export interface ConfigChange {
  key: string;
  type: ConfigChangeType;
  oldValue?: any;
  newValue?: any;
  timestamp: number;
  source: string;
}

export interface ConfigWatcher {
  id: string;
  keyPattern: string;
  callback: (change: ConfigChange) => void;
  options?: {
    immediate?: boolean;
    includeDeleted?: boolean;
  };
}

export interface ConfigNamespace {
  name: string;
  entries: Map<string, ConfigEntry>;
  watchers: Map<string, ConfigWatcher>;
}

export interface ConfigCenterOptions {
  enableWatchers?: boolean;
  enableHistory?: boolean;
  historySize?: number;
  encryptSensitive?: boolean;
  sensitiveKeys?: string[];
}

export interface ConfigStats {
  totalNamespaces: number;
  totalEntries: number;
  entriesBySource: Record<ConfigSourceType, number>;
  entriesByType: Record<string, number>;
  sensitiveEntries: number;
  watcherCount: number;
  historySize: number;
}

@Injectable()
export class ConfigCenterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConfigCenterService.name);
  private readonly namespaces = new Map<string, ConfigNamespace>();
  private readonly history: ConfigChange[] = [];
  private readonly options: Required<ConfigCenterOptions>;
  private watcherIdCounter = 0;

  constructor(private readonly configService: ConfigService) {
    this.options = {
      enableWatchers: true,
      enableHistory: true,
      historySize: 1000,
      encryptSensitive: false,
      sensitiveKeys: ['password', 'secret', 'key', 'token', 'credential'],
    };
  }

  onModuleInit() {
    this.createNamespace('default');
    this.loadFromEnv();
    this.logger.log('ConfigCenterService initialized');
  }

  onModuleDestroy() {
    this.namespaces.clear();
    this.history.length = 0;
  }

  createNamespace(name: string): void {
    if (this.namespaces.has(name)) {
      throw new Error(`Namespace '${name}' already exists`);
    }

    this.namespaces.set(name, {
      name,
      entries: new Map(),
      watchers: new Map(),
    });

    this.logger.debug(`Namespace '${name}' created`);
  }

  deleteNamespace(name: string): boolean {
    if (name === 'default') {
      throw new Error('Cannot delete default namespace');
    }

    return this.namespaces.delete(name);
  }

  getNamespace(name: string): ConfigNamespace | undefined {
    return this.namespaces.get(name);
  }

  listNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  set(
    key: string,
    value: any,
    options?: {
      namespace?: string;
      source?: ConfigSourceType;
      type?: ConfigEntry['type'];
      description?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      sensitive?: boolean;
    },
  ): ConfigEntry {
    const namespaceName = options?.namespace || 'default';
    const namespace = this.namespaces.get(namespaceName);
    if (!namespace) {
      throw new Error(`Namespace '${namespaceName}' not found`);
    }

    const existing = namespace.entries.get(key);
    const now = Date.now();
    const isSensitive = options?.sensitive || this.isSensitiveKey(key);

    const entry: ConfigEntry = {
      key,
      value,
      type: options?.type || this.detectType(value),
      source: options?.source || 'memory',
      version: existing ? existing.version + 1 : 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      description: options?.description || existing?.description,
      tags: options?.tags || existing?.tags,
      metadata: options?.metadata || existing?.metadata,
      sensitive: isSensitive,
      encrypted: isSensitive && this.options.encryptSensitive,
    };

    namespace.entries.set(key, entry);

    const change: ConfigChange = {
      key,
      type: existing ? 'updated' : 'created',
      oldValue: existing?.value,
      newValue: value,
      timestamp: now,
      source: namespaceName,
    };

    this.recordChange(change);
    this.notifyWatchers(namespace, change);

    return entry;
  }

  get<T = any>(key: string, defaultValue?: T, namespace?: string): T {
    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return defaultValue as T;

    const entry = ns.entries.get(key);
    if (!entry) return defaultValue as T;

    return entry.value as T;
  }

  has(key: string, namespace?: string): boolean {
    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return false;

    return ns.entries.has(key);
  }

  delete(key: string, namespace?: string): boolean {
    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return false;

    const entry = ns.entries.get(key);
    if (!entry) return false;

    ns.entries.delete(key);

    const change: ConfigChange = {
      key,
      type: 'deleted',
      oldValue: entry.value,
      timestamp: Date.now(),
      source: namespace || 'default',
    };

    this.recordChange(change);
    this.notifyWatchers(ns, change);

    return true;
  }

  getAll(namespace?: string): Record<string, any> {
    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return {};

    const result: Record<string, any> = {};
    for (const [key, entry] of ns.entries) {
      result[key] = entry.value;
    }

    return result;
  }

  getByPrefix(prefix: string, namespace?: string): Record<string, any> {
    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return {};

    const result: Record<string, any> = {};
    for (const [key, entry] of ns.entries) {
      if (key.startsWith(prefix)) {
        result[key] = entry.value;
      }
    }

    return result;
  }

  getByTags(tags: string[], namespace?: string): ConfigEntry[] {
    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return [];

    const result: ConfigEntry[] = [];
    for (const entry of ns.entries.values()) {
      if (entry.tags && tags.some(tag => entry.tags!.includes(tag))) {
        result.push(entry);
      }
    }

    return result;
  }

  watch(
    keyPattern: string,
    callback: (change: ConfigChange) => void,
    options?: {
      namespace?: string;
      immediate?: boolean;
      includeDeleted?: boolean;
    },
  ): string {
    if (!this.options.enableWatchers) {
      throw new Error('Watchers are disabled');
    }

    const namespaceName = options?.namespace || 'default';
    const namespace = this.namespaces.get(namespaceName);
    if (!namespace) {
      throw new Error(`Namespace '${namespaceName}' not found`);
    }

    const watcherId = `watcher_${++this.watcherIdCounter}`;

    const watcher: ConfigWatcher = {
      id: watcherId,
      keyPattern,
      callback,
      options: {
        immediate: options?.immediate,
        includeDeleted: options?.includeDeleted,
      },
    };

    namespace.watchers.set(watcherId, watcher);

    if (options?.immediate) {
      for (const [key, entry] of namespace.entries) {
        if (this.matchesPattern(key, keyPattern)) {
          callback({
            key,
            type: 'created',
            newValue: entry.value,
            timestamp: Date.now(),
            source: namespaceName,
          });
        }
      }
    }

    return watcherId;
  }

  unwatch(watcherId: string, namespace?: string): boolean {
    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return false;

    return ns.watchers.delete(watcherId);
  }

  getHistory(key?: string, namespace?: string): ConfigChange[] {
    let history = [...this.history];

    if (namespace) {
      history = history.filter(c => c.source === namespace);
    }

    if (key) {
      history = history.filter(c => c.key === key);
    }

    return history;
  }

  rollback(key: string, version: number, namespace?: string): boolean {
    const history = this.getHistory(key, namespace);
    const targetChange = history.find(c => c.type === 'updated' || c.type === 'created');

    if (!targetChange) return false;

    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return false;

    const entry = ns.entries.get(key);
    if (!entry || entry.version < version) return false;

    const versionChanges = history.filter(c =>
      c.key === key &&
      (c.type === 'updated' || c.type === 'created')
    ).reverse();

    const targetVersion = versionChanges.find((_, index) => index === version - 1);
    if (!targetVersion) return false;

    this.set(key, targetVersion.newValue, { namespace });
    return true;
  }

  export(namespace?: string): string {
    const ns = this.namespaces.get(namespace || 'default');
    if (!ns) return '{}';

    const data: Record<string, any> = {};
    for (const [key, entry] of ns.entries) {
      data[key] = {
        value: entry.value,
        type: entry.type,
        description: entry.description,
        tags: entry.tags,
        sensitive: entry.sensitive,
      };
    }

    return JSON.stringify(data, null, 2);
  }

  import(jsonData: string, namespace?: string, merge?: boolean): number {
    const data = JSON.parse(jsonData);
    const ns = namespace || 'default';

    if (!merge) {
      const existingNs = this.namespaces.get(ns);
      if (existingNs) {
        existingNs.entries.clear();
      }
    }

    let count = 0;
    for (const [key, config] of Object.entries(data)) {
      const configData = config as any;
      this.set(key, configData.value, {
        namespace: ns,
        type: configData.type,
        description: configData.description,
        tags: configData.tags,
        sensitive: configData.sensitive,
      });
      count++;
    }

    return count;
  }

  getStats(): ConfigStats {
    let totalEntries = 0;
    let sensitiveEntries = 0;
    const entriesBySource: Record<ConfigSourceType, number> = {
      file: 0,
      env: 0,
      database: 0,
      remote: 0,
      memory: 0,
    };
    const entriesByType: Record<string, number> = {};
    let watcherCount = 0;

    for (const ns of this.namespaces.values()) {
      for (const entry of ns.entries.values()) {
        totalEntries++;
        entriesBySource[entry.source]++;
        entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
        if (entry.sensitive) sensitiveEntries++;
      }
      watcherCount += ns.watchers.size;
    }

    return {
      totalNamespaces: this.namespaces.size,
      totalEntries,
      entriesBySource,
      entriesByType,
      sensitiveEntries,
      watcherCount,
      historySize: this.history.length,
    };
  }

  private loadFromEnv(): void {
    const env = process.env;

    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        this.set(key, value, {
          source: 'env',
          type: 'string',
        });
      }
    }
  }

  private recordChange(change: ConfigChange): void {
    if (!this.options.enableHistory) return;

    this.history.push(change);

    while (this.history.length > this.options.historySize) {
      this.history.shift();
    }
  }

  private notifyWatchers(namespace: ConfigNamespace, change: ConfigChange): void {
    if (!this.options.enableWatchers) return;

    for (const watcher of namespace.watchers.values()) {
      if (this.matchesPattern(change.key, watcher.keyPattern)) {
        if (change.type === 'deleted' && !watcher.options?.includeDeleted) {
          continue;
        }

        try {
          watcher.callback(change);
        } catch (error) {
          this.logger.error(`Watcher callback error for key '${change.key}'`, error);
        }
      }
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern === '*') return true;

    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    return regex.test(key);
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.options.sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()));
  }

  private detectType(value: any): ConfigEntry['type'] {
    if (value === null || value === undefined) return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  }
}
