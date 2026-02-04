import { describe, it, expect, beforeEach } from 'vitest';
import { algorithmService } from '../services/algorithm.service';
import { CountingBloomFilter } from '../utils/countingBloomFilter';
import { SkipList } from '../utils/skipList';

describe('AlgorithmService', () => {
  describe('CountingBloomFilter', () => {
    let bloomFilter: CountingBloomFilter;

    beforeEach(() => {
      bloomFilter = algorithmService.createCountingBloomFilter(1024, 3);
    });

    it('should add items correctly', () => {
      bloomFilter.add('test1');
      bloomFilter.add('test2');
      bloomFilter.add('test3');

      expect(bloomFilter.contains('test1')).toBe(true);
      expect(bloomFilter.contains('test2')).toBe(true);
      expect(bloomFilter.contains('test3')).toBe(true);
    });

    it('should remove items correctly', () => {
      bloomFilter.add('test1');
      expect(bloomFilter.contains('test1')).toBe(true);

      bloomFilter.remove('test1');
      expect(bloomFilter.contains('test1')).toBe(false);
    });

    it('should clear all items', () => {
      bloomFilter.add('test1');
      bloomFilter.add('test2');
      expect(bloomFilter.contains('test1')).toBe(true);
      expect(bloomFilter.contains('test2')).toBe(true);

      bloomFilter.clear();
      expect(bloomFilter.contains('test1')).toBe(false);
      expect(bloomFilter.contains('test2')).toBe(false);
    });

    it('should handle non-existent items', () => {
      expect(bloomFilter.contains('non-existent')).toBe(false);
    });
  });

  describe('SkipList', () => {
    let skipList: SkipList<string, number>;

    beforeEach(() => {
      skipList = algorithmService.createSkipList<string, number>();
    });

    it('should insert items correctly', () => {
      skipList.insert('key1', 1);
      skipList.insert('key2', 2);
      skipList.insert('key3', 3);

      expect(skipList.search('key1')).toBe(1);
      expect(skipList.search('key2')).toBe(2);
      expect(skipList.search('key3')).toBe(3);
    });

    it('should update existing items', () => {
      skipList.insert('key1', 1);
      expect(skipList.search('key1')).toBe(1);

      skipList.insert('key1', 10);
      expect(skipList.search('key1')).toBe(10);
    });

    it('should delete items correctly', () => {
      skipList.insert('key1', 1);
      expect(skipList.search('key1')).toBe(1);

      const deleted = skipList.delete('key1');
      expect(deleted).toBe(true);
      expect(skipList.search('key1')).toBe(null);
    });

    it('should return false when deleting non-existent items', () => {
      const deleted = skipList.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should search for non-existent items', () => {
      expect(skipList.search('non-existent')).toBe(null);
    });

    it('should return the correct size', () => {
      expect(skipList.size()).toBe(0);

      skipList.insert('key1', 1);
      skipList.insert('key2', 2);
      expect(skipList.size()).toBe(2);

      skipList.delete('key1');
      expect(skipList.size()).toBe(1);
    });

    it('should clear all items', () => {
      skipList.insert('key1', 1);
      skipList.insert('key2', 2);
      expect(skipList.size()).toBe(2);

      skipList.clear();
      expect(skipList.size()).toBe(0);
      expect(skipList.search('key1')).toBe(null);
      expect(skipList.search('key2')).toBe(null);
    });

    it('should convert to array correctly', () => {
      skipList.insert('key3', 3);
      skipList.insert('key1', 1);
      skipList.insert('key2', 2);

      const array = skipList.toArray();
      expect(array).toHaveLength(3);
      expect(array[0].key).toBe('key1');
      expect(array[0].value).toBe(1);
      expect(array[1].key).toBe('key2');
      expect(array[1].value).toBe(2);
      expect(array[2].key).toBe('key3');
      expect(array[2].value).toBe(3);
    });
  });

  describe('Default Instances', () => {
    it('should return default bloom filter', () => {
      const defaultBloomFilter = algorithmService.getDefaultBloomFilter();
      expect(defaultBloomFilter).toBeInstanceOf(CountingBloomFilter);
    });

    it('should return default skip list', () => {
      const defaultSkipList = algorithmService.getDefaultSkipList();
      expect(defaultSkipList).toBeInstanceOf(SkipList);
    });
  });
});
