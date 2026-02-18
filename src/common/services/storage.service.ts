import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export type StorageProvider = 'local' | 's3' | 'gcs' | 'azure' | 'memory';

export interface StorageOptions {
  provider?: StorageProvider;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  basePath?: string;
  publicUrl?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

export interface StorageFile {
  key: string;
  size: number;
  mimeType: string;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
  url?: string;
}

export interface UploadOptions {
  key?: string;
  mimeType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
  cacheControl?: string;
  contentDisposition?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  etag?: string;
}

export interface DownloadResult {
  data: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface ListOptions {
  prefix?: string;
  delimiter?: string;
  maxKeys?: number;
  startAfter?: string;
}

export interface ListResult {
  files: StorageFile[];
  directories: string[];
  isTruncated: boolean;
  nextToken?: string;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  action?: 'read' | 'write' | 'delete';
}

@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private readonly storages = new Map<string, {
    options: Required<StorageOptions>;
    memoryStore?: Map<string, { data: Buffer; mimeType: string; metadata: Record<string, string> }>;
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('StorageService initialized');
  }

  onModuleDestroy() {
    this.storages.clear();
  }

  createStorage(name: string, options: StorageOptions): void {
    if (this.storages.has(name)) {
      throw new Error(`Storage '${name}' already exists`);
    }

    const defaultOptions: Required<StorageOptions> = {
      provider: options.provider || 'local',
      bucket: options.bucket || 'default',
      region: options.region || 'us-east-1',
      endpoint: options.endpoint || '',
      accessKeyId: options.accessKeyId || '',
      secretAccessKey: options.secretAccessKey || '',
      basePath: options.basePath || './storage',
      publicUrl: options.publicUrl || '',
      maxFileSize: options.maxFileSize || 100 * 1024 * 1024,
      allowedMimeTypes: options.allowedMimeTypes || [],
    };

    const storage: {
      options: Required<StorageOptions>;
      memoryStore?: Map<string, { data: Buffer; mimeType: string; metadata: Record<string, string> }>;
    } = { options: defaultOptions };

    if (defaultOptions.provider === 'memory') {
      storage.memoryStore = new Map();
    } else if (defaultOptions.provider === 'local') {
      this.ensureDirectory(defaultOptions.basePath);
    }

    this.storages.set(name, storage);
    this.logger.log(`Storage '${name}' created with provider=${defaultOptions.provider}`);
  }

