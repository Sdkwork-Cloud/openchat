export class SkipListNode<K, V> {
  key: K;
  value: V;
  forward: SkipListNode<K, V>[];

  constructor(key: K, value: V, level: number) {
    this.key = key;
    this.value = value;
    this.forward = new Array(level + 1).fill(null as unknown as SkipListNode<K, V>);
  }
}

export class SkipList<K, V> {
  private readonly MAX_LEVEL: number;
  private readonly P: number;
  private level: number;
  private head: SkipListNode<K, V>;
  private comparator: (a: K, b: K) => number;

  constructor(comparator?: (a: K, b: K) => number) {
    this.MAX_LEVEL = 16;
    this.P = 0.5;
    this.level = 0;
    this.head = new SkipListNode<K, V>(null as unknown as K, null as unknown as V, this.MAX_LEVEL);
    this.comparator = comparator || ((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
  }

  private randomLevel(): number {
    let lvl = 0;
    while (Math.random() < this.P && lvl < this.MAX_LEVEL) {
      lvl++;
    }
    return lvl;
  }

  insert(key: K, value: V): void {
    const update: SkipListNode<K, V>[] = new Array(this.MAX_LEVEL + 1).fill(null as unknown as SkipListNode<K, V>);
    let current = this.head;

    for (let i = this.level; i >= 0; i--) {
      while (current.forward[i] !== null && this.comparator(current.forward[i].key, key) < 0) {
        current = current.forward[i];
      }
      update[i] = current;
    }

    current = current.forward[0];

    if (current !== null && this.comparator(current.key, key) === 0) {
      current.value = value;
      return;
    }

    const newLevel = this.randomLevel();
    if (newLevel > this.level) {
      for (let i = this.level + 1; i <= newLevel; i++) {
        update[i] = this.head;
      }
      this.level = newLevel;
    }

    const newNode = new SkipListNode<K, V>(key, value, newLevel);
    for (let i = 0; i <= newLevel; i++) {
      newNode.forward[i] = update[i].forward[i];
      update[i].forward[i] = newNode;
    }
  }

  search(key: K): V | null {
    let current = this.head;
    for (let i = this.level; i >= 0; i--) {
      while (current.forward[i] !== null && this.comparator(current.forward[i].key, key) < 0) {
        current = current.forward[i];
      }
    }
    current = current.forward[0];
    if (current !== null && this.comparator(current.key, key) === 0) {
      return current.value;
    }
    return null;
  }

  delete(key: K): boolean {
    const update: SkipListNode<K, V>[] = new Array(this.MAX_LEVEL + 1).fill(null as unknown as SkipListNode<K, V>);
    let current = this.head;

    for (let i = this.level; i >= 0; i--) {
      while (current.forward[i] !== null && this.comparator(current.forward[i].key, key) < 0) {
        current = current.forward[i];
      }
      update[i] = current;
    }

    current = current.forward[0];

    if (current === null || this.comparator(current.key, key) !== 0) {
      return false;
    }

    for (let i = 0; i <= this.level; i++) {
      if (update[i].forward[i] !== current) {
        break;
      }
      update[i].forward[i] = current.forward[i];
    }

    while (this.level > 0 && this.head.forward[this.level] === null) {
      this.level--;
    }

    return true;
  }

  getLevel(): number {
    return this.level;
  }

  size(): number {
    let count = 0;
    let current = this.head.forward[0];
    while (current !== null) {
      count++;
      current = current.forward[0];
    }
    return count;
  }

  clear(): void {
    this.level = 0;
    this.head = new SkipListNode<K, V>(null as unknown as K, null as unknown as V, this.MAX_LEVEL);
  }

  toArray(): Array<{ key: K; value: V }> {
    const result: Array<{ key: K; value: V }> = [];
    let current = this.head.forward[0];
    while (current !== null) {
      result.push({ key: current.key, value: current.value });
      current = current.forward[0];
    }
    return result;
  }
}
