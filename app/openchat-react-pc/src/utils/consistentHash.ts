/**
 * 一致性哈希实现
 * 
 * 职责：实现服务器负载均衡，确保节点增减时最小化数据迁移
 * 应用：WebSocket 服务器选择、缓存分片、消息路由
 * 
 * 特点：
 * - 单调性：添加/删除节点不影响已有映射
 * - 平衡性：数据均匀分布
 * - 分散性：相同 key 映射到相同节点
 */

/**
 * 哈希环节点
 */
interface HashRingNode {
  id: string;
  weight: number;
  virtualNodes: number[]; // 虚拟节点哈希值
}

/**
 * 一致性哈希环
 */
export class ConsistentHashRing {
  private ring: Map<number, string> = new Map(); // 哈希值 -> 节点ID
  private nodes: Map<string, HashRingNode> = new Map(); // 节点ID -> 节点
  private sortedHashes: number[] = []; // 排序后的哈希值
  private virtualNodesPerServer: number;

  constructor(virtualNodesPerServer: number = 150) {
    this.virtualNodesPerServer = virtualNodesPerServer;
  }

  /**
   * MurmurHash3 实现
   */
  private hash(key: string): number {
    let h1 = 0;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const r1 = 15;
    const r2 = 13;
    const m = 5;
    const n = 0xe6546b64;

    let i = 0;
    const len = key.length;

    while (i + 4 <= len) {
      let k1 =
        (key.charCodeAt(i) & 0xff) |
        ((key.charCodeAt(i + 1) & 0xff) << 8) |
        ((key.charCodeAt(i + 2) & 0xff) << 16) |
        ((key.charCodeAt(i + 3) & 0xff) << 24);

      k1 = Math.imul(k1, c1);
      k1 = (k1 << r1) | (k1 >>> (32 - r1));
      k1 = Math.imul(k1, c2);

      h1 ^= k1;
      h1 = (h1 << r2) | (h1 >>> (32 - r2));
      h1 = Math.imul(h1, m) + n;

      i += 4;
    }

    let k1 = 0;
    const remaining = len - i;
    if (remaining >= 3) {
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    }
    if (remaining >= 2) {
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    }
    if (remaining >= 1) {
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << r1) | (k1 >>> (32 - r1));
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
    }

