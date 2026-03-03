/**
 * 闆舵嫹璐濇暟鎹紶杈撳疄鐜? * 
 * 鑱岃矗锛氶伩鍏嶄笉蹇呰鐨勬暟鎹鍒讹紝鎻愬崌澶ф暟鎹紶杈撴€ц兘
 * 搴旂敤锛氬ぇ鏂囦欢浼犺緭銆佹秷鎭簭鍒楀寲銆佸浘鐗囧鐞? * 
 * 鎶€鏈細
 * - Transferable Objects
 * - SharedArrayBuffer
 * - ArrayBuffer views
 */

/**
 * 鍙紶杈撴暟鎹帴鍙? */
export interface TransferableData<T> {
  data: T;
  transferables: Transferable[];
}

/**
 * 鍒涘缓鍙紶杈撶殑 ArrayBuffer
 */
export function createTransferableBuffer(
  source: ArrayBuffer | Uint8Array
): TransferableData<ArrayBuffer> {
  if (source instanceof Uint8Array) {
    const buffer = source.buffer as ArrayBuffer;
    return {
      data: buffer,
      transferables: [buffer],
    };
  }
  return {
    data: source,
    transferables: [source],
  };
}

/**
 * 瀛楃涓茶浆 ArrayBuffer锛堥浂鎷疯礉瑙嗗浘锛? */
export function stringToBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * ArrayBuffer 杞瓧绗︿覆锛堥浂鎷疯礉瑙嗗浘锛? */
export function bufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

/**
 * 鍒涘缓鍏变韩鍐呭瓨锛圫haredArrayBuffer锛? */
export function createSharedBuffer(size: number): SharedArrayBuffer {
  return new SharedArrayBuffer(size);
}

/**
 * 闆舵嫹璐濇秷鎭槦鍒? */
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
   * 鍏ラ槦锛堥浂鎷疯礉锛?   */
  enqueue(data: T, transferables: Transferable[] = []): void {
    this.queue.push({ data, transferables });
  }

  /**
   * 鍑洪槦
   */
  dequeue(): { data: T; transferables: Transferable[] } | undefined {
    return this.queue.shift();
  }

  /**
   * 鎵归噺鍑洪槦锛堜竴娆℃€ц浆绉绘墍鏈夋潈锛?   */
  dequeueAll(): { data: T; transferables: Transferable[] }[] {
    const items = [...this.queue];
    this.queue = [];
    return items;
  }

  /**
   * 鍐欏叆鍏变韩鍐呭瓨
   */
  writeToSharedBuffer(data: ArrayBuffer, offset: number = 0): boolean {
    if (!this.sharedBuffer || !this.dataView) return false;

    const source = new Uint8Array(data);
    const target = new Uint8Array(this.sharedBuffer, offset, source.length);
    target.set(source);

    return true;
  }

  /**
   * 浠庡叡浜唴瀛樿鍙?   */
  readFromSharedBuffer(offset: number, length: number): ArrayBuffer | null {
    if (!this.sharedBuffer) return null;

    const source = new Uint8Array(this.sharedBuffer, offset, length);
    const result = new ArrayBuffer(length);
    new Uint8Array(result).set(source);

    return result;
  }

  /**
   * 鑾峰彇闃熷垪闀垮害
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * 娓呯┖闃熷垪
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * 闆舵嫹璐濇枃浠惰鍙栧櫒
 */
export class ZeroCopyFileReader {
  private file: File;
  private chunkSize: number;

  constructor(file: File, chunkSize: number = 1024 * 1024) {
    this.file = file;
    this.chunkSize = chunkSize;
  }

  /**
   * 鍒嗗潡璇诲彇鏂囦欢锛堥浂鎷疯礉锛?   */
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
   * 璇诲彇鏁翠釜鏂囦欢
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
 * 闆舵嫹璐濆浘鐗囧鐞嗗櫒
 */
export class ZeroCopyImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: ImageBitmapRenderingContext;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('bitmaprenderer')!;
  }

  /**
   * 澶勭悊鍥剧墖锛堥浂鎷疯礉锛?   */
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

    // 鍒涘缓 ImageBitmap锛堥浂鎷疯礉锛?    const blob = new Blob([imageBuffer]);
    const imageBitmap = await createImageBitmap(blob);

    // 璁剧疆 canvas 灏哄
    this.canvas.width = width || imageBitmap.width;
    this.canvas.height = height || imageBitmap.height;

    // 缁樺埗锛堥浂鎷疯礉娓叉煋锛?    this.ctx.transferFromImageBitmap(imageBitmap);

    // 瀵煎嚭
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
   * 鍒涘缓缂╃暐鍥?   */
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
 * 浣跨敤 OffscreenCanvas 杩涜闆舵嫹璐濇覆鏌? */
export function useOffscreenCanvas() {
  let offscreenCanvas: OffscreenCanvas | null = null;
  let worker: Worker | null = null;

  const init = (width: number, height: number) => {
    offscreenCanvas = new OffscreenCanvas(width, height);
    
    // 鍒涘缓 Worker 杩涜鍚庡彴娓叉煋
    worker = new Worker(
      URL.createObjectURL(
        new Blob(
          [`
            self.onmessage = function(e) {
              const { canvas, data } = e.data;
              const ctx = canvas.getContext('2d');
              // 娓叉煋閫昏緫
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

    // 杞Щ canvas 鎺у埗鏉冨埌 worker
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
 * 妫€娴嬮浂鎷疯礉鏀寔
 */
export function checkZeroCopySupport() {
  return {
    transferableObjects: typeof structuredClone === 'function',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    imageBitmap: typeof ImageBitmap !== 'undefined',
    arrayBufferTransfer: true, // 鍩虹鏀寔
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

