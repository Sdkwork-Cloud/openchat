import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  mimeType: string;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  checksum?: string;
}

export interface FileUploadOptions {
  maxSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  destination?: string;
  generateName?: boolean;
  preserveExtension?: boolean;
}

export interface FileUploadResult {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  checksum: string;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DirectoryScanOptions {
  recursive?: boolean;
  includeHidden?: boolean;
  maxDepth?: number;
  filter?: (file: FileInfo) => boolean;
}

const MIME_TYPES: Record<string, string> = {
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

@Injectable()
export class FileHandlerService implements OnModuleInit {
  private readonly logger = new Logger(FileHandlerService.name);
  private uploadDir: string;
  private tempDir: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.tempDir = this.configService.get<string>('TEMP_DIR', './temp');

    this.ensureDirectory(this.uploadDir);
    this.ensureDirectory(this.tempDir);

    this.logger.log('FileHandlerService initialized');
  }

  async getFileInfo(filePath: string): Promise<FileInfo> {
    const stats = await fs.promises.stat(filePath);
    const ext = path.extname(filePath);

    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      extension: ext,
      mimeType: this.getMimeType(ext),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isDirectory: stats.isDirectory(),
    };
  }

  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    return fs.promises.readFile(filePath, encoding);
  }

  async readFileBuffer(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    const dir = path.dirname(filePath);
    await this.ensureDirectory(dir);
    await fs.promises.writeFile(filePath, content);
  }

  async appendFile(filePath: string, content: string | Buffer): Promise<void> {
    await fs.promises.appendFile(filePath, content);
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath}:`, error);
      return false;
    }
  }

  async moveFile(source: string, destination: string): Promise<boolean> {
    try {
      const destDir = path.dirname(destination);
      await this.ensureDirectory(destDir);
      await fs.promises.rename(source, destination);
      return true;
    } catch (error) {
      this.logger.error(`Failed to move file from ${source} to ${destination}:`, error);
      return false;
    }
  }

  async copyFile(source: string, destination: string): Promise<boolean> {
    try {
      const destDir = path.dirname(destination);
      await this.ensureDirectory(destDir);
      await fs.promises.copyFile(source, destination);
      return true;
    } catch (error) {
      this.logger.error(`Failed to copy file from ${source} to ${destination}:`, error);
      return false;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    await this.ensureDirectory(dirPath);
  }

  async deleteDirectory(dirPath: string, recursive: boolean = false): Promise<boolean> {
    try {
      await fs.promises.rm(dirPath, { recursive, force: true });
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete directory ${dirPath}:`, error);
      return false;
    }
  }

  async listDirectory(dirPath: string, options?: DirectoryScanOptions): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    const scan = async (currentPath: string, depth: number) => {
      if (options?.maxDepth !== undefined && depth > options.maxDepth) {
        return;
      }

      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!options?.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const info = await this.getFileInfo(fullPath);

        if (options?.filter && !options.filter(info)) {
          continue;
        }

        files.push(info);

        if (entry.isDirectory() && options?.recursive) {
          await scan(fullPath, depth + 1);
        }
      }
    };

    await scan(dirPath, 0);
    return files;
  }

  async calculateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async compressFile(sourcePath: string, destinationPath?: string): Promise<string> {
    const dest = destinationPath || `${sourcePath}.gz`;

    await pipeline(
      fs.createReadStream(sourcePath),
      createGzip(),
      fs.createWriteStream(dest),
    );

    return dest;
  }

  async decompressFile(sourcePath: string, destinationPath?: string): Promise<string> {
    const dest = destinationPath || sourcePath.replace('.gz', '');

    await pipeline(
      fs.createReadStream(sourcePath),
      createGunzip(),
      fs.createWriteStream(dest),
    );

    return dest;
  }

  async validateFile(
    filePath: string,
    options?: FileUploadOptions,
  ): Promise<FileValidationResult> {
    const errors: string[] = [];

    const exists = await this.exists(filePath);
    if (!exists) {
      return { valid: false, errors: ['File does not exist'] };
    }

    const info = await this.getFileInfo(filePath);

    if (options?.maxSize && info.size > options.maxSize) {
      errors.push(`File size ${info.size} exceeds maximum allowed size ${options.maxSize}`);
    }

    if (options?.allowedExtensions && options.allowedExtensions.length > 0) {
      if (!options.allowedExtensions.includes(info.extension.toLowerCase())) {
        errors.push(`File extension ${info.extension} is not allowed`);
      }
    }

    if (options?.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      if (!options.allowedMimeTypes.includes(info.mimeType)) {
        errors.push(`File MIME type ${info.mimeType} is not allowed`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async saveUpload(
    file: UploadedFile,
    options?: FileUploadOptions,
  ): Promise<FileUploadResult> {
    const validation = await this.validateUpload(file, options);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const filename = options?.generateName !== false
      ? this.generateFilename(file.originalname, options?.preserveExtension !== false)
      : file.originalname;

    const destination = options?.destination || this.uploadDir;
    const filePath = path.join(destination, filename);

    await this.ensureDirectory(destination);
    await fs.promises.writeFile(filePath, file.buffer);

    const checksum = this.calculateBufferChecksum(file.buffer);

    return {
      filename,
      originalName: file.originalname,
      path: filePath,
      size: file.size,
      mimeType: file.mimetype,
      checksum,
    };
  }

  async createTempFile(content: string | Buffer, extension?: string): Promise<string> {
    const filename = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension || ''}`;
    const filePath = path.join(this.tempDir, filename);

    await fs.promises.writeFile(filePath, content);

    return filePath;
  }

  async cleanupTempFiles(maxAge: number = 3600000): Promise<number> {
    const files = await this.listDirectory(this.tempDir);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      const age = now - file.modifiedAt.getTime();
      if (age > maxAge) {
        await this.deleteFile(file.path);
        cleaned++;
      }
    }

    return cleaned;
  }

  getMimeType(extension: string): string {
    return MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
  }

  getExtension(mimeType: string): string {
    for (const [ext, mime] of Object.entries(MIME_TYPES)) {
      if (mime === mimeType) {
        return ext;
      }
    }
    return '';
  }

  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
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

  private async validateUpload(
    file: UploadedFile,
    options?: FileUploadOptions,
  ): Promise<FileValidationResult> {
    const errors: string[] = [];

    if (options?.maxSize && file.size > options.maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.formatFileSize(options.maxSize)}`);
    }

    const ext = path.extname(file.originalname).toLowerCase();

    if (options?.allowedExtensions && options.allowedExtensions.length > 0) {
      if (!options.allowedExtensions.includes(ext)) {
        errors.push(`File extension ${ext} is not allowed`);
      }
    }

    if (options?.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        errors.push(`File MIME type ${file.mimetype} is not allowed`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private generateFilename(originalName: string, preserveExtension: boolean = true): string {
    const ext = preserveExtension ? path.extname(originalName) : '';
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
  }

  private calculateBufferChecksum(buffer: Buffer, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(buffer).digest('hex');
  }
}