    h1 ^= len;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
  }

  /**
   * 添加节点
   */
  addNode(nodeId: string, weight: number = 1): void {
    if (this.nodes.has(nodeId)) {
      console.warn(`[ConsistentHash] Node ${nodeId} already exists`);
      return;
    }

    const virtualNodes: number[] = [];
    const virtualNodeCount = Math.floor(this.virtualNodesPerServer * weight);

    // 创建虚拟节点
    for (let i = 0; i < virtualNodeCount; i++) {
      const virtualKey = `${nodeId}#${i}`;
      const hash = this.hash(virtualKey);
      
      this.ring.set(hash, nodeId);
      virtualNodes.push(hash);
    }

    this.nodes.set(nodeId, {
      id: nodeId,
      weight,
      virtualNodes,
    });

    // 重新排序
    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    console.log(
      `[ConsistentHash] Added node ${nodeId} with ${virtualNodeCount} virtual nodes`
    );
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`[ConsistentHash] Node ${nodeId} not found`);
      return;
    }

    // 移除虚拟节点
    node.virtualNodes.forEach((hash) => {
      this.ring.delete(hash);
    });

    this.nodes.delete(nodeId);

    // 重新排序
    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    console.log(`[ConsistentHash] Removed node ${nodeId}`);
  }

  /**
   * 获取 key 对应的节点
   */
  getNode(key: string): string | null {
    if (this.sortedHashes.length === 0) {
      return null;
    }

    const hash = this.hash(key);

    // 二分查找第一个大于等于 hash 的位置
    let left = 0;
    let right = this.sortedHashes.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedHashes[mid] < hash) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // 如果 hash 大于所有节点，回到第一个节点
    const targetHash =
      this.sortedHashes[left] >= hash
        ? this.sortedHashes[left]
        : this.sortedHashes[0];

    return this.ring.get(targetHash) || null;
  }

  /**
   * 获取 key 对应的节点（带后备节点）
   */
  getNodes(key: string, count: number): string[] {
    if (this.sortedHashes.length === 0) {
      return [];
    }

    const hash = this.hash(key);
    const results: string[] = [];
    const seen = new Set<string>();

    // 二分查找起始位置
    let left = 0;
    let right = this.sortedHashes.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedHashes[mid] < hash) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    let index =
      this.sortedHashes[left] >= hash ? left : 0;

    // 顺时针查找不同节点
    while (results.length < count && seen.size < this.nodes.size) {
      const nodeHash = this.sortedHashes[index];
      const nodeId = this.ring.get(nodeHash);

      if (nodeId && !seen.has(nodeId)) {
        seen.add(nodeId);
        results.push(nodeId);
      }

      index = (index + 1) % this.sortedHashes.length;

      // 防止无限循环
      if (index === (this.sortedHashes[left] >= hash ? left : 0)) {
        break;
      }
    }

    return results;
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * 获取节点数量
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * 获取虚拟节点数量
   */
  getVirtualNodeCount(): number {
    return this.sortedHashes.length;
  }

  /**
   * 获取节点分布统计
   */
  getDistributionStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.sortedHashes.forEach((hash) => {
      const nodeId = this.ring.get(hash);
      if (nodeId) {
        stats[nodeId] = (stats[nodeId] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 计算标准差（衡量分布均匀性）
   */
  getStandardDeviation(): number {
    const stats = this.getDistributionStats();
    const values = Object.values(stats);

    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return Math.sqrt(variance);
  }

  /**
   * 清空
   */
  clear(): void {
    this.ring.clear();
    this.nodes.clear();
    this.sortedHashes = [];
  }
}

/**
 * 服务器路由管理器
 */
export class ServerRouter {
  private hashRing: ConsistentHashRing;
  private serverHealth: Map<string, { healthy: boolean; lastCheck: number }> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(virtualNodesPerServer: number = 150) {
    this.hashRing = new ConsistentHashRing(virtualNodesPerServer);
    this.startHealthCheck();
  }

  /**
   * 添加服务器
   */
  addServer(serverId: string, weight: number = 1): void {
    this.hashRing.addNode(serverId, weight);
    this.serverHealth.set(serverId, { healthy: true, lastCheck: Date.now() });
  }

  /**
   * 移除服务器
   */
  removeServer(serverId: string): void {
    this.hashRing.removeNode(serverId);
    this.serverHealth.delete(serverId);
  }

  /**
   * 获取路由目标
   */
  getRoute(key: string): string | null {
    const primary = this.hashRing.getNode(key);
    
    if (!primary) return null;

    // 检查主节点健康状态
    const health = this.serverHealth.get(primary);
    if (health?.healthy) {
      return primary;
    }

    // 主节点不健康，查找后备节点
    const backups = this.hashRing.getNodes(key, 3);
    for (const backup of backups) {
      const backupHealth = this.serverHealth.get(backup);
      if (backupHealth?.healthy) {
        return backup;
      }
    }

    return null;
  }

  /**
   * 标记服务器健康状态
   */
  setServerHealth(serverId: string, healthy: boolean): void {
    this.serverHealth.set(serverId, { healthy, lastCheck: Date.now() });
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkServerHealth();
    }, 30000); // 30秒检查一次
  }

  /**
   * 检查服务器健康
   */
  private checkServerHealth(): void {
    this.serverHealth.forEach((health, serverId) => {
      // 这里可以实现实际的健康检查逻辑
      // 暂时模拟健康检查
      if (Date.now() - health.lastCheck > 60000) {
        // 超过60秒未更新，标记为不健康
        this.setServerHealth(serverId, false);
      }
    });
  }

  /**
   * 获取健康服务器列表
   */
  getHealthyServers(): string[] {
    return Array.from(this.serverHealth.entries())
      .filter(([, health]) => health.healthy)
      .map(([serverId]) => serverId);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalServers: this.hashRing.getNodeCount(),
      healthyServers: this.getHealthyServers().length,
      virtualNodes: this.hashRing.getVirtualNodeCount(),
      distributionStdDev: this.hashRing.getStandardDeviation(),
    };
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.hashRing.clear();
    this.serverHealth.clear();
  }
}

// 全局服务器路由器
let serverRouter: ServerRouter | null = null;

/**
 * 获取服务器路由器
 */
export function getServerRouter(): ServerRouter {
  if (!serverRouter) {
    serverRouter = new ServerRouter();
  }
  return serverRouter;
}

/**
 * 路由用户到服务器
 */
export function routeUser(userId: string): string | null {
  return getServerRouter().getRoute(userId);
}

/**
 * 路由消息到服务器
 */
export function routeMessage(messageId: string): string | null {
  return getServerRouter().getRoute(messageId);
}
