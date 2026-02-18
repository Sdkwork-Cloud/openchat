import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createGzip, createDeflate, createBrotliCompress, brotliCompress } from 'zlib';
import { Readable } from 'stream';

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

    const compress = (data: Buffer, callback: (err: Error | null, result: Buffer) => void): void => {
      const contentType = res.getHeader('Content-Type') as string || '';

      if (!shouldCompress(contentType)) {
        return callback(null, data);
      }

      if (data.length < this.options.threshold) {
        return callback(null, data);
      }

      const encoding = this.selectEncoding(acceptEncoding);

      switch (encoding) {
        case 'br':
          if (this.options.brotli?.enabled) {
            brotliCompress(data, callback);
          } else {
            callback(null, data);
          }
          break;
        case 'gzip':
          createGzip({ level: this.options.level }).end(data, () => {
            callback(null, data);
          });
          break;
        case 'deflate':
          createDeflate({ level: this.options.level }).end(data, () => {
            callback(null, data);
          });
          break;
        default:
          callback(null, data);
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

    (res as any).end = function (chunk: any, ...args: any[]): Response {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buffer);
        size += buffer.length;
      }

      const data = Buffer.concat(chunks);

      compress(data, (err, compressed) => {
        if (err) {
          res.setHeader('Content-Length', data.length.toString());
          originalEnd(data);
          return;
        }

        if (compressed.length < data.length) {
          const encoding = this.selectEncoding(acceptEncoding);
          res.setHeader('Content-Encoding', encoding);
          res.setHeader('Content-Length', compressed.length.toString());
          res.removeHeader('Transfer-Encoding');
          originalEnd(compressed);
        } else {
          res.setHeader('Content-Length', data.length.toString());
          originalEnd(data);
        }
      });

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
      return createBrotliCompress();
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
