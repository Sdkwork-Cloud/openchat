export class CountingBloomFilter {
  private size: number;
  private hashCount: number;
  private counts: number[];
  private bitMask: number;

  constructor(size: number, hashCount: number) {
    this.size = size;
    this.hashCount = hashCount;
    this.counts = new Array(size).fill(0);
    this.bitMask = size - 1;
  }

  private getHashValues(key: string): number[] {
    const hashes: number[] = [];
    let hash1 = this.hash(key, 0);
    let hash2 = this.hash(key, 1);

    for (let i = 0; i < this.hashCount; i++) {
      const combinedHash = (hash1 + i * hash2) & this.bitMask;
      hashes.push(combinedHash);
    }

    return hashes;
  }

  private hash(key: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  add(key: string): void {
    const hashes = this.getHashValues(key);
    for (const hash of hashes) {
      this.counts[hash]++;
    }
  }

  remove(key: string): void {
    const hashes = this.getHashValues(key);
    for (const hash of hashes) {
      if (this.counts[hash] > 0) {
        this.counts[hash]--;
      }
    }
  }

  contains(key: string): boolean {
    const hashes = this.getHashValues(key);
    for (const hash of hashes) {
      if (this.counts[hash] === 0) {
        return false;
      }
    }
    return true;
  }

  clear(): void {
    this.counts.fill(0);
  }

  getSize(): number {
    return this.size;
  }

  getHashCount(): number {
    return this.hashCount;
  }

  getCount(hash: number): number {
    return this.counts[hash];
  }
}
