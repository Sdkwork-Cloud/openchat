import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createGzip, createDeflate, brotliCompress, constants } from 'zlib';
import { promisify } from 'util';
import { Readable } from 'stream';

const brotliCompressAsync = promisify(brotliCompress);

export interface CompressionOptions {
  threshold: number;
  level: number;
  memLevel: number;
  strategy: number;
  brotli?: {
    enabled: boolean;
    quality: number;
  };
  filter?: (req: Request, res: Response) => boolean;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  threshold: 1024,
  level: 6,
  memLevel: 8,
  strategy: 0,
  brotli: {
    enabled: true,
    quality: 4,
  },
};

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly options: CompressionOptions;

  constructor(options?: Partial<CompressionOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const acceptEncoding = req.headers['accept-encoding'] || '';

    if (req.method === 'HEAD' || req.method === 'GET' === false) {
      return next();
    }

    if (this.options.filter && !this.options.filter(req, res)) {
      return next();
    }

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    const chunks: Buffer[] = [];
    let size = 0;

    const shouldCompress = (contentType: string): boolean => {
      const compressibleTypes = [
        'text/',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/xhtml+xml',
        'image/svg+xml',
      ];

      return compressibleTypes.some((type) => contentType.includes(type));
    };

    const compress = async (data: Buffer): Promise<Buffer> => {
      const contentType = res.getHeader('Content-Type') as string || '';

      if (!shouldCompress(contentType)) {
        return data;
      }

      if (data.length < this.options.threshold) {
        return data;
      }

      const encoding = this.selectEncoding(acceptEncoding);

      try {
        switch (encoding) {
          case 'br':
            if (this.options.brotli?.enabled) {
              const compressed = await brotliCompressAsync(data, {
                params: {
                  [constants.BROTLI_PARAM_QUALITY]: this.options.brotli.quality,
                },
              });
              res.setHeader('Content-Encoding', 'br');
              return compressed;
            }
            return data;
          case 'gzip': {
            return new Promise((resolve, reject) => {
              const gzip = createGzip({ level: this.options.level });
              const chunks: Buffer[] = [];
              gzip.on('data', (chunk) => chunks.push(chunk));
              gzip.on('end', () => {
                res.setHeader('Content-Encoding', 'gzip');
                resolve(Buffer.concat(chunks));
              });
              gzip.on('error', reject);
              gzip.end(data);
            });
          }
          case 'deflate': {
            return new Promise((resolve, reject) => {
              const deflate = createDeflate({ level: this.options.level });
              const chunks: Buffer[] = [];
              deflate.on('data', (chunk) => chunks.push(chunk));
              deflate.on('end', () => {
                res.setHeader('Content-Encoding', 'deflate');
                resolve(Buffer.concat(chunks));
              });
              deflate.on('error', reject);
              deflate.end(data);
            });
          }
          default:
            return data;
        }
      } catch (error) {
        // 压缩失败时返回原始数据
        return data;
      }
    };

    (res as any).write = function (chunk: any, ...args: any[]): boolean {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buffer);
        size += buffer.length;
      }
      return true;
    };

    (res as any).end = async function (chunk: any, ...args: any[]): Promise<Response> {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buffer);
        size += buffer.length;
      }

      const data = Buffer.concat(chunks);

      try {
        const compressed = await compress(data);

        // 如果压缩后数据更小，使用压缩数据
        if (compressed.length < data.length) {
          res.setHeader('Content-Length', compressed.length.toString());
          res.removeHeader('Transfer-Encoding');
          originalEnd(compressed);
        } else {
          res.setHeader('Content-Length', data.length.toString());
          originalEnd(data);
        }
      } catch (error) {
        // 压缩失败，返回原始数据
        res.setHeader('Content-Length', data.length.toString());
        originalEnd(data);
      }

      return res;
    }.bind(this);

    next();
  }

  private selectEncoding(acceptEncoding: string): string {
    const encodings = acceptEncoding.split(',').map((e) => e.trim().toLowerCase());

    if (this.options.brotli?.enabled && encodings.includes('br')) {
      return 'br';
    }

    if (encodings.includes('gzip')) {
      return 'gzip';
    }

    if (encodings.includes('deflate')) {
      return 'deflate';
    }

    return 'identity';
  }
}

export function createCompressionStream(encoding: string, options?: Partial<CompressionOptions>): any {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  switch (encoding) {
    case 'br':
      // Brotli 流式压缩需要使用特定的参数
      return null; // 暂不实现流式 brotli
    case 'gzip':
      return createGzip({ level: opts.level });
    case 'deflate':
      return createDeflate({ level: opts.level });
    default:
      return new Readable();
  }
}

export const compressionFilter = (req: Request, res: Response): boolean => {
  const contentType = res.getHeader('Content-Type') as string;

  if (!contentType) return true;

  const excludedTypes = [
    'image/',
    'video/',
    'audio/',
    'application/pdf',
    'application/zip',
    'application/x-rar',
    'application/x-7z',
  ];

  return !excludedTypes.some((type) => contentType.includes(type));
};
