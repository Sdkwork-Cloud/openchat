import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ConnectionPoolOptions<T> {
  name: string;
  factory: () => Promise<T>;
  destroyer: (connection: T) => Promise<void>;
  validator?: (connection: T) => Promise<boolean>;
  min?: number;
  max?: number;
  acquireTimeout?: number;
  idleTimeout?: number;
  evictionInterval?: number;
  testOnBorrow?: boolean;
  testOnReturn?: boolean;
}

export interface PooledConnection<T> {
  id: string;
  connection: T;
  createdAt: number;
  lastUsedAt: number;
  isValidating: boolean;
}

export interface PoolStats {
  name: string;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  created: number;
  destroyed: number;
  acquired: number;
  released: number;
  errors: number;
}

export interface AcquireOptions {
  timeout?: number;
  priority?: number;
}

interface WaitingRequest<T> {
  resolve: (connection: T) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  priority: number;
  timestamp: number;
}

@Injectable()
export class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private readonly pools = new Map<string, {
    options: Required<ConnectionPoolOptions<any>>;
    connections: PooledConnection<any>[];
    activeConnections: Set<string>;
    waitingQueue: WaitingRequest<any>[];
    stats: {
      created: number;
      destroyed: number;
      acquired: number;
      released: number;
      errors: number;
    };
    evictionTimer?: NodeJS.Timeout;
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('ConnectionPoolService initialized');
  }

  onModuleDestroy() {
    for (const [name] of this.pools) {
      this.destroyPool(name);
    }
  }

  createPool<T>(options: ConnectionPoolOptions<T>): void {
    const name = options.name;

    if (this.pools.has(name)) {
      throw new Error(`Pool '${name}' already exists`);
    }

    const defaultOptions: Required<ConnectionPoolOptions<T>> = {
      name,
      factory: options.factory,
      destroyer: options.destroyer,
      validator: options.validator || (() => Promise.resolve(true)),
      min: options.min ?? 0,
      max: options.max ?? 10,
      acquireTimeout: options.acquireTimeout ?? 30000,
      idleTimeout: options.idleTimeout ?? 300000,
      evictionInterval: options.evictionInterval ?? 60000,
      testOnBorrow: options.testOnBorrow ?? true,
      testOnReturn: options.testOnReturn ?? false,
    };

    const pool = {
      options: defaultOptions,
      connections: [],
      activeConnections: new Set<string>(),
      waitingQueue: [],
      stats: {
        created: 0,
        destroyed: 0,
        acquired: 0,
        released: 0,
        errors: 0,
      },
    };

    this.pools.set(name, pool);

    this.initializeMinConnections(pool);
    this.startEvictionTimer(name, pool.options);

    this.logger.log(`Pool '${name}' created with min=${defaultOptions.min}, max=${defaultOptions.max}`);
  }

  async acquire<T>(poolName: string, options?: AcquireOptions): Promise<T> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    const timeout = options?.timeout ?? pool.options.acquireTimeout;

    const idleConnection = this.findIdleConnection(pool);
    if (idleConnection) {
      if (pool.options.testOnBorrow) {
        const isValid = await pool.options.validator(idleConnection.connection);
        if (!isValid) {
          await this.removeConnection(pool, idleConnection);
          return this.acquire(poolName, options);
        }
      }

      idleConnection.lastUsedAt = Date.now();
      pool.activeConnections.add(idleConnection.id);
      pool.stats.acquired++;

      return idleConnection.connection;
    }

    if (pool.connections.length < pool.options.max) {
      const connection = await this.createConnection(pool);
      pool.activeConnections.add(connection.id);
      pool.stats.acquired++;

      return connection.connection;
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = pool.waitingQueue.findIndex(r => r.resolve === resolve);
        if (index !== -1) {
          pool.waitingQueue.splice(index, 1);
          pool.stats.errors++;
          reject(new Error(`Acquire timeout for pool '${poolName}'`));
        }
      }, timeout);

      pool.waitingQueue.push({
        resolve: resolve as any,
        reject,
        timeout: timeoutId,
        priority: options?.priority ?? 0,
        timestamp: Date.now(),
      });

      pool.waitingQueue.sort((a, b) => b.priority - a.priority);
    });
  }

  async release<T>(poolName: string, connection: T): Promise<void> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    const pooledConnection = pool.connections.find(c => c.connection === connection);
    if (!pooledConnection) {
      this.logger.warn(`Connection not found in pool '${poolName}'`);
      return;
    }

    pool.activeConnections.delete(pooledConnection.id);
    pool.stats.released++;

    if (pool.options.testOnReturn) {
      const isValid = await pool.options.validator(connection);
      if (!isValid) {
        await this.removeConnection(pool, pooledConnection);
        return;
      }
    }

    pooledConnection.lastUsedAt = Date.now();

    if (pool.waitingQueue.length > 0) {
      const request = pool.waitingQueue.shift()!;
      clearTimeout(request.timeout);
      pool.activeConnections.add(pooledConnection.id);
      pool.stats.acquired++;
      request.resolve(pooledConnection.connection);
    }
  }

  async destroy<T>(poolName: string, connection: T): Promise<void> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    const pooledConnection = pool.connections.find(c => c.connection === connection);
    if (pooledConnection) {
      await this.removeConnection(pool, pooledConnection);
    }
  }

  getStats(poolName: string): PoolStats {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    return {
      name: poolName,
      totalConnections: pool.connections.length,
      activeConnections: pool.activeConnections.size,
      idleConnections: pool.connections.length - pool.activeConnections.size,
      waitingRequests: pool.waitingQueue.length,
      created: pool.stats.created,
      destroyed: pool.stats.destroyed,
      acquired: pool.stats.acquired,
      released: pool.stats.released,
      errors: pool.stats.errors,
    };
  }

  getAllStats(): PoolStats[] {
    const stats: PoolStats[] = [];
    for (const name of this.pools.keys()) {
      stats.push(this.getStats(name));
    }
    return stats;
  }

  async drain(poolName: string): Promise<void> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }

    for (const request of pool.waitingQueue) {
      clearTimeout(request.timeout);
      request.reject(new Error(`Pool '${poolName}' is being drained`));
    }
    pool.waitingQueue.length = 0;

    for (const connection of pool.connections) {
      await this.removeConnection(pool, connection);
    }

    this.logger.log(`Pool '${poolName}' drained`);
  }

  destroyPool(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    if (pool.evictionTimer) {
      clearInterval(pool.evictionTimer);
    }

    for (const request of pool.waitingQueue) {
      clearTimeout(request.timeout);
      request.reject(new Error(`Pool '${poolName}' is being destroyed`));
    }

    Promise.all(
      pool.connections.map(c =>
        pool.options.destroyer(c.connection).catch(err =>
          this.logger.error(`Failed to destroy connection in pool '${poolName}'`, err)
        )
      )
    );

    this.pools.delete(poolName);
    this.logger.log(`Pool '${poolName}' destroyed`);
  }

  async withConnection<T, R>(
    poolName: string,
    fn: (connection: T) => Promise<R>,
    options?: AcquireOptions,
  ): Promise<R> {
    const connection = await this.acquire<T>(poolName, options);
    try {
      return await fn(connection);
    } finally {
      await this.release(poolName, connection);
    }
  }

  private async initializeMinConnections<T>(pool: {
    options: Required<ConnectionPoolOptions<T>>;
    connections: PooledConnection<T>[];
    activeConnections: Set<string>;
    stats: { created: number; destroyed: number; acquired: number; released: number; errors: number };
  }): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < pool.options.min; i++) {
      promises.push(
        this.createConnection(pool).then(() => {}).catch(err => {
          this.logger.error(`Failed to create initial connection`, err);
          pool.stats.errors++;
        })
      );
    }

    await Promise.all(promises);
  }

  private async createConnection<T>(pool: {
    options: Required<ConnectionPoolOptions<T>>;
    connections: PooledConnection<T>[];
    stats: { created: number; destroyed: number; acquired: number; released: number; errors: number };
  }): Promise<PooledConnection<T>> {
    try {
      const connection = await pool.options.factory();
      const pooledConnection: PooledConnection<T> = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        connection,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        isValidating: false,
      };

      pool.connections.push(pooledConnection);
      pool.stats.created++;

      return pooledConnection;
    } catch (error) {
      pool.stats.errors++;
      throw error;
    }
  }

  private async removeConnection<T>(
    pool: {
      options: Required<ConnectionPoolOptions<T>>;
      connections: PooledConnection<T>[];
      activeConnections: Set<string>;
      stats: { created: number; destroyed: number; acquired: number; released: number; errors: number };
    },
    pooledConnection: PooledConnection<T>,
  ): Promise<void> {
    const index = pool.connections.indexOf(pooledConnection);
    if (index === -1) return;

    pool.connections.splice(index, 1);
    pool.activeConnections.delete(pooledConnection.id);

    try {
      await pool.options.destroyer(pooledConnection.connection);
      pool.stats.destroyed++;
    } catch (error) {
      this.logger.error(`Failed to destroy connection`, error);
      pool.stats.errors++;
    }
  }

  private findIdleConnection<T>(pool: {
    options: Required<ConnectionPoolOptions<T>>;
    connections: PooledConnection<T>[];
    activeConnections: Set<string>;
  }): PooledConnection<T> | null {
    for (const connection of pool.connections) {
      if (!pool.activeConnections.has(connection.id) && !connection.isValidating) {
        return connection;
      }
    }
    return null;
  }

  private startEvictionTimer<T>(poolName: string, options: Required<ConnectionPoolOptions<T>>): void {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    pool.evictionTimer = setInterval(async () => {
      await this.evictIdleConnections(poolName);
    }, options.evictionInterval);
  }

  private async evictIdleConnections(poolName: string): Promise<void> {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    const now = Date.now();
    const connectionsToRemove: PooledConnection<any>[] = [];

    for (const connection of pool.connections) {
      if (
        !pool.activeConnections.has(connection.id) &&
        now - connection.lastUsedAt > pool.options.idleTimeout &&
        pool.connections.length - connectionsToRemove.length > pool.options.min
      ) {
        connectionsToRemove.push(connection);
      }
    }

    for (const connection of connectionsToRemove) {
      await this.removeConnection(pool, connection);
    }

    if (connectionsToRemove.length > 0) {
      this.logger.debug(`Evicted ${connectionsToRemove.length} idle connections from pool '${poolName}'`);
    }
  }
}