  async upload(
    storageName: string,
    data: Buffer | string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const storage = this.storages.get(storageName);
    if (!storage) {
      throw new Error(`Storage '${storageName}' not found`);
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const key = options?.key || this.generateKey();
    const mimeType = options?.mimeType || 'application/octet-stream';

    if (buffer.length > storage.options.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${storage.options.maxFileSize} bytes`);
    }

    if (storage.options.allowedMimeTypes.length > 0 && !storage.options.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`MIME type '${mimeType}' is not allowed`);
    }

    switch (storage.options.provider) {
      case 'local':
        return this.uploadLocal(storage, key, buffer, mimeType, options);
      case 'memory':
        return this.uploadMemory(storage, key, buffer, mimeType, options);
      default:
        throw new Error(`Provider '${storage.options.provider}' not implemented`);
    }
  }

  async download(storageName: string, key: string): Promise<DownloadResult> {
    const storage = this.storages.get(storageName);
    if (!storage) {
      throw new Error(`Storage '${storageName}' not found`);
    }

    switch (storage.options.provider) {
      case 'local':
        return this.downloadLocal(storage, key);
      case 'memory':
        return this.downloadMemory(storage, key);
      default:
        throw new Error(`Provider '${storage.options.provider}' not implemented`);
    }
  }

  async delete(storageName: string, key: string): Promise<boolean> {
    const storage = this.storages.get(storageName);
    if (!storage) {
      throw new Error(`Storage '${storageName}' not found`);
    }

    switch (storage.options.provider) {
      case 'local':
        return this.deleteLocal(storage, key);
      case 'memory':
        return this.deleteMemory(storage, key);
      default:
        throw new Error(`Provider '${storage.options.provider}' not implemented`);
    }
  }

  async exists(storageName: string, key: string): Promise<boolean> {
    const storage = this.storages.get(storageName);
    if (!storage) {
      throw new Error(`Storage '${storageName}' not found`);
    }

    switch (storage.options.provider) {
      case 'local':
        return this.existsLocal(storage, key);
      case 'memory':
        return storage.memoryStore?.has(key) || false;
      default:
        throw new Error(`Provider '${storage.options.provider}' not implemented`);
    }
  }

  async list(storageName: string, options?: ListOptions): Promise<ListResult> {
    const storage = this.storages.get(storageName);
    if (!storage) {
      throw new Error(`Storage '${storageName}' not found`);
    }

    switch (storage.options.provider) {
      case 'local':
        return this.listLocal(storage, options);
      case 'memory':
        return this.listMemory(storage, options);
      default:
        throw new Error(`Provider '${storage.options.provider}' not implemented`);
    }
  }

  async getMetadata(storageName: string, key: string): Promise<StorageFile | undefined> {
    const storage = this.storages.get(storageName);
    if (!storage) {
      throw new Error(`Storage '${storageName}' not found`);
    }

    switch (storage.options.provider) {
      case 'local':
        return this.getMetadataLocal(storage, key);
      case 'memory':
        return this.getMetadataMemory(storage, key);
      default:
        throw new Error(`Provider '${storage.options.provider}' not implemented`);
    }
  }

  getUrl(storageName: string, key: string): string {
    const storage = this.storages.get(storageName);
    if (!storage) {
      throw new Error(`Storage '${storageName}' not found`);
    }

    if (storage.options.publicUrl) {
      return `${storage.options.publicUrl}/${key}`;
    }

    switch (storage.options.provider) {
      case 'local':
        return `/storage/${storage.options.bucket}/${key}`;
      default:
        return key;
    }
  }

  async getSignedUrl(storageName: string, key: string, options?: SignedUrlOptions): Promise<string> {
    const storage = this.storages.get(storageName);
    if (!storage) {
      throw new Error(`Storage '${storageName}' not found`);
    }

    const expiresIn = options?.expiresIn || 3600;
    const action = options?.action || 'read';

    const token = Buffer.from(JSON.stringify({
      key,
      action,
      expires: Date.now() + expiresIn * 1000,
      storage: storageName,
    })).toString('base64');

    return `${this.getUrl(storageName, key)}?token=${token}`;
  }

  async copy(storageName: string, sourceKey: string, destKey: string): Promise<UploadResult> {
    const downloadResult = await this.download(storageName, sourceKey);
    return this.upload(storageName, downloadResult.data, {
      key: destKey,
      mimeType: downloadResult.mimeType,
      metadata: downloadResult.metadata,
    });
  }

  async move(storageName: string, sourceKey: string, destKey: string): Promise<UploadResult> {
    const result = await this.copy(storageName, sourceKey, destKey);
    await this.delete(storageName, sourceKey);
    return result;
  }

  private async uploadLocal(
    storage: { options: Required<StorageOptions> },
    key: string,
    data: Buffer,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const filePath = path.join(storage.options.basePath, key);
    const dir = path.dirname(filePath);

    await this.ensureDirectory(dir);
    await fs.promises.writeFile(filePath, data);

    const metadataFile = `${filePath}.meta`;
    const metadata = {
      mimeType,
      ...options?.metadata,
      uploadedAt: new Date().toISOString(),
    };
    await fs.promises.writeFile(metadataFile, JSON.stringify(metadata));

    return {
      key,
      url: this.getUrl(storage.options.bucket, key),
      size: data.length,
      mimeType,
    };
  }

  private async uploadMemory(
    storage: { options: Required<StorageOptions>; memoryStore?: Map<string, { data: Buffer; mimeType: string; metadata: Record<string, string> }> },
    key: string,
    data: Buffer,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    if (!storage.memoryStore) {
      storage.memoryStore = new Map();
    }

    storage.memoryStore.set(key, {
      data,
      mimeType,
      metadata: options?.metadata || {},
    });

    return {
      key,
      url: this.getUrl(storage.options.bucket, key),
      size: data.length,
      mimeType,
    };
  }

  private async downloadLocal(
    storage: { options: Required<StorageOptions> },
    key: string,
  ): Promise<DownloadResult> {
    const filePath = path.join(storage.options.basePath, key);

    const data = await fs.promises.readFile(filePath);

    let mimeType = 'application/octet-stream';
    let metadata: Record<string, string> = {};

    try {
      const metadataFile = `${filePath}.meta`;
      const metadataContent = await fs.promises.readFile(metadataFile, 'utf8');
      const parsed = JSON.parse(metadataContent);
      mimeType = parsed.mimeType || mimeType;
      delete parsed.mimeType;
      metadata = parsed;
    } catch {
      // No metadata file
    }

    return { data, mimeType, metadata };
  }

  private async downloadMemory(
    storage: { options: Required<StorageOptions>; memoryStore?: Map<string, { data: Buffer; mimeType: string; metadata: Record<string, string> }> },
    key: string,
  ): Promise<DownloadResult> {
    const item = storage.memoryStore?.get(key);
    if (!item) {
      throw new Error(`File '${key}' not found`);
    }

    return {
      data: item.data,
      mimeType: item.mimeType,
      metadata: item.metadata,
    };
  }

  private async deleteLocal(
    storage: { options: Required<StorageOptions> },
    key: string,
  ): Promise<boolean> {
    const filePath = path.join(storage.options.basePath, key);

    try {
      await fs.promises.unlink(filePath);

      try {
        await fs.promises.unlink(`${filePath}.meta`);
      } catch {
        // No metadata file
      }

      return true;
    } catch {
      return false;
    }
  }

  private async deleteMemory(
    storage: { options: Required<StorageOptions>; memoryStore?: Map<string, { data: Buffer; mimeType: string; metadata: Record<string, string> }> },
    key: string,
  ): Promise<boolean> {
    return storage.memoryStore?.delete(key) || false;
  }

  private async existsLocal(
    storage: { options: Required<StorageOptions> },
    key: string,
  ): Promise<boolean> {
    const filePath = path.join(storage.options.basePath, key);

    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async listLocal(
    storage: { options: Required<StorageOptions> },
    options?: ListOptions,
  ): Promise<ListResult> {
    const basePath = storage.options.basePath;
    const prefix = options?.prefix || '';
    const searchPath = path.join(basePath, prefix);

    const files: StorageFile[] = [];
    const directories: string[] = [];

    try {
      const entries = await fs.promises.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.endsWith('.meta')) continue;

        const key = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          directories.push(key);
        } else {
          const filePath = path.join(searchPath, entry.name);
          const stats = await fs.promises.stat(filePath);

          files.push({
            key,
            size: stats.size,
            mimeType: await this.getMimeTypeFromMeta(filePath),
            lastModified: stats.mtime,
          });
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return {
      files: files.slice(0, options?.maxKeys || 1000),
      directories,
      isTruncated: false,
    };
  }

  private async listMemory(
    storage: { options: Required<StorageOptions>; memoryStore?: Map<string, { data: Buffer; mimeType: string; metadata: Record<string, string> }> },
    options?: ListOptions,
  ): Promise<ListResult> {
    const prefix = options?.prefix || '';
    const files: StorageFile[] = [];

    if (storage.memoryStore) {
      for (const [key, value] of storage.memoryStore) {
        if (key.startsWith(prefix)) {
          files.push({
            key,
            size: value.data.length,
            mimeType: value.mimeType,
          });
        }
      }
    }

    return {
      files: files.slice(0, options?.maxKeys || 1000),
      directories: [],
      isTruncated: false,
    };
  }

  private async getMetadataLocal(
    storage: { options: Required<StorageOptions> },
    key: string,
  ): Promise<StorageFile | undefined> {
    const filePath = path.join(storage.options.basePath, key);

    try {
      const stats = await fs.promises.stat(filePath);

      return {
        key,
        size: stats.size,
        mimeType: await this.getMimeTypeFromMeta(filePath),
        lastModified: stats.mtime,
      };
    } catch {
      return undefined;
    }
  }

  private async getMetadataMemory(
    storage: { options: Required<StorageOptions>; memoryStore?: Map<string, { data: Buffer; mimeType: string; metadata: Record<string, string> }> },
    key: string,
  ): Promise<StorageFile | undefined> {
    const item = storage.memoryStore?.get(key);
    if (!item) return undefined;

    return {
      key,
      size: item.data.length,
      mimeType: item.mimeType,
      metadata: item.metadata,
    };
  }

  private async getMimeTypeFromMeta(filePath: string): Promise<string> {
    try {
      const metadataContent = await fs.promises.readFile(`${filePath}.meta`, 'utf8');
      const metadata = JSON.parse(metadataContent);
      return metadata.mimeType || 'application/octet-stream';
    } catch {
      return 'application/octet-stream';
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private generateKey(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 16);

    return `${year}/${month}/${day}/${random}`;
  }
}
