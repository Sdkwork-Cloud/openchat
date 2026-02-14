/**
 * ARC (Adaptive Replacement Cache) 算法实现
 * 
 * 自适应替换缓存是一种智能缓存算法，它通过平衡最近使用(LRU)和最常使用(LFU)策略
 * 来自动调整缓存大小，以适应不同的访问模式。
 */

export interface ARCCacheOptions<K, V> {
  capacity: number;
  onEvict?: (key: K, value: V) => void;
  sizeFunction?: (value: V) => number;
}

export class ARCCache<K, V> {
  private _capacity: number;
  private onEvict?: (key: K, value: V) => void;
  private sizeFunction?: (value: V) => number;
  
  // 缓存结构
  private t1: Map<K, V> = new Map(); // 最近使用的项目
  private t2: Map<K, V> = new Map(); // 频繁使用的项目
  private b1: Set<K> = new Set(); // 最近驱逐的项目
  private b2: Set<K> = new Set(); // 频繁驱逐的项目
  
  // 缓存大小
  private p: number = 0; // 目标T1大小
  private n: number = 0; // 总缓存大小
  
  // 统计信息
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  constructor(options: ARCCacheOptions<K, V>) {
    this._capacity = options.capacity;
    this.onEvict = options.onEvict;
    this.sizeFunction = options.sizeFunction || (() => 1);
  }

  /**
   * 获取缓存中的值
   */
  get(key: K): V | undefined {
    // 检查T1
    if (this.t1.has(key)) {
      // 缓存命中，移动到T2
      const value = this.t1.get(key)!;
      this.t1.delete(key);
      this.t2.set(key, value);
      this.hits++;
      return value;
    }

    // 检查T2
    if (this.t2.has(key)) {
      // 缓存命中，保持在T2
      this.hits++;
      return this.t2.get(key);
    }

    // 缓存未命中
    this.misses++;
    return undefined;
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V): void {
    const size = this.sizeFunction!(value);
    
    // 如果项目已在T1或T2中，先删除
    if (this.t1.has(key)) {
      this.t1.delete(key);
    } else if (this.t2.has(key)) {
      this.t2.delete(key);
    }

    // 检查B1
    if (this.b1.has(key)) {
      // 调整p
      const delta = Math.max(1, Math.floor(this.b1.size / this.b2.size)) || 1;
      this.p = Math.min(this.p + delta, this._capacity);
      
      // 驱逐项目
      this.replace();
      
      // 从B1中删除并添加到T2
      this.b1.delete(key);
      this.t2.set(key, value);
      this.n += size;
      return;
    }

    // 检查B2
    if (this.b2.has(key)) {
      // 调整p
      const delta = Math.max(1, Math.floor(this.b2.size / this.b1.size)) || 1;
      this.p = Math.max(this.p - delta, 0);
      
      // 驱逐项目
      this.replace();
      
      // 从B2中删除并添加到T2
      this.b2.delete(key);
      this.t2.set(key, value);
      this.n += size;
      return;
    }

    // 新项目
    if (this.t1.size + this.b1.size === this._capacity) {
      if (this.t1.size < this._capacity) {
        // 驱逐B1中的项目
        this.b1.delete(this.getOldest(this.b1));
        this.replace();
      } else {
        // 驱逐T1中的项目
        const evictedKey = this.getOldest(this.t1);
        const evictedValue = this.t1.get(evictedKey)!;
        this.t1.delete(evictedKey);
        this.evict(evictedKey, evictedValue);
      }
    } else if (this.t1.size + this.t2.size + this.b1.size + this.b2.size >= this._capacity) {
      // 驱逐项目
      if (this.t1.size + this.b1.size === this._capacity) {
        // 驱逐B1中的项目
        this.b1.delete(this.getOldest(this.b1));
      } else {
        // 驱逐B2中的项目
        this.b2.delete(this.getOldest(this.b2));
      }
      this.replace();
    }

    // 添加到T1
    this.t1.set(key, value);
    this.n += size;
  }

  /**
   * 删除缓存值
   */
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
   * 清除所有缓存
   */
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
   * 检查缓存是否包含键
   */
  has(key: K): boolean {
    return this.t1.has(key) || this.t2.has(key);
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.t1.size + this.t2.size;
  }

  /**
   * 获取缓存容量
   */
  get capacity(): number {
    return this._capacity;
  }

  /**
   * 获取缓存统计信息
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
   * 替换策略实现
   */
  private replace(): void {
    if (this.t1.size > 0 && (this.t1.size > this.p || (this.t1.size === this.p && this.b2.has(this.getOldest(this.t1))))) {
      // 从T1中驱逐
      const evictedKey = this.getOldest(this.t1);
      const evictedValue = this.t1.get(evictedKey)!;
      this.t1.delete(evictedKey);
      this.b1.add(evictedKey);
      this.evict(evictedKey, evictedValue);
    } else if (this.t2.size > 0) {
      // 从T2中驱逐
      const evictedKey = this.getOldest(this.t2);
      const evictedValue = this.t2.get(evictedKey)!;
      this.t2.delete(evictedKey);
      this.b2.add(evictedKey);
      this.evict(evictedKey, evictedValue);
    }
  }

  /**
   * 处理驱逐
   */
  private evict(key: K, value: V): void {
    this.evictions++;
    this.n -= this.sizeFunction!(value);
    if (this.onEvict) {
      this.onEvict(key, value);
    }
  }

  /**
   * 获取集合中最旧的元素
   */
  private getOldest(collection: Map<K, V> | Set<K>): K {
    const result = collection.keys().next().value;
    return result as K;
  }
}

export default ARCCache;
