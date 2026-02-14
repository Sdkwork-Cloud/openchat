import { Injectable, Logger } from '@nestjs/common';
import { MemoryEntry } from './memory.interface';

interface CacheEntry {
  memory: MemoryEntry;
  timestamp: number;
  hits: number;
}

@Injectable()
export class MemoryCacheService {
  private readonly logger = new Logger(MemoryCacheService.name);
  private cache: Map<string, CacheEntry> = new Map();
  private agentIndex: Map<string, Set<string>> = new Map();
  private sessionIndex: Map<string, Set<string>> = new Map();
  private maxSize: number = 10000;
  private ttl: number = 3600000;

  get(id: string): MemoryEntry | null {
    const entry = this.cache.get(id);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(id);
      return null;
    }

    entry.hits++;
    return entry.memory;
  }

  set(id: string, memory: MemoryEntry): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(id, {
      memory,
      timestamp: Date.now(),
      hits: 0,
    });

    if (memory.agentId) {
      if (!this.agentIndex.has(memory.agentId)) {
        this.agentIndex.set(memory.agentId, new Set());
      }
      this.agentIndex.get(memory.agentId)!.add(id);
    }

    if (memory.sessionId) {
      const sessionKey = `${memory.agentId}:${memory.sessionId}`;
      if (!this.sessionIndex.has(sessionKey)) {
        this.sessionIndex.set(sessionKey, new Set());
      }
      this.sessionIndex.get(sessionKey)!.add(id);
    }
  }

  delete(id: string): boolean {
    const entry = this.cache.get(id);
    if (!entry) {
      return false;
    }

    this.cache.delete(id);

    if (entry.memory.agentId) {
      this.agentIndex.get(entry.memory.agentId)?.delete(id);
    }

    if (entry.memory.sessionId) {
      const sessionKey = `${entry.memory.agentId}:${entry.memory.sessionId}`;
      this.sessionIndex.get(sessionKey)?.delete(id);
    }

    return true;
  }

  invalidate(agentId: string, sessionId?: string): void {
    if (sessionId) {
      const sessionKey = `${agentId}:${sessionId}`;
      const ids = this.sessionIndex.get(sessionKey);
      if (ids) {
        for (const id of ids) {
          this.cache.delete(id);
        }
        this.sessionIndex.delete(sessionKey);
      }
    } else {
      const ids = this.agentIndex.get(agentId);
      if (ids) {
        for (const id of ids) {
          const entry = this.cache.get(id);
          if (entry?.memory.sessionId) {
            const sessionKey = `${agentId}:${entry.memory.sessionId}`;
            this.sessionIndex.get(sessionKey)?.delete(id);
          }
          this.cache.delete(id);
        }
        this.agentIndex.delete(agentId);
      }
    }
  }

  invalidateBySession(sessionId: string): void {
    for (const [key, ids] of this.sessionIndex.entries()) {
      if (key.endsWith(`:${sessionId}`)) {
        for (const id of ids) {
          this.cache.delete(id);
        }
        this.sessionIndex.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.agentIndex.clear();
    this.sessionIndex.clear();
    this.logger.debug('Memory cache cleared');
  }

  getStats(): {
    size: number;
    maxSize: number;
    agentCount: number;
    sessionCount: number;
    hitRate: number;
  } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      agentCount: this.agentIndex.size,
      sessionCount: this.sessionIndex.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime || (entry.timestamp === oldestTime && entry.hits < lowestHits)) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        lowestHits = entry.hits;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.logger.debug(`Evicted cache entry: ${oldestKey}`);
    }
  }

  setMaxSize(size: number): void {
    this.maxSize = size;
    while (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  setTTL(ttl: number): void {
    this.ttl = ttl;
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }

    return cleaned;
  }
}
