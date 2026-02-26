import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentMemory,
  MemorySummary,
  KnowledgeChunk,
  KnowledgeDocument,
  MemoryVector,
  MemoryType,
  MemorySource,
} from './memory.entity';
import {
  MemoryEntry,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
  MemoryConfig,
  SessionMessage,
  MemorySummaryResult,
  ConversationContext,
  MemoryConsolidationResult,
  MemoryRetrievalOptions,
  AdvancedMemoryStore,
  MemoryEvent,
  MemoryEventHandler,
} from './memory.interface';
import { EmbeddingService } from './embedding.service';
import { MemoryCacheService } from './memory-cache.service';

@Injectable()
export class MemoryManagerService implements AdvancedMemoryStore, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryManagerService.name);
  private config: MemoryConfig;
  private eventHandlers: Map<string, MemoryEventHandler[]> = new Map();
  private consolidationInterval: NodeJS.Timeout | null = null;

  constructor(
    private configService: ConfigService,
    @InjectRepository(AgentMemory)
    private memoryRepository: Repository<AgentMemory>,
    @InjectRepository(MemorySummary)
    private summaryRepository: Repository<MemorySummary>,
    @InjectRepository(KnowledgeChunk)
    private chunkRepository: Repository<KnowledgeChunk>,
    @InjectRepository(KnowledgeDocument)
    private documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(MemoryVector)
    private vectorRepository: Repository<MemoryVector>,
    private embeddingService: EmbeddingService,
    private cacheService: MemoryCacheService,
  ) {
    this.config = {
      maxTokens: configService.get<number>('MEMORY_MAX_TOKENS', 8000),
      limit: configService.get<number>('MEMORY_LIMIT', 1000),
      embeddingModel: configService.get<string>('EMBEDDING_MODEL', 'text-embedding-3-small'),
      embeddingDimension: configService.get<number>('EMBEDDING_DIMENSION', 1536),
      searchThreshold: configService.get<number>('MEMORY_SEARCH_THRESHOLD', 0.7),
      searchLimit: configService.get<number>('MEMORY_SEARCH_LIMIT', 10),
      enableCache: configService.get<boolean>('MEMORY_ENABLE_CACHE', true),
      cacheSize: configService.get<number>('MEMORY_CACHE_SIZE', 1000),
      decayRate: configService.get<number>('MEMORY_DECAY_RATE', 0.1),
      importanceThreshold: configService.get<number>('MEMORY_IMPORTANCE_THRESHOLD', 0.3),
    };
  }

  async onModuleInit() {
    this.logger.log('Memory Manager Service initialized');

    if (this.configService.get<boolean>('MEMORY_AUTO_CONSOLIDATION', false)) {
      const interval = this.configService.get<number>('MEMORY_CONSOLIDATION_INTERVAL', 3600000);
      // 使用递归 setTimeout 替代 setInterval，避免并发执行
      const scheduleConsolidation = () => {
        this.consolidationInterval = setTimeout(async () => {
          try {
            await this.runConsolidation();
          } catch (error) {
            this.logger.error('Error during memory consolidation:', error);
          } finally {
            // 只有当前任务完成后才调度下一次
            scheduleConsolidation();
          }
        }, interval);
      };
      scheduleConsolidation();
    }
  }

  onModuleDestroy() {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
    }
  }

  async store(memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry> {
    const now = new Date();
    
    let embedding = memory.embedding;
    if (!embedding && this.config.enableCache) {
      embedding = await this.embeddingService.embed(memory.content);
    }

    const importance = memory.importance ?? await this.calculateImportance(memory);

    const entity = this.memoryRepository.create({
      id: uuidv4(),
      agentId: memory.agentId,
      sessionId: memory.sessionId,
      userId: memory.userId,
      content: memory.content,
      type: memory.type || 'episodic',
      source: memory.source || 'conversation',
      embedding,
      importance,
      decayFactor: 1.0,
      accessCount: 0,
      lastAccessedAt: now,
      metadata: memory.metadata || {},
      timestamp: memory.timestamp || now,
      expiresAt: memory.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.memoryRepository.save(entity);

    if (embedding) {
      await this.vectorRepository.save({
        id: uuidv4(),
        agentId: memory.agentId,
        memoryId: saved.id,
        embedding,
        embeddingModel: this.config.embeddingModel,
        createdAt: now,
      });
    }

    this.emitEvent({
      type: 'stored',
      memoryId: saved.id,
      agentId: memory.agentId,
      sessionId: memory.sessionId,
      timestamp: now,
    });

    this.cacheService.invalidate(memory.agentId, memory.sessionId);

    this.logger.debug(`Stored memory: ${saved.id} for agent: ${memory.agentId}`);
    
    return this.toMemoryEntry(saved);
  }

  async storeBatch(memories: Array<Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MemoryEntry[]> {
    // 空数组检查，避免不必要的循环
    if (!memories || memories.length === 0) {
      return [];
    }

    const results: MemoryEntry[] = [];

    for (const memory of memories) {
      const result = await this.store(memory);
      results.push(result);
    }

    return results;
  }

  async retrieve(id: string): Promise<MemoryEntry | null> {
    const cached = this.cacheService.get(id);
    if (cached) {
      return cached;
    }

    const entity = await this.memoryRepository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }

    entity.accessCount += 1;
    entity.lastAccessedAt = new Date();
    await this.memoryRepository.save(entity);

    const entry = this.toMemoryEntry(entity);
    this.cacheService.set(id, entry);

    this.emitEvent({
      type: 'retrieved',
      memoryId: id,
      agentId: entity.agentId,
      timestamp: new Date(),
    });

    return entry;
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const { agentId, limit = 10, threshold = this.config.searchThreshold, filters } = query;

    const queryBuilder = this.memoryRepository.createQueryBuilder('memory')
      .where('memory.agentId = :agentId', { agentId })
      .orderBy('memory.importance', 'DESC')
      .addOrderBy('memory.timestamp', 'DESC')
      .take(limit);

    if (query.type) {
      queryBuilder.andWhere('memory.type = :type', { type: query.type });
    }

    if (query.source) {
      queryBuilder.andWhere('memory.source = :source', { source: query.source });
    }

    if (query.sessionId) {
      queryBuilder.andWhere('memory.sessionId = :sessionId', { sessionId: query.sessionId });
    }

    if (filters?.startTime) {
      queryBuilder.andWhere('memory.timestamp >= :startTime', { startTime: filters.startTime });
    }

    if (filters?.endTime) {
      queryBuilder.andWhere('memory.timestamp <= :endTime', { endTime: filters.endTime });
    }

    if (filters?.minImportance) {
      queryBuilder.andWhere('memory.importance >= :minImportance', { minImportance: filters.minImportance });
    }

    if (filters?.category) {
      queryBuilder.andWhere("memory.metadata->>'category' = :category", { category: filters.category });
    }

    const entities = await queryBuilder.getMany();

    let queryEmbedding: number[] | undefined;
    if (query.content) {
      queryEmbedding = await this.embeddingService.embed(query.content);
    }

    const results: MemorySearchResult[] = entities.map(entity => {
      let score = 1.0;
      let relevance = 1.0;

      if (queryEmbedding && entity.embedding) {
        score = this.cosineSimilarity(queryEmbedding, entity.embedding);
        relevance = score;
      }

      if (entity.importance) {
        relevance *= (0.5 + 0.5 * entity.importance);
      }

      const decayedImportance = (entity.importance || 0.5) * (entity.decayFactor || 1.0);
      relevance *= (0.7 + 0.3 * decayedImportance);

      return {
        memory: this.toMemoryEntry(entity),
        score,
        relevance,
      };
    });

    const filtered = results.filter(r => r.relevance >= (threshold || this.config.searchThreshold || 0.7));
    
    this.emitEvent({
      type: 'searched',
      agentId,
      sessionId: query.sessionId,
      timestamp: new Date(),
      metadata: { query: query.content, resultCount: filtered.length },
    });

    return filtered.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  async semanticSearch(query: string, agentId: string, limit: number = 10): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query);

    // 限制最大查询数量，避免内存溢出
    const MAX_VECTORS_TO_LOAD = 10000;

    const vectors = await this.vectorRepository
      .createQueryBuilder('vector')
      .where('vector.agentId = :agentId', { agentId })
      .take(MAX_VECTORS_TO_LOAD) // 限制最大数量
      .getMany();

    // 如果数据量很大，记录警告
    if (vectors.length >= MAX_VECTORS_TO_LOAD) {
      this.logger.warn(`Semantic search loaded maximum ${MAX_VECTORS_TO_LOAD} vectors for agent ${agentId}. Consider implementing database-level vector search.`);
    }

    const scoredVectors: Array<{ id: string; score: number }> = vectors.map(v => ({
      id: v.memoryId,
      score: this.cosineSimilarity(queryEmbedding, v.embedding),
    }));

    scoredVectors.sort((a, b) => b.score - a.score);
    const topIds = scoredVectors.slice(0, limit).map(v => v.id);

    if (topIds.length === 0) {
      return [];
    }

    const memories = await this.memoryRepository.find({
      where: { id: In(topIds) },
    });

    const memoryMap = new Map(memories.map(m => [m.id, m]));

    return scoredVectors.slice(0, limit).map(v => {
      const memory = memoryMap.get(v.id);
      if (!memory) {
        this.logger.warn(`Memory not found for vector id: ${v.id}`);
        return null;
      }
      return {
        memory: this.toMemoryEntry(memory),
        score: v.score,
        relevance: v.score,
      };
    }).filter((result): result is NonNullable<typeof result> => result !== null);
  }

  async fullTextSearch(query: string, agentId: string, limit: number = 10): Promise<MemorySearchResult[]> {
    const entities = await this.memoryRepository
      .createQueryBuilder('memory')
      .where('memory.agentId = :agentId', { agentId })
      .andWhere('memory.content ILIKE :query', { query: `%${query}%` })
      .orderBy('memory.timestamp', 'DESC')
      .take(limit)
      .getMany();

    return entities.map(entity => ({
      memory: this.toMemoryEntry(entity),
      score: 1.0,
      relevance: 1.0,
    }));
  }

  async hybridSearch(query: string, agentId: string, limit: number = 10): Promise<MemorySearchResult[]> {
    const [semanticResults, fullTextResults] = await Promise.all([
      this.semanticSearch(query, agentId, limit),
      this.fullTextSearch(query, agentId, limit),
    ]);

    const mergedMap = new Map<string, MemorySearchResult>();

    for (const result of semanticResults) {
      mergedMap.set(result.memory.id, {
        ...result,
        relevance: result.relevance * 0.7,
      });
    }

    for (const result of fullTextResults) {
      const existing = mergedMap.get(result.memory.id);
      if (existing) {
        existing.relevance += result.relevance * 0.3;
      } else {
        mergedMap.set(result.memory.id, {
          ...result,
          relevance: result.relevance * 0.3,
        });
      }
    }

    return Array.from(mergedMap.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  async delete(id: string): Promise<boolean> {
    const entity = await this.memoryRepository.findOne({ where: { id } });
    if (!entity) {
      return false;
    }

    await this.memoryRepository.delete(id);
    await this.vectorRepository.delete({ memoryId: id });
    this.cacheService.delete(id);

    this.emitEvent({
      type: 'deleted',
      memoryId: id,
      agentId: entity.agentId,
      timestamp: new Date(),
    });

    return true;
  }

  async deleteBySession(sessionId: string): Promise<void> {
    const memories = await this.memoryRepository.find({ where: { sessionId } });
    
    for (const memory of memories) {
      await this.vectorRepository.delete({ memoryId: memory.id });
    }

    await this.memoryRepository.delete({ sessionId });
    this.cacheService.invalidateBySession(sessionId);

    this.logger.log(`Deleted ${memories.length} memories for session: ${sessionId}`);
  }

  async clear(agentId: string, sessionId?: string): Promise<void> {
    const where: any = { agentId };
    if (sessionId) {
      where.sessionId = sessionId;
    }

    const memories = await this.memoryRepository.find({ where });

    for (const memory of memories) {
      await this.vectorRepository.delete({ memoryId: memory.id });
    }

    await this.memoryRepository.delete(where);
    this.cacheService.invalidate(agentId, sessionId);

    this.logger.log(`Cleared memories for agent: ${agentId}`);
  }

  async count(agentId: string): Promise<number> {
    return this.memoryRepository.count({ where: { agentId } });
  }

  async getStats(agentId: string): Promise<MemoryStats> {
    // 使用聚合查询而不是加载所有数据到内存
    const typeStats = await this.memoryRepository
      .createQueryBuilder('memory')
      .select('memory.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('memory.agentId = :agentId', { agentId })
      .groupBy('memory.type')
      .getRawMany();

    const sourceStats = await this.memoryRepository
      .createQueryBuilder('memory')
      .select('memory.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('memory.agentId = :agentId', { agentId })
      .groupBy('memory.source')
      .getRawMany();

    const totalMemories = await this.memoryRepository.count({ where: { agentId } });

    const byType: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      working: 0,
    };

    const bySource: Record<MemorySource, number> = {
      conversation: 0,
      document: 0,
      system: 0,
      user: 0,
      knowledge: 0,
    };

    // 填充聚合统计结果
    typeStats.forEach((stat: { type: MemoryType; count: string }) => {
      byType[stat.type] = parseInt(stat.count, 10);
    });

    sourceStats.forEach((stat: { source: MemorySource; count: string }) => {
      bySource[stat.source] = parseInt(stat.count, 10);
    });

    // 使用单独的聚合查询获取平均值和极值
    const avgStats = await this.memoryRepository
      .createQueryBuilder('memory')
      .select('AVG(memory.importance)', 'avgImportance')
      .addSelect('AVG(memory.accessCount)', 'avgAccessCount')
      .addSelect('MIN(memory.createdAt)', 'oldestTimestamp')
      .addSelect('MAX(memory.createdAt)', 'newestTimestamp')
      .where('memory.agentId = :agentId', { agentId })
      .getRawOne();

    const avgImportance = parseFloat(avgStats?.avgImportance || '0');
    const avgAccessCount = parseFloat(avgStats?.avgAccessCount || '0');
    const oldestTimestamp = avgStats?.oldestTimestamp;
    const newestTimestamp = avgStats?.newestTimestamp;

    return {
      totalCount: totalMemories,
      byType,
      bySource,
      oldestTimestamp,
      newestTimestamp,
      averageImportance: avgImportance,
      totalAccessCount: Math.round(avgAccessCount * totalMemories),
    };
  }

  async getConversationHistory(
    agentId: string,
    sessionId: string,
    maxTokens: number = this.config.maxTokens || 8000,
  ): Promise<ConversationContext> {
    const memories = await this.memoryRepository.find({
      where: { agentId, sessionId, type: 'episodic' },
      order: { timestamp: 'ASC' },
    });

    const messages: SessionMessage[] = [];
    let totalTokens = 0;
    let truncated = false;

    for (let i = memories.length - 1; i >= 0; i--) {
      const memory = memories[i];
      const tokens = this.estimateTokens(memory.content);

      if (totalTokens + tokens > maxTokens) {
        truncated = true;
        break;
      }

      messages.unshift({
        id: memory.id,
        role: (memory.metadata?.role as any) || 'user',
        content: memory.content,
        timestamp: memory.timestamp,
        metadata: memory.metadata as Record<string, unknown>,
      });

      totalTokens += tokens;
    }

    let summary: string | undefined;
    if (truncated) {
      const summaryEntity = await this.summaryRepository.findOne({
        where: { agentId, sessionId },
        order: { createdAt: 'DESC' },
      });
      summary = summaryEntity?.summary;
    }

    return {
      messages,
      totalTokens,
      truncated,
      summary,
    };
  }

  async summarizeSession(
    agentId: string,
    sessionId: string,
  ): Promise<MemorySummaryResult> {
    const memories = await this.memoryRepository.find({
      where: { agentId, sessionId, type: 'episodic' },
      order: { timestamp: 'ASC' },
    });

    if (memories.length === 0) {
      return {
        summary: 'No conversation history.',
        keyPoints: [],
        entities: [],
        topics: [],
        messageCount: 0,
        timeRange: {
          start: new Date(),
          end: new Date(),
        },
      };
    }

    const conversation = memories
      .map(m => `${m.metadata?.role || 'user'}: ${m.content}`)
      .join('\n');

    const summary = await this.generateSummary(conversation);
    const keyPoints = await this.extractKeyPoints(conversation);
    const entities = await this.extractEntities(conversation);
    const topics = await this.extractTopics(conversation);

    const summaryEntity = this.summaryRepository.create({
      id: uuidv4(),
      agentId,
      sessionId,
      summary,
      messageCount: memories.length,
      keyPoints,
      entities,
      topics,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.summaryRepository.save(summaryEntity);

    this.emitEvent({
      type: 'summarized',
      agentId,
      sessionId,
      timestamp: new Date(),
      metadata: { messageCount: memories.length },
    });

    return {
      summary,
      keyPoints,
      entities,
      topics,
      messageCount: memories.length,
      timeRange: {
        start: memories.length > 0 ? memories[0].timestamp : new Date(),
        end: memories.length > 0 ? memories[memories.length - 1].timestamp : new Date(),
      },
    };
  }

  async storeMessage(
    agentId: string,
    sessionId: string,
    message: { role: 'user' | 'assistant' | 'system' | 'tool'; content: string },
    userId?: string,
  ): Promise<MemoryEntry> {
    return this.store({
      agentId,
      sessionId,
      userId,
      content: message.content,
      type: 'episodic',
      source: 'conversation',
      timestamp: new Date(),
      metadata: {
        role: message.role,
      },
    });
  }

  async getRecentMemories(
    agentId: string,
    limit: number = 10,
    options?: MemoryRetrievalOptions,
  ): Promise<MemoryEntry[]> {
    const queryBuilder = this.memoryRepository.createQueryBuilder('memory')
      .where('memory.agentId = :agentId', { agentId })
      .take(limit);

    if (!options?.includeExpired) {
      queryBuilder.andWhere(
        '(memory.expiresAt IS NULL OR memory.expiresAt > :now)',
        { now: new Date() }
      );
    }

    const sortField = options?.sortBy || 'timestamp';
    const sortOrder = options?.sortOrder || 'desc';
    queryBuilder.orderBy(`memory.${sortField}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    const entities = await queryBuilder.getMany();
    return entities.map(this.toMemoryEntry);
  }

  async updateImportance(id: string, importance: number): Promise<void> {
    await this.memoryRepository.update(id, { importance, updatedAt: new Date() });
  }

  async consolidateMemories(agentId: string): Promise<MemoryConsolidationResult> {
    const result: MemoryConsolidationResult = {
      consolidated: 0,
      archived: 0,
      deleted: 0,
      errors: [],
    };

    try {
      const expired = await this.memoryRepository.find({
        where: {
          agentId,
          expiresAt: LessThan(new Date()),
        },
      });

      for (const memory of expired) {
        await this.delete(memory.id);
        result.deleted++;
      }

      const oldMemories = await this.memoryRepository.find({
        where: {
          agentId,
          importance: LessThan(this.config.importanceThreshold || 0.3),
          timestamp: LessThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        },
      });

      for (const memory of oldMemories) {
        memory.type = 'semantic';
        memory.importance = Math.min(1, (memory.importance || 0.5) * 1.2);
        await this.memoryRepository.save(memory);
        result.archived++;
      }

      this.logger.log(`Memory consolidation completed for agent ${agentId}: ${JSON.stringify(result)}`);
    } catch (error) {
      result.errors.push(error.message);
    }

    return result;
  }

  on(event: string, handler: MemoryEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: MemoryEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emitEvent(event: MemoryEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          this.logger.error(`Error in memory event handler: ${error.message}`);
        }
      }
    }
  }

  private async calculateImportance(memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    let importance = 0.5;

    if (memory.type === 'semantic') {
      importance += 0.2;
    }

    if (memory.source === 'user') {
      importance += 0.1;
    }

    if (memory.metadata?.tags && memory.metadata.tags.length > 0) {
      importance += 0.1;
    }

    const contentLength = memory.content.length;
    if (contentLength > 500) {
      importance += 0.1;
    }

    return Math.min(1, importance);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private toMemoryEntry(entity: AgentMemory): MemoryEntry {
    return {
      id: entity.id,
      agentId: entity.agentId,
      sessionId: entity.sessionId,
      userId: entity.userId,
      content: entity.content,
      type: entity.type,
      source: entity.source,
      embedding: entity.embedding,
      importance: entity.importance,
      decayFactor: entity.decayFactor,
      accessCount: entity.accessCount,
      lastAccessedAt: entity.lastAccessedAt,
      metadata: entity.metadata,
      timestamp: entity.timestamp,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private async generateSummary(conversation: string): Promise<string> {
    if (conversation.length > 500) {
      return conversation.substring(0, 500) + '...';
    }
    return conversation;
  }

  private async extractKeyPoints(conversation: string): Promise<string[]> {
    const sentences = conversation.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 5).map(s => s.trim());
  }

  private async extractEntities(conversation: string): Promise<any[]> {
    const entities: any[] = [];
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const urlPattern = /https?:\/\/[^\s]+/g;
    
    const emails = conversation.match(emailPattern) || [];
    const urls = conversation.match(urlPattern) || [];

    emails.forEach(email => {
      entities.push({ type: 'other', name: email, mentions: 1 });
    });

    urls.forEach(url => {
      entities.push({ type: 'other', name: url, mentions: 1 });
    });

    return entities.slice(0, 10);
  }

  private async extractTopics(conversation: string): Promise<string[]> {
    const words = conversation.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4);

    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private async runConsolidation(): Promise<void> {
    this.logger.log('Running memory consolidation...');
  }
}
