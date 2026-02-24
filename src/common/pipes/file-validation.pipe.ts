/**
 * 文件验证管道
 * 验证上传文件的大小、类型等
 *
 * @framework
 */

import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';

/**
 * 文件验证选项
 */
export interface FileValidationOptions {
  /** 最大文件大小（字节） */
  maxSize?: number;
  /** 最小文件大小（字节） */
  minSize?: number;
  /** 允许的文件类型（MIME types） */
  allowedMimeTypes?: string[];
  /** 允许的文件扩展名 */
  allowedExtensions?: string[];
  /** 最大文件数量 */
  maxFiles?: number;
  /** 是否必需 */
  required?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
}

/**
 * Express 文件接口
 */
export interface ExpressFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  stream?: any;
  destination: string;
  filename: string;
  path: string;
}

/**
 * 文件验证管道
 */
@Injectable()
export class FileValidationPipe implements PipeTransform<ExpressFile | ExpressFile[] | undefined, ExpressFile | ExpressFile[] | undefined> {
  constructor(private readonly options: FileValidationOptions = {}) {}

  transform(
    value: ExpressFile | ExpressFile[] | undefined,
    metadata: ArgumentMetadata,
  ): ExpressFile | ExpressFile[] | undefined {
    // 检查是否必需
    if (!value) {
      if (this.options.required !== false) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_PARAMETER,
          {
            customMessage: this.options.errorMessage || '文件是必需的',
          },
        );
      }
      return undefined;
    }

    // 处理多个文件
    if (Array.isArray(value)) {
      return this.validateFiles(value);
    }

    // 处理单个文件
    return this.validateFile(value);
  }

  /**
   * 验证单个文件
   */
  private validateFile(file: ExpressFile): ExpressFile {
    // 验证文件大小
    if (this.options.maxSize && file.size > this.options.maxSize) {
      throw new BusinessException(
        BusinessErrorCode.FILE_TOO_LARGE,
        {
          customMessage: this.options.errorMessage ||
            `文件大小超出限制 (${this.formatFileSize(this.options.maxSize)})`,
          details: {
            actualSize: file.size,
            maxSize: this.options.maxSize,
          },
        },
      );
    }

    if (this.options.minSize && file.size < this.options.minSize) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        {
          customMessage: this.options.errorMessage ||
            `文件大小不能小于 ${this.formatFileSize(this.options.minSize)}`,
          details: {
            actualSize: file.size,
            minSize: this.options.minSize,
          },
        },
      );
    }

    // 验证 MIME 类型
    if (this.options.allowedMimeTypes?.length) {
      if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_FILE_TYPE,
          {
            customMessage: this.options.errorMessage ||
              `不支持的文件类型：${file.mimetype}`,
            details: {
              mimetype: file.mimetype,
              allowedTypes: this.options.allowedMimeTypes,
            },
          },
        );
      }
    }

    // 验证文件扩展名
    if (this.options.allowedExtensions?.length) {
      const extension = this.getFileExtension(file.originalname).toLowerCase();
      if (!this.options.allowedExtensions.includes(extension)) {
        throw new BusinessException(
          BusinessErrorCode.INVALID_FILE_TYPE,
          {
            customMessage: this.options.errorMessage ||
              `不支持的文件格式：.${extension}`,
            details: {
              extension,
              allowedExtensions: this.options.allowedExtensions,
            },
          },
        );
      }
    }

    return file;
  }

  /**
   * 验证多个文件
   */
  private validateFiles(files: ExpressFile[]): ExpressFile[] {
    // 验证文件数量
    if (this.options.maxFiles && files.length > this.options.maxFiles) {
      throw new BusinessException(
        BusinessErrorCode.INVALID_PARAMETER,
        {
          customMessage: this.options.errorMessage ||
            `最多只能上传 ${this.options.maxFiles} 个文件`,
          details: {
            actualCount: files.length,
            maxFiles: this.options.maxFiles,
          },
        },
      );
    }

    // 验证每个文件
    for (const file of files) {
      this.validateFile(file);
    }

    return files;
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

/**
 * 图片验证管道
 */
@Injectable()
export class ImageValidationPipe extends FileValidationPipe {
  constructor(options: Omit<FileValidationOptions, 'allowedMimeTypes'> = {}) {
    super({
      ...options,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
      ],
    });
  }
}

/**
 * 视频验证管道
 */
@Injectable()
export class VideoValidationPipe extends FileValidationPipe {
  constructor(options: Omit<FileValidationOptions, 'allowedMimeTypes'> = {}) {
    super({
      ...options,
      allowedMimeTypes: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
      ],
    });
  }
}

/**
 * 音频验证管道
 */
@Injectable()
export class AudioValidationPipe extends FileValidationPipe {
  constructor(options: Omit<FileValidationOptions, 'allowedMimeTypes'> = {}) {
    super({
      ...options,
      allowedMimeTypes: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/webm',
        'audio/mp4',
      ],
    });
  }
}

/**
 * PDF 验证管道
 */
@Injectable()
export class PdfValidationPipe extends FileValidationPipe {
  constructor(options: Omit<FileValidationOptions, 'allowedMimeTypes'> = {}) {
    super({
      ...options,
      allowedMimeTypes: ['application/pdf'],
    });
  }
}
