import { CountingBloomFilter } from '../utils/countingBloomFilter';
import { SkipList } from '../utils/skipList';

export interface AlgorithmService {
  createCountingBloomFilter(size: number, hashCount: number): CountingBloomFilter;
  createSkipList<K, V>(comparator?: (a: K, b: K) => number): SkipList<K, V>;
  getDefaultBloomFilter(): CountingBloomFilter;
  getDefaultSkipList(): SkipList<string, any>;
}

export class AlgorithmServiceImpl implements AlgorithmService {
  private defaultBloomFilter: CountingBloomFilter;
  private defaultSkipList: SkipList<string, any>;

  constructor() {
    this.defaultBloomFilter = new CountingBloomFilter(1024, 3);
    this.defaultSkipList = new SkipList<string, any>();
  }

  createCountingBloomFilter(size: number, hashCount: number): CountingBloomFilter {
    return new CountingBloomFilter(size, hashCount);
  }

  createSkipList<K, V>(comparator?: (a: K, b: K) => number): SkipList<K, V> {
    return new SkipList<K, V>(comparator);
  }

  getDefaultBloomFilter(): CountingBloomFilter {
    return this.defaultBloomFilter;
  }

  getDefaultSkipList(): SkipList<string, any> {
    return this.defaultSkipList;
  }
}

// 导出单例实例
export const algorithmService = new AlgorithmServiceImpl();
