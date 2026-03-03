/**
 * 鍒嗗眰缂撳瓨绯荤粺瀹炵幇
 * 
 * 鍒嗗眰缂撳瓨绯荤粺閫氳繃缁勫悎澶氱缂撳瓨绛栫暐锛屾彁渚涙洿楂樻晥銆佹洿鐏垫椿鐨勭紦瀛樿В鍐虫柟妗堛€? * 瀹冩敮鎸佸绾х紦瀛橈紝濡傚唴瀛樼紦瀛樸€丩ocalStorage 缂撳瓨绛夛紝骞惰嚜鍔ㄧ鐞嗙紦瀛樺悓姝ャ€? */

import { ARCCache } from './arcCache';

export interface CacheLayer<K, V> {
  get(key: K): Promise<V | undefined>;
  set(key: K, value: V): Promise<void>;
  delete(key: K): Promise<boolean>;
  clear(): Promise<void>;
  has(key: K): Promise<boolean>;
  get size(): Promise<number>;
}

export interface LayeredCacheOptions<K, V> {
  layers: CacheLayer<K, V>[];
  onEvict?: (key: K, value: V) => void;
  serializer?: (value: V) => string;
  deserializer?: (data: string) => V;
}

export class MemoryCacheLayer<K, V> implements CacheLayer<K, V> {
  private cache: ARCCache<K, V>;

  constructor(capacity: number = 1000) {
    this.cache = new ARCCache({ capacity });
  }

  async get(key: K): Promise<V | undefined> {
    return this.cache.get(key);
  }

  async set(key: K, value: V): Promise<void> {
    this.cache.set(key, value);
  }

  async delete(key: K): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: K): Promise<boolean> {
    return this.cache.has(key);
  }

  get size(): Promise<number> {
    return Promise.resolve(this.cache.size);
  }

  get stats() {
    return this.cache.stats;
  }
}

export class LocalStorageCacheLayer<K, V> implements CacheLayer<K, V> {
  private prefix: string;
  private serializer: (value: V) => string;
  private deserializer: (data: string) => V;

  constructor(
    prefix: string = 'cache:',
    serializer: (value: V) => string = JSON.stringify,
    deserializer: (data: string) => V = JSON.parse
  ) {
    this.prefix = prefix;
    this.serializer = serializer;
    this.deserializer = deserializer;
  }

  private getKey(key: K): string {
    return `${this.prefix}${String(key)}`;
  }

  async get(key: K): Promise<V | undefined> {
    try {
      const stored = localStorage.getItem(this.getKey(key));
      if (stored === null) {
        return undefined;
      }
      return this.deserializer(stored);
    } catch (error) {
      console.warn('LocalStorage get error:', error);
      return undefined;
    }
  }

  async set(key: K, value: V): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), this.serializer(value));
    } catch (error) {
      console.warn('LocalStorage set error:', error);
    }
  }

  async delete(key: K): Promise<boolean> {
    try {
      const existed = await this.has(key);
      localStorage.removeItem(this.getKey(key));
      return existed;
    } catch (error) {
      console.warn('LocalStorage delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('LocalStorage clear error:', error);
    }
  }

  async has(key: K): Promise<boolean> {
    try {
      return localStorage.getItem(this.getKey(key)) !== null;
    } catch (error) {
      console.warn('LocalStorage has error:', error);
      return false;
    }
  }

  get size(): Promise<number> {
    try {
      const keys = Object.keys(localStorage);
      return Promise.resolve(keys.filter(key => key.startsWith(this.prefix)).length);
    } catch (error) {
      console.warn('LocalStorage size error:', error);
      return Promise.resolve(0);
    }
  }
}

export class LayeredCache<K, V> implements CacheLayer<K, V> {
  private layers: CacheLayer<K, V>[];
  private onEvict?: (key: K, value: V) => void;

  constructor(options: LayeredCacheOptions<K, V>) {
    this.layers = options.layers;
    this.onEvict = options.onEvict;
  }

  /**
   * 鑾峰彇缂撳瓨鍊?   * 浠庢渶楂樺眰寮€濮嬫煡鎵撅紝鎵惧埌鍚庡皢鍊煎悓姝ュ埌鎵€鏈変笂灞傜紦瀛?   */
  async get(key: K): Promise<V | undefined> {
    let value: V | undefined;
    let foundAt = -1;

    // 浠庢渶楂樺眰寮€濮嬫煡鎵?    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      value = await layer.get(key);
      
      if (value !== undefined) {
        foundAt = i;
        break;
      }
    }

    // 濡傛灉鎵惧埌浜嗗€硷紝灏嗗叾鍚屾鍒版墍鏈変笂灞傜紦瀛?    if (value !== undefined && foundAt > 0) {
      for (let i = 0; i < foundAt; i++) {
        await this.layers[i].set(key, value);
      }
    }

    return value;
  }

  /**
   * 璁剧疆缂撳瓨鍊?   * 璁剧疆鍒版墍鏈夌紦瀛樺眰
   */
  async set(key: K, value: V): Promise<void> {
    for (const layer of this.layers) {
      await layer.set(key, value);
    }
  }

  /**
   * 鍒犻櫎缂撳瓨鍊?   * 浠庢墍鏈夌紦瀛樺眰涓垹闄?   */
  async delete(key: K): Promise<boolean> {
    let deleted = false;

    for (const layer of this.layers) {
      const layerDeleted = await layer.delete(key);
      deleted = deleted || layerDeleted;
    }

    if (deleted && this.onEvict) {
      // 娉ㄦ剰锛氳繖閲屾垜浠病鏈夎幏鍙栧埌鍊硷紝鎵€浠ユ棤娉曡皟鐢?onEvict
      // 濡傛灉闇€瑕侊紝鍙互鍦ㄥ垹闄ゅ墠鍏堣幏鍙栧€?    }

    return deleted;
  }

  /**
   * 娓呴櫎鎵€鏈夌紦瀛?   * 娓呴櫎鎵€鏈夌紦瀛樺眰
   */
  async clear(): Promise<void> {
    for (const layer of this.layers) {
      await layer.clear();
    }
  }

  /**
   * 妫€鏌ョ紦瀛樻槸鍚﹀寘鍚敭
   * 浠庢渶楂樺眰寮€濮嬫鏌?   */
  async has(key: K): Promise<boolean> {
    for (const layer of this.layers) {
      if (await layer.has(key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 鑾峰彇缂撳瓨澶у皬
   * 杩斿洖鏈€楂樺眰缂撳瓨鐨勫ぇ灏?   */
  get size(): Promise<number> {
    return this.layers[0].size;
  }

  /**
   * 娣诲姞缂撳瓨灞?   */
  addLayer(layer: CacheLayer<K, V>): void {
    this.layers.push(layer);
  }

  /**
   * 绉婚櫎缂撳瓨灞?   */
  removeLayer(index: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers.splice(index, 1);
    }
  }

  /**
   * 鑾峰彇缂撳瓨灞?   */
  getLayer(index: number): CacheLayer<K, V> | undefined {
    return this.layers[index];
  }
}

// 渚挎嵎鍑芥暟锛氬垱寤洪粯璁ゅ垎灞傜紦瀛?export function createDefaultCache<K, V>(capacity: number = 1000): LayeredCache<K, V> {
  const memoryLayer = new MemoryCacheLayer<K, V>(capacity);
  const localStorageLayer = new LocalStorageCacheLayer<K, V>();

  return new LayeredCache({
    layers: [memoryLayer, localStorageLayer],
  });
}

export default LayeredCache;

