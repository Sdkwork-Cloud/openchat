/**
 * 涓€鑷存€у搱甯屽疄鐜? * 
 * 鑱岃矗锛氬疄鐜版湇鍔″櫒璐熻浇鍧囪　锛岀‘淇濊妭鐐瑰鍑忔椂鏈€灏忓寲鏁版嵁杩佺Щ
 * 搴旂敤锛歐ebSocket 鏈嶅姟鍣ㄩ€夋嫨銆佺紦瀛樺垎鐗囥€佹秷鎭矾鐢? * 
 * 鐗圭偣锛? * - 鍗曡皟鎬э細娣诲姞/鍒犻櫎鑺傜偣涓嶅奖鍝嶅凡鏈夋槧灏? * - 骞宠　鎬э細鏁版嵁鍧囧寑鍒嗗竷
 * - 鍒嗘暎鎬э細鐩稿悓 key 鏄犲皠鍒扮浉鍚岃妭鐐? */

/**
 * 鍝堝笇鐜妭鐐? */
interface HashRingNode {
  id: string;
  weight: number;
  virtualNodes: number[]; // 铏氭嫙鑺傜偣鍝堝笇鍊?}

/**
 * 涓€鑷存€у搱甯岀幆
 */
export class ConsistentHashRing {
  private ring: Map<number, string> = new Map(); // 鍝堝笇鍊?-> 鑺傜偣ID
  private nodes: Map<string, HashRingNode> = new Map(); // 鑺傜偣ID -> 鑺傜偣
  private sortedHashes: number[] = []; // 鎺掑簭鍚庣殑鍝堝笇鍊?  private virtualNodesPerServer: number;

  constructor(virtualNodesPerServer: number = 150) {
    this.virtualNodesPerServer = virtualNodesPerServer;
  }

  /**
   * MurmurHash3 瀹炵幇
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
   * 娣诲姞鑺傜偣
   */
  addNode(nodeId: string, weight: number = 1): void {
    if (this.nodes.has(nodeId)) {
      console.warn(`[ConsistentHash] Node ${nodeId} already exists`);
      return;
    }

    const virtualNodes: number[] = [];
    const virtualNodeCount = Math.floor(this.virtualNodesPerServer * weight);

    // 鍒涘缓铏氭嫙鑺傜偣
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

    // 閲嶆柊鎺掑簭
    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    console.log(
      `[ConsistentHash] Added node ${nodeId} with ${virtualNodeCount} virtual nodes`
    );
  }

  /**
   * 绉婚櫎鑺傜偣
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`[ConsistentHash] Node ${nodeId} not found`);
      return;
    }

    // 绉婚櫎铏氭嫙鑺傜偣
    node.virtualNodes.forEach((hash) => {
      this.ring.delete(hash);
    });

    this.nodes.delete(nodeId);

    // 閲嶆柊鎺掑簭
    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    console.log(`[ConsistentHash] Removed node ${nodeId}`);
  }

  /**
   * 鑾峰彇 key 瀵瑰簲鐨勮妭鐐?   */
  getNode(key: string): string | null {
    if (this.sortedHashes.length === 0) {
      return null;
    }

    const hash = this.hash(key);

    // 浜屽垎鏌ユ壘绗竴涓ぇ浜庣瓑浜?hash 鐨勪綅缃?    let left = 0;
    let right = this.sortedHashes.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedHashes[mid] < hash) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // 濡傛灉 hash 澶т簬鎵€鏈夎妭鐐癸紝鍥炲埌绗竴涓妭鐐?    const targetHash =
      this.sortedHashes[left] >= hash
        ? this.sortedHashes[left]
        : this.sortedHashes[0];

    return this.ring.get(targetHash) || null;
  }

  /**
   * 鑾峰彇 key 瀵瑰簲鐨勮妭鐐癸紙甯﹀悗澶囪妭鐐癸級
   */
  getNodes(key: string, count: number): string[] {
    if (this.sortedHashes.length === 0) {
      return [];
    }

    const hash = this.hash(key);
    const results: string[] = [];
    const seen = new Set<string>();

    // 浜屽垎鏌ユ壘璧峰浣嶇疆
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

    // 椤烘椂閽堟煡鎵句笉鍚岃妭鐐?    while (results.length < count && seen.size < this.nodes.size) {
      const nodeHash = this.sortedHashes[index];
      const nodeId = this.ring.get(nodeHash);

      if (nodeId && !seen.has(nodeId)) {
        seen.add(nodeId);
        results.push(nodeId);
      }

      index = (index + 1) % this.sortedHashes.length;

      // 闃叉鏃犻檺寰幆
      if (index === (this.sortedHashes[left] >= hash ? left : 0)) {
        break;
      }
    }

