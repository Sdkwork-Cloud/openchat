/**
 * LRU缓存单元测试
 * 测试LRU缓存的核心功能
 */

import { LRU } from '../../src/core/cache/lru';

describe('LRU', () => {
  let lru: LRU<string, any>;

  beforeEach(() => {
    lru = new LRU<string, any>(3);
  });

  describe('基本功能测试', () => {
    test('应该能够创建LRU实例', () => {
      expect(lru).toBeDefined();
      expect(lru.size).toBe(0);
      expect(lru.maxSize).toBe(3);
    });

    test('应该能够设置和获取缓存项', () => {
      lru.set('key1', 'value1');
      expect(lru.get('key1')).toBe('value1');
      expect(lru.size).toBe(1);
    });

    test('应该能够删除缓存项', () => {
      lru.set('key1', 'value1');
      expect(lru.get('key1')).toBe('value1');
      expect(lru.delete('key1')).toBe(true);
      expect(lru.get('key1')).toBeUndefined();
      expect(lru.size).toBe(0);
    });

    test('应该能够清空缓存', () => {
      lru.set('key1', 'value1');
      lru.set('key2', 'value2');
      lru.set('key3', 'value3');
      expect(lru.size).toBe(3);
      lru.clear();
      expect(lru.size).toBe(0);
    });

    test('应该能够检查是否包含键', () => {
      expect(lru.has('key1')).toBe(false);
      lru.set('key1', 'value1');
      expect(lru.has('key1')).toBe(true);
    });
  });

  describe('LRU淘汰策略测试', () => {
    test('当容量满时应该淘汰最久未使用的项', () => {
      lru.set('key1', 'value1');
      lru.set('key2', 'value2');
      lru.set('key3', 'value3');
      
      expect(lru.size).toBe(3);
      
      lru.set('key4', 'value4');
      
      expect(lru.size).toBe(3);
      expect(lru.get('key1')).toBeUndefined();
      expect(lru.get('key2')).toBe('value2');
      expect(lru.get('key3')).toBe('value3');
      expect(lru.get('key4')).toBe('value4');
    });

    test('访问项应该更新其使用顺序', () => {
      lru.set('key1', 'value1');
      lru.set('key2', 'value2');
      lru.set('key3', 'value3');
      
      lru.get('key1');
      
      lru.set('key4', 'value4');
      
      expect(lru.get('key1')).toBe('value1');
      expect(lru.get('key2')).toBeUndefined();
    });

    test('更新已存在的项应该更新其使用顺序', () => {
      lru.set('key1', 'value1');
      lru.set('key2', 'value2');
      lru.set('key3', 'value3');
      
      lru.set('key1', 'updated-value1');
      
      lru.set('key4', 'value4');
      
      expect(lru.get('key1')).toBe('updated-value1');
      expect(lru.get('key2')).toBeUndefined();
    });
  });

  describe('边界情况测试', () => {
    test('容量为1时应该正确工作', () => {
      const singleLru = new LRU<string, string>(1);
      singleLru.set('key1', 'value1');
      expect(singleLru.get('key1')).toBe('value1');
      
      singleLru.set('key2', 'value2');
      expect(singleLru.get('key1')).toBeUndefined();
      expect(singleLru.get('key2')).toBe('value2');
    });

    test('删除不存在的键应该返回false', () => {
      expect(lru.delete('nonexistent')).toBe(false);
    });

    test('获取不存在的键应该返回undefined', () => {
      expect(lru.get('nonexistent')).toBeUndefined();
    });

    test('应该能够处理复杂对象值', () => {
      const complexValue = {
        id: 1,
        name: 'test',
        nested: { a: 1, b: 2 },
        array: [1, 2, 3],
      };
      lru.set('complex', complexValue);
      expect(lru.get('complex')).toEqual(complexValue);
    });
  });

  describe('错误处理测试', () => {
    test('容量为0时应该抛出错误', () => {
      expect(() => new LRU<string, string>(0)).toThrow();
    });

    test('负容量应该抛出错误', () => {
      expect(() => new LRU<string, string>(-1)).toThrow();
    });
  });
});
