/**
 * ARC (Adaptive Replacement Cache) 绠楁硶瀹炵幇
 * 
 * 鑷€傚簲鏇挎崲缂撳瓨鏄竴绉嶆櫤鑳界紦瀛樼畻娉曪紝瀹冮€氳繃骞宠　鏈€杩戜娇鐢?LRU)鍜屾渶甯镐娇鐢?LFU)绛栫暐
 * 鏉ヨ嚜鍔ㄨ皟鏁寸紦瀛樺ぇ灏忥紝浠ラ€傚簲涓嶅悓鐨勮闂ā寮忋€? */

export interface ARCCacheOptions<K, V> {
  capacity: number;
  onEvict?: (key: K, value: V) => void;
  sizeFunction?: (value: V) => number;
}

export class ARCCache<K, V> {
  private _capacity: number;
  private onEvict?: (key: K, value: V) => void;
  private sizeFunction?: (value: V) => number;
  
  // 缂撳瓨缁撴瀯
  private t1: Map<K, V> = new Map(); // 鏈€杩戜娇鐢ㄧ殑椤圭洰
  private t2: Map<K, V> = new Map(); // 棰戠箒浣跨敤鐨勯」鐩?  private b1: Set<K> = new Set(); // 鏈€杩戦┍閫愮殑椤圭洰
  private b2: Set<K> = new Set(); // 棰戠箒椹遍€愮殑椤圭洰
  
  // 缂撳瓨澶у皬
  private p: number = 0; // 鐩爣T1澶у皬
  private n: number = 0; // 鎬荤紦瀛樺ぇ灏?  
  // 缁熻淇℃伅
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(options: ARCCacheOptions<K, V>) {
    this._capacity = options.capacity;
    this.onEvict = options.onEvict;
    this.sizeFunction = options.sizeFunction || (() => 1);
  }

  /**
   * 鑾峰彇缂撳瓨涓殑鍊?   */
  get(key: K): V | undefined {
    // 妫€鏌1
    if (this.t1.has(key)) {
      // 缂撳瓨鍛戒腑锛岀Щ鍔ㄥ埌T2
      const value = this.t1.get(key)!;
      this.t1.delete(key);
      this.t2.set(key, value);
      this.hits++;
      return value;
    }

    // 妫€鏌2
    if (this.t2.has(key)) {
      // 缂撳瓨鍛戒腑锛屼繚鎸佸湪T2
      this.hits++;
      return this.t2.get(key);
    }

    // 缂撳瓨鏈懡涓?    this.misses++;
    return undefined;
  }

  /**
   * 璁剧疆缂撳瓨鍊?   */
  set(key: K, value: V): void {
    const size = this.sizeFunction!(value);
    
    // 濡傛灉椤圭洰宸插湪T1鎴朤2涓紝鍏堝垹闄?    if (this.t1.has(key)) {
      this.t1.delete(key);
    } else if (this.t2.has(key)) {
      this.t2.delete(key);
    }

    // 妫€鏌1
    if (this.b1.has(key)) {
      // 璋冩暣p
      const delta = Math.max(1, Math.floor(this.b1.size / this.b2.size)) || 1;
      this.p = Math.min(this.p + delta, this._capacity);
      
      // 椹遍€愰」鐩?      this.replace();
      
      // 浠嶣1涓垹闄ゅ苟娣诲姞鍒癟2
      this.b1.delete(key);
      this.t2.set(key, value);
      this.n += size;
      return;
    }

    // 妫€鏌2
    if (this.b2.has(key)) {
      // 璋冩暣p
      const delta = Math.max(1, Math.floor(this.b2.size / this.b1.size)) || 1;
      this.p = Math.max(this.p - delta, 0);
      
      // 椹遍€愰」鐩?      this.replace();
      
      // 浠嶣2涓垹闄ゅ苟娣诲姞鍒癟2
      this.b2.delete(key);
      this.t2.set(key, value);
      this.n += size;
      return;
    }

