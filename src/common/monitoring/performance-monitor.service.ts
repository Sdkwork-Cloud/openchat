import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface SlowQueryLog {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
}

interface PerformanceMetrics {
  totalQueries: number;
  slowQueries: number;
  avgQueryTime: number;
  maxQueryTime: number;
  connectionCount: number;
  idleConnections: number;
}

@Injectable()
export class PerformanceMonitorService implements OnModuleInit {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly slowQueryThreshold: number;
  private readonly slowQueries: SlowQueryLog[] = [];
  private readonly queryTimes: number[] = [];
  private readonly maxSlowQueryLogs = 100;
  private readonly metricsWindow = 60000;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.slowQueryThreshold = this.configService.get('SLOW_QUERY_THRESHOLD', 1000);
  }

  onModuleInit() {
    this.logger.log('Performance monitor initialized');
  }

  logSlowQuery(query: string, duration: number, params?: any[]): void {
    if (duration > this.slowQueryThreshold) {
      const logEntry: SlowQueryLog = {
        query: query.substring(0, 500),
        duration,
        timestamp: new Date(),
        params,
      };

      this.slowQueries.push(logEntry);
      
      if (this.slowQueries.length > this.maxSlowQueryLogs) {
        this.slowQueries.shift();
      }

      this.logger.warn(
        `Slow query detected: ${duration}ms - ${query.substring(0, 200)}...`,
      );
    }

    this.queryTimes.push(duration);
    
    const cutoff = Date.now() - this.metricsWindow;
    while (this.queryTimes.length > 0) {
      // Keep only recent queries for metrics calculation
      if (this.queryTimes.length > 1000) {
        this.queryTimes.shift();
      } else {
        break;
      }
    }
  }

  getSlowQueries(limit: number = 20): SlowQueryLog[] {
    return this.slowQueries.slice(-limit);
  }

  getMetrics(): PerformanceMetrics {
    const totalQueries = this.queryTimes.length;
    const slowQueries = this.queryTimes.filter(t => t > this.slowQueryThreshold).length;
    const avgQueryTime = totalQueries > 0
      ? this.queryTimes.reduce((a, b) => a + b, 0) / totalQueries
      : 0;
    const maxQueryTime = totalQueries > 0
      ? Math.max(...this.queryTimes)
      : 0;

    return {
      totalQueries,
      slowQueries,
      avgQueryTime: Math.round(avgQueryTime * 100) / 100,
      maxQueryTime,
      connectionCount: 0,
      idleConnections: 0,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkDatabaseHealth(): Promise<void> {
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const duration = Date.now() - start;

      if (duration > 1000) {
        this.logger.warn(`Database health check slow: ${duration}ms`);
      }
    } catch (error) {
      this.logger.error('Database health check failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async analyzeTableStats(): Promise<void> {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          schemaname,
          relname as table_name,
          n_live_tup as row_count,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE n_live_tup > 10000
        ORDER BY n_live_tup DESC
        LIMIT 10
      `);

      for (const table of result) {
        const deadRatio = table.dead_rows / (table.row_count || 1);
        if (deadRatio > 0.1) {
          this.logger.warn(
            `Table ${table.table_name} has high dead row ratio: ${(deadRatio * 100).toFixed(2)}%`,
          );
        }
      }
    } catch (error) {
      this.logger.debug('Could not analyze table stats:', error);
    }
  }

  async getIndexUsageStats(): Promise<any[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT
          schemaname,
          relname as table_name,
          indexrelname as index_name,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
        LIMIT 20
      `);

      return result;
    } catch (error) {
      this.logger.error('Failed to get index usage stats:', error);
      return [];
    }
  }

  async getUnusedIndexes(): Promise<any[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT
          schemaname || '.' || relname AS table,
          indexrelname AS index,
          pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
          idx_scan as index_scans
        FROM pg_stat_user_indexes ui
        JOIN pg_index i ON ui.indexrelid = i.indexrelid
        WHERE NOT i.indisunique 
          AND idx_scan < 50 
          AND pg_relation_size(i.indexrelid) > 1024 * 1024
        ORDER BY pg_relation_size(i.indexrelid) DESC
        LIMIT 10
      `);

      if (result.length > 0) {
        this.logger.warn(`Found ${result.length} potentially unused indexes`);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to get unused indexes:', error);
      return [];
    }
  }

  clearMetrics(): void {
    this.slowQueries.length = 0;
    this.queryTimes.length = 0;
    this.logger.log('Performance metrics cleared');
  }
}
