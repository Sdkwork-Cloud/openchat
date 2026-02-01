/**
 * 零拷贝数据传输实现
 * 
 * 职责：避免不必要的数据复制，提升大数据传输性能
 * 应用：大文件传输、消息序列化、图片处理
 * 
 * 技术：
 * - Transferable Objects
 * - SharedArrayBuffer
 * - ArrayBuffer views
 */

/**
 * 可传输数据接口
 */
export interface TransferableData<T> {
  data: T;
  transferables: Transferable[];
}

/**
 * 创建可传输的 ArrayBuffer
 */
export function createTransferableBuffer(
  source: ArrayBuffer | Uint8Array
): TransferableData<ArrayBuffer> {
  if (source instanceof Uint8Array) {
    return {
      data: source.buffer,
      transferables: [source.buffer],
    };
  }
  return {
    data: source,
    transferables: [source],
  };
}

/**
 * 字符串转 ArrayBuffer（零拷贝视图）
 */
export function stringToBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * ArrayBuffer 转字符串（零拷贝视图）
 */
export function bufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

/**
 * 创建共享内存（SharedArrayBuffer）
 */
export function createSharedBuffer(size: number): SharedArrayBuffer {
  return new SharedArrayBuffer(size);
}

/**
 * 零拷贝消息队列
 */
export class ZeroCopyMessageQueue<T> {
  private queue: Array<{ data: T; transferables: Transferable[] }> = [];
  private sharedBuffer?: SharedArrayBuffer;
  private dataView?: DataView;

  constructor(sharedBufferSize?: number) {
    if (sharedBufferSize && typeof SharedArrayBuffer !== 'undefined') {
      this.sharedBuffer = new SharedArrayBuffer(sharedBufferSize);
      this.dataView = new DataView(this.sharedBuffer);
    }
  }

  /**
   * 入队（零拷贝）
   */
  enqueue(data: T, transferables: Transferable[] = []): void {
    this.queue.push({ data, transferables });
  }

  /**
   * 出队
   */
  dequeue(): { data: T; transferables: Transferable[] } | undefined {
    return this.queue.shift();
  }

  /**
   * 批量出队（一次性转移所有权）
   */
  dequeueAll(): { data: T; transferables: Transferable[] }[] {
    const items = [...this.queue];
    this.queue = [];
    return items;
  }

  /**
   * 写入共享内存
   */
  writeToSharedBuffer(data: ArrayBuffer, offset: number = 0): boolean {
    if (!this.sharedBuffer || !this.dataView) return false;

    const source = new Uint8Array(data);
    const target = new Uint8Array(this.sharedBuffer, offset, source.length);
    target.set(source);

    return true;
  }

  /**
   * 从共享内存读取
   */
  readFromSharedBuffer(offset: number, length: number): ArrayBuffer | null {
    if (!this.sharedBuffer) return null;

    const source = new Uint8Array(this.sharedBuffer, offset, length);
    const result = new ArrayBuffer(length);
    new Uint8Array(result).set(source);

    return result;
  }

  /**
   * 获取队列长度
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * 零拷贝文件读取器
 */
export class ZeroCopyFileReader {
  private file: File;
  private chunkSize: number;

  constructor(file: File, chunkSize: number = 1024 * 1024) {
    this.file = file;
    this.chunkSize = chunkSize;
  }

  /**
   * 分块读取文件（零拷贝）
   */
  async *readChunks(): AsyncGenerator<TransferableData<ArrayBuffer>, void, unknown> {
    let offset = 0;

    while (offset < this.file.size) {
      const chunk = await this.file.slice(offset, offset + this.chunkSize).arrayBuffer();
      
      yield {
        data: chunk,
        transferables: [chunk],
      };

      offset += this.chunkSize;
    }
  }

  /**
   * 读取整个文件
   */
  async readAll(): Promise<TransferableData<ArrayBuffer>> {
    const buffer = await this.file.arrayBuffer();
    return {
      data: buffer,
      transferables: [buffer],
    };
  }
}

/**
 * 零拷贝图片处理器
 */
export class ZeroCopyImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: ImageBitmapRenderingContext;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('bitmaprenderer')!;
  }

  /**
   * 处理图片（零拷贝）
   */
  async processImage(
    imageBuffer: ArrayBuffer,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      type?: string;
    } = {}
  ): Promise<Blob> {
    const { width, height, quality = 0.9, type = 'image/jpeg' } = options;

    // 创建 ImageBitmap（零拷贝）
    const blob = new Blob([imageBuffer]);
    const imageBitmap = await createImageBitmap(blob);

    // 设置 canvas 尺寸
    this.canvas.width = width || imageBitmap.width;
    this.canvas.height = height || imageBitmap.height;

    // 绘制（零拷贝渲染）
    this.ctx.transferFromImageBitmap(imageBitmap);

    // 导出
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * 创建缩略图
   */
  async createThumbnail(
    imageBuffer: ArrayBuffer,
    maxSize: number = 200
  ): Promise<Blob> {
    const blob = new Blob([imageBuffer]);
    const imageBitmap = await createImageBitmap(blob);

    const { width, height } = imageBitmap;
    const ratio = Math.min(maxSize / width, maxSize / height);

    return this.processImage(imageBuffer, {
      width: Math.floor(width * ratio),
      height: Math.floor(height * ratio),
      quality: 0.8,
      type: 'image/jpeg',
    });
  }
}

/**
 * 使用 OffscreenCanvas 进行零拷贝渲染
 */
export function useOffscreenCanvas() {
  let offscreenCanvas: OffscreenCanvas | null = null;
  let worker: Worker | null = null;

  const init = (width: number, height: number) => {
    offscreenCanvas = new OffscreenCanvas(width, height);
    
    // 创建 Worker 进行后台渲染
    worker = new Worker(
      URL.createObjectURL(
        new Blob(
          [`
            self.onmessage = function(e) {
              const { canvas, data } = e.data;
              const ctx = canvas.getContext('2d');
              // 渲染逻辑
              ctx.fillStyle = data.color;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              self.postMessage({ done: true }, [canvas]);
            };
          `],
          { type: 'application/javascript' }
        )
      )
    );

    return offscreenCanvas;
  };

  const render = (data: unknown) => {
    if (!offscreenCanvas || !worker) return;

    // 转移 canvas 控制权到 worker
    worker.postMessage(
      { canvas: offscreenCanvas, data },
      [offscreenCanvas]
    );
  };

  const destroy = () => {
    worker?.terminate();
    worker = null;
    offscreenCanvas = null;
  };

  return { init, render, destroy };
}

/**
 * 检测零拷贝支持
 */
export function checkZeroCopySupport() {
  return {
    transferableObjects: typeof structuredClone === 'function',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    imageBitmap: typeof ImageBitmap !== 'undefined',
    arrayBufferTransfer: true, // 基础支持
  };
}

export default {
  createTransferableBuffer,
  stringToBuffer,
  bufferToString,
  createSharedBuffer,
  ZeroCopyMessageQueue,
  ZeroCopyFileReader,
  ZeroCopyImageProcessor,
  checkZeroCopySupport,
};
