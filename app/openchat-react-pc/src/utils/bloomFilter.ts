/**
 * Bloom Filter 实现
 * 
 * 职责：高效的消息去重，空间效率极高的概率型数据结构
 * 应用：消息去重、URL 去重、缓存穿透防护
 * 
 * 特点：
 * - 空间效率：仅需 1/8 的存储空间
 * - 查询时间：O(k)，k 为哈希函数数量
 * - 无假阴性，有可控的假阳性率
 */

/**
 * 位数组实现
 */
class BitArray {
  private bits: Uint8Array;
  private _size: number;

  constructor(size: number) {
    this._size = size;
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  get size(): number {
    return this._size;
  }

  /**
   * 设置位
   */
  set(index: number): void {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    this.bits[byteIndex] |= 1 << bitIndex;
  }

  /**
   * 获取位
   */
  get(index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    return (this.bits[byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * 清空
   */
  clear(): void {
    this.bits.fill(0);
  }

  /**
   * 序列化
   */
  serialize(): string {
    return Array.from(this.bits)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 反序列化
   */
  static deserialize(data: string, size: number): BitArray {
    const bitArray = new BitArray(size);
    const bytes = data.match(/.{2}/g)?.map((hex) => parseInt(hex, 16)) || [];
    bitArray.bits = new Uint8Array(bytes);
    return bitArray;
  }
}

/**
 * 哈希函数族
 */
class HashFunctions {
  private seeds: number[];

  constructor(count: number) {
    // 使用质数作为种子，确保哈希分布均匀
    this.seeds = [
      2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53,
      59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
    ].slice(0, count);
  }

  /**
   * MurmurHash3 实现
   */
  murmurHash3(key: string, seed: number): number {
    let h1 = seed;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const r1 = 15;
    const r2 = 13;
    const m = 5;
    const n = 0xe6546b64;

    let i = 0;
    const len = key.length;

    // 处理 4 字节块
    while (i + 4 <= len) {
      let k1 =
        (key.charCodeAt(i) & 0xff) |
        ((key.charCodeAt(i + 1) & 0xff) << 8) |
        ((key.charCodeAt(i + 2) & 0xff) << 16) |
        ((key.charCodeAt(i + 3) & 0xff) << 24);

      k1 = Math.imul(k1, c1);
      k1 = (k1 << r1) | (k1 >>> (32 - r1));
      k1 = Math.imul(k1, c2);

      h1 ^= k1;
      h1 = (h1 << r2) | (h1 >>> (32 - r2));
      h1 = Math.imul(h1, m) + n;

      i += 4;
    }

    // 处理剩余字节
    let k1 = 0;
    const remaining = len - i;
    if (remaining >= 3) {
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    }
    if (remaining >= 2) {
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    }
    if (remaining >= 1) {
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << r1) | (k1 >>> (32 - r1));
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
    }

    // 最终化
    h1 ^= len;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0; // 转为无符号 32 位整数
  }

  /**
   * 计算所有哈希值
   */
  hash(key: string, bitSize: number): number[] {
    return this.seeds.map((seed) => this.murmurHash3(key, seed) % bitSize);
  }
}

/**
 * Bloom Filter 配置
 */
interface BloomFilterOptions {
  expectedItems?: number;    // 预期元素数量
  falsePositiveRate?: number; // 可接受的假阳性率
}

/**
 * Bloom Filter 类
 */
export class BloomFilter {
  private bitArray: BitArray;
  private hashFunctions: HashFunctions;
  private bitSize: number;
  private hashCount: number;
  private itemCount = 0;

  constructor(options: BloomFilterOptions = {}) {
    const { expectedItems = 10000, falsePositiveRate = 0.01 } = options;

    // 计算最优参数
    // m = -n * ln(p) / (ln(2)^2)
    this.bitSize = Math.ceil(
      -(expectedItems * Math.log(falsePositiveRate)) / Math.pow(Math.log(2), 2)
    );

    // k = m/n * ln(2)
    this.hashCount = Math.ceil((this.bitSize / expectedItems) * Math.log(2));

    this.bitArray = new BitArray(this.bitSize);
    this.hashFunctions = new HashFunctions(this.hashCount);

    console.log(
      `[BloomFilter] Created with ${this.bitSize} bits, ${this.hashCount} hash functions, ~${(
        this.bitSize / 8 / 1024
      ).toFixed(2)}KB`
    );
  }

  /**
   * 添加元素
   */
  add(key: string): void {
    const indices = this.hashFunctions.hash(key, this.bitSize);
    indices.forEach((index) => this.bitArray.set(index));
    this.itemCount++;
  }

  /**
   * 检查元素可能存在（可能有假阳性）
   */
  mightContain(key: string): boolean {
    const indices = this.hashFunctions.hash(key, this.bitSize);
    return indices.every((index) => this.bitArray.get(index));
  }

  /**
   * 检查元素一定不存在（无假阴性）
   */
  definitelyNotContains(key: string): boolean {
    return !this.mightContain(key);
  }

  /**
   * 获取当前假阳性率
   */
  getFalsePositiveRate(): number {
    return Math.pow(1 - Math.exp(-this.hashCount * this.itemCount / this.bitSize), this.hashCount);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      bitSize: this.bitSize,
      hashCount: this.hashCount,
      itemCount: this.itemCount,
      memoryUsage: this.bitSize / 8, // bytes
      falsePositiveRate: this.getFalsePositiveRate(),
    };
  }

  /**
   * 清空
   */
  clear(): void {
    this.bitArray.clear();
    this.itemCount = 0;
  }

  /**
   * 序列化
   */
  serialize(): string {
    return JSON.stringify({
      bitSize: this.bitSize,
      hashCount: this.hashCount,
      itemCount: this.itemCount,
      bits: this.bitArray.serialize(),
    });
  }

  /**
   * 反序列化
   */
  static deserialize(data: string): BloomFilter {
    const parsed = JSON.parse(data);
    const filter = new BloomFilter({
      expectedItems: parsed.itemCount,
    });
    filter.bitArray = BitArray.deserialize(parsed.bits, parsed.bitSize);
    filter.itemCount = parsed.itemCount;
    return filter;
  }
}

/**
 * 计数 Bloom Filter（支持删除）
 */
export class CountingBloomFilter {
  private counters: Int8Array;
  private hashFunctions: HashFunctions;
  private bitSize: number;
  private hashCount: number;
  private itemCount = 0;

  constructor(options: BloomFilterOptions = {}) {
    const { expectedItems = 10000, falsePositiveRate = 0.01 } = options;

    this.bitSize = Math.ceil(
      -(expectedItems * Math.log(falsePositiveRate)) / Math.pow(Math.log(2), 2)
    );
    this.hashCount = Math.ceil((this.bitSize / expectedItems) * Math.log(2));

    this.counters = new Int8Array(this.bitSize);
    this.hashFunctions = new HashFunctions(this.hashCount);
  }

  /**
   * 添加元素
   */
  add(key: string): void {
    const indices = this.hashFunctions.hash(key, this.bitSize);
    indices.forEach((index) => {
      if (this.counters[index] < 127) {
        this.counters[index]++;
      }
    });
    this.itemCount++;
  }

  /**
   * 删除元素
   */
  remove(key: string): void {
    const indices = this.hashFunctions.hash(key, this.bitSize);
    indices.forEach((index) => {
      if (this.counters[index] > 0) {
        this.counters[index]--;
      }
    });
    this.itemCount--;
  }

  /**
   * 检查元素可能存在
   */
  mightContain(key: string): boolean {
    const indices = this.hashFunctions.hash(key, this.bitSize);
    return indices.every((index) => this.counters[index] > 0);
  }

  /**
   * 清空
   */
  clear(): void {
    this.counters.fill(0);
    this.itemCount = 0;
  }
}

/**
 * 分层 Bloom Filter（支持时间窗口）
 */
export class SlidingWindowBloomFilter {
  private filters: BloomFilter[];
  private windowSize: number;
  private currentIndex = 0;

  constructor(
    windows: number,
    options: BloomFilterOptions = {}
  ) {
    this.windowSize = windows;
    this.filters = Array(windows)
      .fill(null)
      .map(() => new BloomFilter(options));
  }

  /**
   * 添加元素到当前窗口
   */
  add(key: string): void {
    this.filters[this.currentIndex].add(key);
  }

  /**
   * 检查元素可能存在于任何窗口
   */
  mightContain(key: string): boolean {
    return this.filters.some((filter) => filter.mightContain(key));
  }

  /**
   * 滑动窗口
   */
  slide(): void {
    this.currentIndex = (this.currentIndex + 1) % this.windowSize;
    this.filters[this.currentIndex].clear();
  }

  /**
   * 获取所有窗口统计
   */
  getStats() {
    return this.filters.map((filter, index) => ({
      window: index,
      ...filter.getStats(),
    }));
  }
}

// 全局 Bloom Filter 实例
let messageBloomFilter: BloomFilter | null = null;

/**
 * 获取消息去重 Bloom Filter
 */
export function getMessageBloomFilter(): BloomFilter {
  if (!messageBloomFilter) {
    messageBloomFilter = new BloomFilter({
      expectedItems: 100000,
      falsePositiveRate: 0.001,
    });
  }
  return messageBloomFilter;
}

/**
 * 检查消息是否重复
 */
export function isDuplicateMessage(messageId: string): boolean {
  const filter = getMessageBloomFilter();
  
  if (filter.mightContain(messageId)) {
    return true;
  }
  
  filter.add(messageId);
  return false;
}

/**
 * 重置 Bloom Filter
 */
export function resetMessageBloomFilter(): void {
  messageBloomFilter = null;
}