    return results;
  }

  /**
   * 鑾峰彇鎵€鏈夎妭鐐?   */
  getAllNodes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * 鑾峰彇鑺傜偣鏁伴噺
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * 鑾峰彇铏氭嫙鑺傜偣鏁伴噺
   */
  getVirtualNodeCount(): number {
    return this.sortedHashes.length;
  }

  /**
   * 鑾峰彇鑺傜偣鍒嗗竷缁熻
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
   * 璁＄畻鏍囧噯宸紙琛￠噺鍒嗗竷鍧囧寑鎬э級
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
   * 娓呯┖
   */
  clear(): void {
    this.ring.clear();
    this.nodes.clear();
    this.sortedHashes = [];
  }
}

/**
 * 鏈嶅姟鍣ㄨ矾鐢辩鐞嗗櫒
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
   * 娣诲姞鏈嶅姟鍣?   */
  addServer(serverId: string, weight: number = 1): void {
    this.hashRing.addNode(serverId, weight);
    this.serverHealth.set(serverId, { healthy: true, lastCheck: Date.now() });
  }

  /**
   * 绉婚櫎鏈嶅姟鍣?   */
  removeServer(serverId: string): void {
    this.hashRing.removeNode(serverId);
    this.serverHealth.delete(serverId);
  }

  /**
   * 鑾峰彇璺敱鐩爣
   */
  getRoute(key: string): string | null {
    const primary = this.hashRing.getNode(key);
    
    if (!primary) return null;

    // 妫€鏌ヤ富鑺傜偣鍋ュ悍鐘舵€?    const health = this.serverHealth.get(primary);
    if (health?.healthy) {
      return primary;
    }

    // 涓昏妭鐐逛笉鍋ュ悍锛屾煡鎵惧悗澶囪妭鐐?    const backups = this.hashRing.getNodes(key, 3);
    for (const backup of backups) {
      const backupHealth = this.serverHealth.get(backup);
      if (backupHealth?.healthy) {
        return backup;
      }
    }

    return null;
  }

  /**
   * 鏍囪鏈嶅姟鍣ㄥ仴搴风姸鎬?   */
  setServerHealth(serverId: string, healthy: boolean): void {
    this.serverHealth.set(serverId, { healthy, lastCheck: Date.now() });
  }

  /**
   * 鍚姩鍋ュ悍妫€鏌?   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkServerHealth();
    }, 30000); // 30绉掓鏌ヤ竴娆?  }

  /**
   * 妫€鏌ユ湇鍔″櫒鍋ュ悍
   */
  private checkServerHealth(): void {
    this.serverHealth.forEach((health, serverId) => {
      // 杩欓噷鍙互瀹炵幇瀹為檯鐨勫仴搴锋鏌ラ€昏緫
      // 鏆傛椂妯℃嫙鍋ュ悍妫€鏌?      if (Date.now() - health.lastCheck > 60000) {
        // 瓒呰繃60绉掓湭鏇存柊锛屾爣璁颁负涓嶅仴搴?        this.setServerHealth(serverId, false);
      }
    });
  }

  /**
   * 鑾峰彇鍋ュ悍鏈嶅姟鍣ㄥ垪琛?   */
  getHealthyServers(): string[] {
    return Array.from(this.serverHealth.entries())
      .filter(([, health]) => health.healthy)
      .map(([serverId]) => serverId);
  }

  /**
   * 鑾峰彇缁熻淇℃伅
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
   * 閿€姣?   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.hashRing.clear();
    this.serverHealth.clear();
  }
}

// 鍏ㄥ眬鏈嶅姟鍣ㄨ矾鐢卞櫒
let serverRouter: ServerRouter | null = null;

/**
 * 鑾峰彇鏈嶅姟鍣ㄨ矾鐢卞櫒
 */
export function getServerRouter(): ServerRouter {
  if (!serverRouter) {
    serverRouter = new ServerRouter();
  }
  return serverRouter;
}

/**
 * 璺敱鐢ㄦ埛鍒版湇鍔″櫒
 */
export function routeUser(userId: string): string | null {
  return getServerRouter().getRoute(userId);
}

/**
 * 璺敱娑堟伅鍒版湇鍔″櫒
 */
export function routeMessage(messageId: string): string | null {
  return getServerRouter().getRoute(messageId);
}