    // 鏂伴」鐩?    if (this.t1.size + this.b1.size === this._capacity) {
      if (this.t1.size < this._capacity) {
        // 椹遍€怋1涓殑椤圭洰
        this.b1.delete(this.getOldest(this.b1));
        this.replace();
      } else {
        // 椹遍€怲1涓殑椤圭洰
        const evictedKey = this.getOldest(this.t1);
        const evictedValue = this.t1.get(evictedKey)!;
        this.t1.delete(evictedKey);
        this.evict(evictedKey, evictedValue);
      }
    } else if (this.t1.size + this.t2.size + this.b1.size + this.b2.size >= this._capacity) {
      // 椹遍€愰」鐩?      if (this.t1.size + this.b1.size === this._capacity) {
        // 椹遍€怋1涓殑椤圭洰
        this.b1.delete(this.getOldest(this.b1));
      } else {
        // 椹遍€怋2涓殑椤圭洰
        this.b2.delete(this.getOldest(this.b2));
      }
      this.replace();
    }

    // 娣诲姞鍒癟1
    this.t1.set(key, value);
    this.n += size;
  }

  /**
   * 鍒犻櫎缂撳瓨鍊?   */
  delete(key: K): boolean {
    let removed = false;
    let value: V | undefined;

    if (this.t1.has(key)) {
      value = this.t1.get(key);
      this.t1.delete(key);
      removed = true;
    } else if (this.t2.has(key)) {
      value = this.t2.get(key);
      this.t2.delete(key);
      removed = true;
    } else if (this.b1.has(key)) {
      this.b1.delete(key);
      removed = true;
    } else if (this.b2.has(key)) {
      this.b2.delete(key);
      removed = true;
    }

    if (removed && value && this.onEvict) {
      this.onEvict(key, value);
    }

    return removed;
  }

  /**
   * 娓呴櫎鎵€鏈夌紦瀛?   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, value] of this.t1) {
        this.onEvict(key, value);
      }
      for (const [key, value] of this.t2) {
        this.onEvict(key, value);
      }
    }

    this.t1.clear();
    this.t2.clear();
    this.b1.clear();
    this.b2.clear();
    this.p = 0;
    this.n = 0;
  }

  /**
   * 妫€鏌ョ紦瀛樻槸鍚﹀寘鍚敭
   */
  has(key: K): boolean {
    return this.t1.has(key) || this.t2.has(key);
  }

  /**
   * 鑾峰彇缂撳瓨澶у皬
   */
  get size(): number {
    return this.t1.size + this.t2.size;
  }

  /**
   * 鑾峰彇缂撳瓨瀹归噺
   */
  get capacity(): number {
    return this._capacity;
  }

  /**
   * 鑾峰彇缂撳瓨缁熻淇℃伅
   */
  get stats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      evictions: this.evictions,
      size: this.size,
      capacity: this.capacity,
      t1Size: this.t1.size,
      t2Size: this.t2.size,
      b1Size: this.b1.size,
      b2Size: this.b2.size,
      p: this.p
    };
  }

  /**
   * 鏇挎崲绛栫暐瀹炵幇
   */
  private replace(): void {
    if (this.t1.size > 0 && (this.t1.size > this.p || (this.t1.size === this.p && this.b2.has(this.getOldest(this.t1))))) {
      // 浠嶵1涓┍閫?      const evictedKey = this.getOldest(this.t1);
      const evictedValue = this.t1.get(evictedKey)!;
      this.t1.delete(evictedKey);
      this.b1.add(evictedKey);
      this.evict(evictedKey, evictedValue);
    } else if (this.t2.size > 0) {
      // 浠嶵2涓┍閫?      const evictedKey = this.getOldest(this.t2);
      const evictedValue = this.t2.get(evictedKey)!;
      this.t2.delete(evictedKey);
      this.b2.add(evictedKey);
      this.evict(evictedKey, evictedValue);
    }
  }

  /**
   * 澶勭悊椹遍€?   */
  private evict(key: K, value: V): void {
    this.evictions++;
    this.n -= this.sizeFunction!(value);
    if (this.onEvict) {
      this.onEvict(key, value);
    }
  }

  /**
   * 鑾峰彇闆嗗悎涓渶鏃х殑鍏冪礌
   */
  private getOldest(collection: Map<K, V> | Set<K>): K {
    const result = collection.keys().next().value;
    return result as K;
  }
}

export default ARCCache;

