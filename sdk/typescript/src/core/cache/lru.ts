/**
 * LRU缓存实现
 * 用于HTTP缓存系统中的最近最少使用策略
 */

export class LRU<K, V> {
  private capacity: number;
  private map: Map<K, { value: V; prev: K | null; next: K | null }>;
  private head: K | null;
  private tail: K | null;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('LRU capacity must be greater than 0');
    }
    this.capacity = capacity;
    this.map = new Map();
    this.head = null;
    this.tail = null;
  }

  /**
   * 获取最大容量
   */
  get maxSize(): number {
    return this.capacity;
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get(key: K): V | undefined {
    if (!this.map.has(key)) {
      return undefined;
    }

    const node = this.map.get(key)!;
    this.moveToHead(key, node);
    return node.value;
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   */
  set(key: K, value: V): void {
    if (this.map.has(key)) {
      const node = this.map.get(key)!;
      node.value = value;
      this.moveToHead(key, node);
      return;
    }

    if (this.map.size >= this.capacity) {
      this.removeTail();
    }

    const newNode = { value, prev: null, next: this.head };
    this.map.set(key, newNode);

    if (this.head) {
      const headNode = this.map.get(this.head)!;
      headNode.prev = key;
    }
    this.head = key;

    if (!this.tail) {
      this.tail = key;
    }
  }

  /**
   * 删除缓存值
   * @param key 缓存键
   * @returns 是否删除成功
   */
  delete(key: K): boolean {
    if (!this.map.has(key)) {
      return false;
    }

    const node = this.map.get(key)!;

    if (node.prev) {
      const prevNode = this.map.get(node.prev)!;
      prevNode.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      const nextNode = this.map.get(node.next)!;
      nextNode.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    this.map.delete(key);
    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * 获取缓存大小
   * @returns 缓存大小
   */
  get size(): number {
    return this.map.size;
  }

  /**
   * 检查缓存是否包含键
   * @param key 缓存键
   * @returns 是否包含
   */
  has(key: K): boolean {
    return this.map.has(key);
  }

  /**
   * 将节点移动到头部
   * @param key 缓存键
   * @param node 节点
   */
  private moveToHead(key: K, node: { value: V; prev: K | null; next: K | null }) {
    if (key === this.head) {
      return;
    }

    // 移除节点
    if (node.prev) {
      const prevNode = this.map.get(node.prev)!;
      prevNode.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      const nextNode = this.map.get(node.next)!;
      nextNode.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    // 移动到头部
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      const headNode = this.map.get(this.head)!;
      headNode.prev = key;
    }

    this.head = key;

    if (!this.tail) {
      this.tail = key;
    }
  }

  /**
   * 移除尾部节点
   */
  private removeTail() {
    if (!this.tail) {
      return;
    }

    const oldTail = this.tail;
    const tailNode = this.map.get(oldTail)!;

    if (tailNode.prev) {
      const prevNode = this.map.get(tailNode.prev)!;
      prevNode.next = null;
      this.tail = tailNode.prev;
    } else {
      this.head = null;
      this.tail = null;
    }

    this.map.delete(oldTail);
  }
}
