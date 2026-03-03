/**
 * Bloom Filter 瀹炵幇
 * 
 * 鑱岃矗锛氶珮鏁堢殑娑堟伅鍘婚噸锛岀┖闂存晥鐜囨瀬楂樼殑姒傜巼鍨嬫暟鎹粨鏋? * 搴旂敤锛氭秷鎭幓閲嶃€乁RL 鍘婚噸銆佺紦瀛樼┛閫忛槻鎶? * 
 * 鐗圭偣锛? * - 绌洪棿鏁堢巼锛氫粎闇€ 1/8 鐨勫瓨鍌ㄧ┖闂? * - 鏌ヨ鏃堕棿锛歄(k)锛宬 涓哄搱甯屽嚱鏁版暟閲? * - 鏃犲亣闃存€э紝鏈夊彲鎺х殑鍋囬槼鎬х巼
 */

/**
 * 浣嶆暟缁勫疄鐜? */
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
   * 璁剧疆浣?   */
  set(index: number): void {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    this.bits[byteIndex] |= 1 << bitIndex;
  }

  /**
   * 鑾峰彇浣?   */
  get(index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    return (this.bits[byteIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * 娓呯┖
   */
  clear(): void {
    this.bits.fill(0);
  }

  /**
   * 搴忓垪鍖?   */
  serialize(): string {
    return Array.from(this.bits)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 鍙嶅簭鍒楀寲
   */
  static deserialize(data: string, size: number): BitArray {
    const bitArray = new BitArray(size);
    const bytes = data.match(/.{2}/g)?.map((hex) => parseInt(hex, 16)) || [];
    bitArray.bits = new Uint8Array(bytes);
    return bitArray;
  }
}

/**
 * 鍝堝笇鍑芥暟鏃? */
class HashFunctions {
  private seeds: number[];

  constructor(count: number) {
    // 浣跨敤璐ㄦ暟浣滀负绉嶅瓙锛岀‘淇濆搱甯屽垎甯冨潎鍖€
    this.seeds = [
      2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53,
      59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
    ].slice(0, count);
  }

  /**
   * MurmurHash3 瀹炵幇
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

    // 澶勭悊 4 瀛楄妭鍧?    while (i + 4 <= len) {
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

    // 澶勭悊鍓╀綑瀛楄妭
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

    // 鏈€缁堝寲
    h1 ^= len;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0; // 杞负鏃犵鍙?32 浣嶆暣鏁?  }

  /**
   * 璁＄畻鎵€鏈夊搱甯屽€?   */
  hash(key: string, bitSize: number): number[] {
    return this.seeds.map((seed) => this.murmurHash3(key, seed) % bitSize);
  }
}

/**
 * Bloom Filter 閰嶇疆
 */
interface BloomFilterOptions {
  expectedItems?: number;    // 棰勬湡鍏冪礌鏁伴噺
  falsePositiveRate?: number; // 鍙帴鍙楃殑鍋囬槼鎬х巼
}

/**
 * Bloom Filter 绫? */
export class BloomFilter {
  private bitArray: BitArray;
  private hashFunctions: HashFunctions;
  private bitSize: number;
  private hashCount: number;
  private itemCount = 0;

  constructor(options: BloomFilterOptions = {}) {
    const { expectedItems = 10000, falsePositiveRate = 0.01 } = options;

    // 璁＄畻鏈€浼樺弬鏁?    // m = -n * ln(p) / (ln(2)^2)
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
   * 娣诲姞鍏冪礌
   */
  add(key: string): void {
    const indices = this.hashFunctions.hash(key, this.bitSize);
    indices.forEach((index) => this.bitArray.set(index));
    this.itemCount++;
  }

  /**
   * 妫€鏌ュ厓绱犲彲鑳藉瓨鍦紙鍙兘鏈夊亣闃虫€э級
   */
  mightContain(key: string): boolean {
    const indices = this.hashFunctions.hash(key, this.bitSize);
    return indices.every((index) => this.bitArray.get(index));
  }

  /**
   * 妫€鏌ュ厓绱犱竴瀹氫笉瀛樺湪锛堟棤鍋囬槾鎬э級
   */
  definitelyNotContains(key: string): boolean {
    return !this.mightContain(key);
  }

  /**
   * 鑾峰彇褰撳墠鍋囬槼鎬х巼
   */
  getFalsePositiveRate(): number {
    return Math.pow(1 - Math.exp(-this.hashCount * this.itemCount / this.bitSize), this.hashCount);
  }

  /**
   * 鑾峰彇缁熻淇℃伅
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
   * 娓呯┖
   */
  clear(): void {
    this.bitArray.clear();
    this.itemCount = 0;
  }

  /**
   * 搴忓垪鍖?   */
  serialize(): string {
    return JSON.stringify({
      bitSize: this.bitSize,
      hashCount: this.hashCount,
      itemCount: this.itemCount,
      bits: this.bitArray.serialize(),
    });
  }

  /**
   * 鍙嶅簭鍒楀寲
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
 * 璁℃暟 Bloom Filter锛堟敮鎸佸垹闄わ級
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
   * 娣诲姞鍏冪礌
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
   * 鍒犻櫎鍏冪礌
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
   * 妫€鏌ュ厓绱犲彲鑳藉瓨鍦?   */
  mightContain(key: string): boolean {
    const indices = this.hashFunctions.hash(key, this.bitSize);
    return indices.every((index) => this.counters[index] > 0);
  }

  /**
   * 娓呯┖
   */
  clear(): void {
    this.counters.fill(0);
    this.itemCount = 0;
  }
}

/**
 * 鍒嗗眰 Bloom Filter锛堟敮鎸佹椂闂寸獥鍙ｏ級
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
   * 娣诲姞鍏冪礌鍒板綋鍓嶇獥鍙?   */
  add(key: string): void {
    this.filters[this.currentIndex].add(key);
  }

  /**
   * 妫€鏌ュ厓绱犲彲鑳藉瓨鍦ㄤ簬浠讳綍绐楀彛
   */
  mightContain(key: string): boolean {
    return this.filters.some((filter) => filter.mightContain(key));
  }

  /**
   * 婊戝姩绐楀彛
   */
  slide(): void {
    this.currentIndex = (this.currentIndex + 1) % this.windowSize;
    this.filters[this.currentIndex].clear();
  }

  /**
   * 鑾峰彇鎵€鏈夌獥鍙ｇ粺璁?   */
  getStats() {
    return this.filters.map((filter, index) => ({
      window: index,
      ...filter.getStats(),
    }));
  }
}

// 鍏ㄥ眬 Bloom Filter 瀹炰緥
let messageBloomFilter: BloomFilter | null = null;

/**
 * 鑾峰彇娑堟伅鍘婚噸 Bloom Filter
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
 * 妫€鏌ユ秷鎭槸鍚﹂噸澶? */
export function isDuplicateMessage(messageId: string): boolean {
  const filter = getMessageBloomFilter();
  
  if (filter.mightContain(messageId)) {
    return true;
  }
  
  filter.add(messageId);
  return false;
}

/**
 * 閲嶇疆 Bloom Filter
 */
export function resetMessageBloomFilter(): void {
  messageBloomFilter = null;
}

