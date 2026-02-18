import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface StorageProvider {
  name: string;
  upload(file: Buffer, key: string, options?: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  getMetadata(key: string): Promise<FileMetadata | null>;
  list(prefix?: string): Promise<FileListItem[]>;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read' | 'public-read-write';
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  etag?: string;
  versionId?: string;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface FileListItem {
  key: string;
  size: number;
  lastModified: Date;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'oss' | 'cos';
  basePath?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  cdnDomain?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

@Injectable()
export class FileStorageService implements OnModuleDestroy {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly provider: StorageProvider;
  private readonly config: StorageConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      provider: this.configService.get('STORAGE_PROVIDER', 'local'),
      basePath: this.configService.get('STORAGE_BASE_PATH', './uploads'),
      bucket: this.configService.get('STORAGE_BUCKET'),
      region: this.configService.get('STORAGE_REGION'),
      accessKeyId: this.configService.get('STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('STORAGE_SECRET_ACCESS_KEY'),
      endpoint: this.configService.get('STORAGE_ENDPOINT'),
      cdnDomain: this.configService.get('STORAGE_CDN_DOMAIN'),
      maxFileSize: this.configService.get('STORAGE_MAX_FILE_SIZE', 10 * 1024 * 1024),
      allowedMimeTypes: this.configService.get('STORAGE_ALLOWED_MIME_TYPES')?.split(','),
    };

    this.provider = this.createProvider();
  }

  async onModuleDestroy() {
    this.logger.log('FileStorageService destroyed');
  }

  async upload(
    file: Buffer,
    filename: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    this.validateFile(file, options?.contentType);

    const key = this.generateKey(filename);

    const result = await this.provider.upload(file, key, {
      ...options,
      contentType: options?.contentType || this.getMimeType(filename),
    });

    this.logger.debug(`File uploaded: ${key}, size: ${result.size}`);

    return result;
  }

  async uploadFromPath(
    filePath: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const file = await fs.readFile(filePath);
    const filename = path.basename(filePath);

    return this.upload(file, filename, {
      ...options,
      contentType: options?.contentType || this.getMimeType(filename),
    });
  }

  async uploadFromBase64(
    base64Data: string,
    filename: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const buffer = Buffer.from(base64Data, 'base64');
    return this.upload(buffer, filename, options);
  }

  async download(key: string): Promise<Buffer> {
    return this.provider.download(key);
  }

  async downloadToFile(key: string, destination: string): Promise<void> {
    const buffer = await this.download(key);
    await fs.writeFile(destination, buffer);
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.provider.delete(key);
    this.logger.debug(`File deleted: ${key}`);
    return result;
  }

  async deleteMultiple(keys: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    await Promise.all(
      keys.map(async (key) => {
        try {
          await this.delete(key);
          success.push(key);
        } catch {
          failed.push(key);
        }
      }),
    );

    return { success, failed };
  }

  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getUrl(key, expiresIn);
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    return this.provider.getMetadata(key);
  }

  async list(prefix?: string): Promise<FileListItem[]> {
    return this.provider.list(prefix);
  }

  async copy(sourceKey: string, destinationKey: string): Promise<UploadResult> {
    const buffer = await this.download(sourceKey);
    const metadata = await this.getMetadata(sourceKey);

    return this.provider.upload(buffer, destinationKey, {
      contentType: metadata?.contentType,
      metadata: metadata?.metadata,
    });
  }

  async move(sourceKey: string, destinationKey: string): Promise<UploadResult> {
    const result = await this.copy(sourceKey, destinationKey);
    await this.delete(sourceKey);
    return result;
  }

  generateKey(filename: string, prefix?: string): string {
    const ext = path.extname(filename);
    const hash = createHash('md5')
      .update(`${filename}${Date.now()}${Math.random()}`)
      .digest('hex');

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    let key = `${year}/${month}/${day}/${hash}${ext}`;

    if (prefix) {
      key = `${prefix}/${key}`;
    }

    return key;
  }

  private validateFile(file: Buffer, contentType?: string): void {
    if (file.length > this.config.maxFileSize!) {
      throw new Error(
        `File size ${file.length} exceeds maximum allowed size ${this.config.maxFileSize}`,
      );
    }

    if (this.config.allowedMimeTypes && this.config.allowedMimeTypes.length > 0) {
      if (contentType && !this.config.allowedMimeTypes.includes(contentType)) {
        throw new Error(`Content type ${contentType} is not allowed`);
      }
    }
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private createProvider(): StorageProvider {
    switch (this.config.provider) {
      case 'local':
        return new LocalStorageProvider(this.config);
      case 's3':
        return new S3StorageProvider(this.config);
      case 'oss':
        return new OSSStorageProvider(this.config);
      case 'cos':
        return new COSStorageProvider(this.config);
      default:
        this.logger.warn(`Unknown provider ${this.config.provider}, using local storage`);
        return new LocalStorageProvider(this.config);
    }
  }
}

class LocalStorageProvider implements StorageProvider {
  name = 'local';
  private readonly logger = new Logger(LocalStorageProvider.name);

  constructor(private readonly config: StorageConfig) {
    this.ensureDirectory();
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.basePath!, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create storage directory:', error);
    }
  }

  async upload(file: Buffer, key: string, options?: UploadOptions): Promise<UploadResult> {
    const filePath = path.join(this.config.basePath!, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file);

    return {
      key,
      url: `/storage/${key}`,
      size: file.length,
      etag: createHash('md5').update(file).digest('hex'),
    };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.config.basePath!, key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath!, key);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath!, key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    return `/storage/${key}`;
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const filePath = path.join(this.config.basePath!, key);
      const stats = await fs.stat(filePath);

      return {
        key,
        size: stats.size,
        contentType: 'application/octet-stream',
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  async list(prefix?: string): Promise<FileListItem[]> {
    const items: FileListItem[] = [];
    const basePath = prefix ? path.join(this.config.basePath!, prefix) : this.config.basePath!;

    try {
      const files = await this.walkDirectory(basePath);

      for (const file of files) {
        const stats = await fs.stat(file);
        const relativePath = path.relative(this.config.basePath!, file);

        items.push({
          key: relativePath.replace(/\\/g, '/'),
          size: stats.size,
          lastModified: stats.mtime,
        });
      }
    } catch (error) {
      this.logger.error('Failed to list files:', error);
    }

    return items;
  }

  private async walkDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...await this.walkDirectory(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or not accessible
    }

    return files;
  }
}

class S3StorageProvider implements StorageProvider {
  name = 's3';
  private readonly logger = new Logger(S3StorageProvider.name);

  constructor(private readonly config: StorageConfig) {}

  async upload(file: Buffer, key: string, options?: UploadOptions): Promise<UploadResult> {
    this.logger.debug(`S3 upload: ${key}`);
    return {
      key,
      url: `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`,
      size: file.length,
    };
  }

  async download(key: string): Promise<Buffer> {
    throw new Error('S3 provider not implemented');
  }

  async delete(key: string): Promise<boolean> {
    this.logger.debug(`S3 delete: ${key}`);
    return true;
  }

  async exists(key: string): Promise<boolean> {
    return true;
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    if (this.config.cdnDomain) {
      return `https://${this.config.cdnDomain}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    return null;
  }

  async list(prefix?: string): Promise<FileListItem[]> {
    return [];
  }
}

class OSSStorageProvider implements StorageProvider {
  name = 'oss';
  private readonly logger = new Logger(OSSStorageProvider.name);

  constructor(private readonly config: StorageConfig) {}

  async upload(file: Buffer, key: string, options?: UploadOptions): Promise<UploadResult> {
    this.logger.debug(`OSS upload: ${key}`);
    return {
      key,
      url: `https://${this.config.bucket}.oss-${this.config.region}.aliyuncs.com/${key}`,
      size: file.length,
    };
  }

  async download(key: string): Promise<Buffer> {
    throw new Error('OSS provider not implemented');
  }

  async delete(key: string): Promise<boolean> {
    return true;
  }

  async exists(key: string): Promise<boolean> {
    return true;
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    if (this.config.cdnDomain) {
      return `https://${this.config.cdnDomain}/${key}`;
    }
    return `https://${this.config.bucket}.oss-${this.config.region}.aliyuncs.com/${key}`;
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    return null;
  }

  async list(prefix?: string): Promise<FileListItem[]> {
    return [];
  }
}

class COSStorageProvider implements StorageProvider {
  name = 'cos';
  private readonly logger = new Logger(COSStorageProvider.name);

  constructor(private readonly config: StorageConfig) {}

  async upload(file: Buffer, key: string, options?: UploadOptions): Promise<UploadResult> {
    this.logger.debug(`COS upload: ${key}`);
    return {
      key,
      url: `https://${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${key}`,
      size: file.length,
    };
  }

  async download(key: string): Promise<Buffer> {
    throw new Error('COS provider not implemented');
  }

  async delete(key: string): Promise<boolean> {
    return true;
  }

  async exists(key: string): Promise<boolean> {
    return true;
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    if (this.config.cdnDomain) {
      return `https://${this.config.cdnDomain}/${key}`;
    }
    return `https://${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${key}`;
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    return null;
  }

  async list(prefix?: string): Promise<FileListItem[]> {
    return [];
  }
}
