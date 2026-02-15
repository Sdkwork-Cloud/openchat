/**
 * HTTP缓存系统单元测试
 * 测试缓存的创建、获取、设置、删除等核心功能
 */

import { HttpCache } from '../../src/core/cache/http-cache';

// 测试数据
const testData1 = { id: 1, name: 'Test Data 1' };
const testData2 = { id: 2, name: 'Test Data 2' };
const testData3 = { id: 3, name: 'Test Data 3' };

describe('HttpCache', () => {
  let cache: HttpCache;

  beforeEach(() => {
    // 每个测试用例前创建一个新的缓存实例
    cache = new HttpCache({
      maxSize: 3,
      defaultTTL: 1000,
      enabled: true,
    });
  });

  afterEach(() => {
    // 每个测试用例后清理缓存
    cache.clear();
  });

  describe('基本功能测试', () => {
    test('应该能够创建缓存实例', () => {
      expect(cache).toBeDefined();
      expect(cache instanceof HttpCache).toBe(true);
    });

    test('应该能够设置和获取缓存项', () => {
      const key = 'test-key';
      cache.set(key, testData1);
      const result = cache.get(key);
      expect(result).toEqual(testData1);
    });

    test('应该能够删除缓存项', () => {
      const key = 'test-key';
      cache.set(key, testData1);
      expect(cache.get(key)).toEqual(testData1);
      cache.delete(key);
      expect(cache.get(key)).toBeNull();
    });

    test('应该能够清空所有缓存', () => {
      cache.set('key1', testData1);
      cache.set('key2', testData2);
      expect(cache.get('key1')).toEqual(testData1);
      expect(cache.get('key2')).toEqual(testData2);
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    test('应该能够获取缓存大小', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', testData1);
      expect(cache.size()).toBe(1);
      cache.set('key2', testData2);
      expect(cache.size()).toBe(2);
    });

    test('应该能够检查缓存是否为空', () => {
      expect(cache.isEmpty()).toBe(true);
      cache.set('key1', testData1);
      expect(cache.isEmpty()).toBe(false);
      cache.clear();
      expect(cache.isEmpty()).toBe(true);
    });

    test('应该能够检查缓存是否包含指定键', () => {
      expect(cache.has('key1')).toBe(false);
      cache.set('key1', testData1);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('LRU策略测试', () => {
    test('当缓存达到最大容量时，应该移除最久未使用的项', () => {
      // 设置最大容量为2
      cache = new HttpCache({ maxSize: 2 });

      // 添加两个项
      cache.set('key1', testData1);
      cache.set('key2', testData2);
      expect(cache.get('key1')).toEqual(testData1);
      expect(cache.get('key2')).toEqual(testData2);

      // 添加第三个项，应该移除最久未使用的key1
      cache.set('key3', testData3);
      expect(cache.get('key1')).toBeNull(); // 应该被移除
      expect(cache.get('key2')).toEqual(testData2); // 应该保留
      expect(cache.get('key3')).toEqual(testData3); // 应该添加
    });

    test('访问缓存项后，应该更新其使用顺序', () => {
      // 设置最大容量为2
      cache = new HttpCache({ maxSize: 2 });

      // 添加两个项
      cache.set('key1', testData1);
      cache.set('key2', testData2);

      // 访问key1，使其成为最近使用的
      cache.get('key1');

      // 添加第三个项，应该移除最久未使用的key2
      cache.set('key3', testData3);
      expect(cache.get('key1')).toEqual(testData1); // 应该保留（最近使用）
      expect(cache.get('key2')).toBeNull(); // 应该被移除
      expect(cache.get('key3')).toEqual(testData3); // 应该添加
    });
  });

  describe('TTL过期策略测试', () => {
    test('缓存项应该在TTL后过期', async () => {
      // 设置TTL为100ms
      cache = new HttpCache({ defaultTTL: 100 });

      const key = 'test-key';
      cache.set(key, testData1);
      expect(cache.get(key)).toEqual(testData1);

      // 等待150ms，确保缓存过期
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get(key)).toBeNull();
    });

    test('应该能够为单个缓存项设置不同的TTL', async () => {
      // 默认TTL为1000ms
      cache = new HttpCache({ defaultTTL: 1000 });

      // 设置一个50ms TTL的缓存项
      const key1 = 'short-lived';
      cache.set(key1, testData1, 50);

      // 设置一个默认TTL的缓存项
      const key2 = 'long-lived';
      cache.set(key2, testData2);

      // 等待75ms，确保short-lived过期
      await new Promise(resolve => setTimeout(resolve, 75));
      expect(cache.get(key1)).toBeNull(); // 应该过期
      expect(cache.get(key2)).toEqual(testData2); // 应该仍然有效
    });

    test('重新设置缓存项应该更新其TTL', async () => {
      cache = new HttpCache({ defaultTTL: 100 });

      const key = 'test-key';
      cache.set(key, testData1);

      // 等待50ms
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(cache.get(key)).toEqual(testData1); // 应该仍然有效

      // 重新设置缓存项
      cache.set(key, testData2);

      // 等待50ms（总共100ms）
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(cache.get(key)).toEqual(testData2); // 应该仍然有效（因为TTL被更新了）

      // 再等待60ms（总共160ms）
      await new Promise(resolve => setTimeout(resolve, 60));
      expect(cache.get(key)).toBeNull(); // 应该过期
    });
  });

  describe('缓存统计测试', () => {
    test('应该能够获取缓存统计信息', () => {
      cache.set('key1', testData1);
      cache.get('key1'); // 缓存命中
      cache.get('key2'); // 缓存未命中
      cache.delete('key1');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.requests).toBe(2);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(3);
    });

    test('应该能够重置缓存统计信息', () => {
      cache.set('key1', testData1);
      cache.get('key1');
      cache.get('key2');

      let stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);

      cache.resetStats();
      stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.requests).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('缓存禁用测试', () => {
    test('当缓存被禁用时，应该不缓存任何内容', () => {
      cache = new HttpCache({ enabled: false });

      const key = 'test-key';
      cache.set(key, testData1);
      expect(cache.get(key)).toBeNull();
    });

    test('当缓存被禁用时，统计信息应该仍然记录', () => {
      cache = new HttpCache({ enabled: false });

      const key = 'test-key';
      cache.set(key, testData1);
      cache.get(key);

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.requests).toBe(1);
    });
  });

  describe('边界情况测试', () => {
    test('应该能够处理空键', () => {
      const key = '';
      cache.set(key, testData1);
      expect(cache.get(key)).toEqual(testData1);
      cache.delete(key);
      expect(cache.get(key)).toBeNull();
    });

    test('应该能够处理null和undefined值', () => {
      const key = 'test-key';
      cache.set(key, null);
      expect(cache.get(key)).toBeNull();

      cache.set(key, undefined);
      const result = cache.get(key);
      expect(result === null || result === undefined).toBe(true);
    });

    test('应该能够处理大尺寸的缓存项', () => {
      const largeData = {
        id: 1,
        data: Array(1000).fill('test').join(','),
      };
      const key = 'large-key';
      cache.set(key, largeData);
      expect(cache.get(key)).toEqual(largeData);
    });

    test('当maxSize为0时，应该不缓存任何内容', () => {
      cache = new HttpCache({ maxSize: 0 });

      const key = 'test-key';
      cache.set(key, testData1);
      expect(cache.get(key)).toBeNull();
    });

    test('当defaultTTL为0时，缓存项应该立即过期', () => {
      cache = new HttpCache({ defaultTTL: 0 });

      const key = 'test-key';
      cache.set(key, testData1);
      const result = cache.get(key);
      expect(result === null || result === undefined).toBe(true);
    });
  });
});
