import { MemoryType, MemorySource, MemoryMetadata, ExtractedEntity } from './memory.entity';

export interface MemoryEntry {
  id: string;
  agentId: string;
  sessionId?: string;
  userId?: string;
  content: string;
  type: MemoryType;
  source: MemorySource;
  embedding?: number[];
  importance?: number;
  decayFactor?: number;
  accessCount?: number;
  lastAccessedAt?: Date;
  metadata?: MemoryMetadata;
  timestamp: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryQuery {
  content?: string;
  type?: MemoryType;
  source?: MemorySource;
  sessionId?: string;
  userId?: string;
  agentId: string;
  limit?: number;
  offset?: number;
  threshold?: number;
  filters?: MemoryFilters;
}

export interface MemoryFilters {
  startTime?: Date;
  endTime?: Date;
  tags?: string[];
  category?: string;
  sourcePath?: string;
  minImportance?: number;
  maxImportance?: number;
}

export interface MemorySearchResult {
  memory: MemoryEntry;
  score: number;
  relevance: number;
  context?: string;
}

export interface MemoryStats {
  totalCount: number;
  byType: Record<MemoryType, number>;
  bySource: Record<MemorySource, number>;
  oldestTimestamp?: Date;
  newestTimestamp?: Date;
  averageImportance?: number;
  totalAccessCount?: number;
}

export interface MemoryConfig {
  maxTokens?: number;
  limit?: number;
  embeddingModel?: string;
  embeddingDimension?: number;
  searchThreshold?: number;
  searchLimit?: number;
  enableCache?: boolean;
  cacheSize?: number;
  decayRate?: number;
  importanceThreshold?: number;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface VectorStore {
  add(id: string, embedding: number[], metadata?: Record<string, unknown>): Promise<void>;
  search(query: number[], limit: number, threshold?: number): Promise<Array<{ id: string; score: number }>>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface MemoryStore {
  store(memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry>;
  retrieve(id: string): Promise<MemoryEntry | null>;
  search(query: MemoryQuery): Promise<MemorySearchResult[]>;
  delete(id: string): Promise<boolean>;
  clear(agentId: string, sessionId?: string): Promise<void>;
}

export interface AdvancedMemoryStore extends MemoryStore {
  storeBatch(memories: Array<Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MemoryEntry[]>;
  deleteBySession(sessionId: string): Promise<void>;
  semanticSearch(query: string, agentId: string, limit?: number): Promise<MemorySearchResult[]>;
  fullTextSearch(query: string, agentId: string, limit?: number): Promise<MemorySearchResult[]>;
  hybridSearch(query: string, agentId: string, limit?: number): Promise<MemorySearchResult[]>;
  count(agentId: string): Promise<number>;
  getStats(agentId: string): Promise<MemoryStats>;
}

export interface SessionMemory {
  sessionId: string;
  agentId: string;
  messages: SessionMessage[];
  summary?: string;
  keyPoints?: string[];
  entities?: ExtractedEntity[];
  topics?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeDocumentInput {
  title: string;
  content: string;
  description?: string;
  sourcePath?: string;
  sourceType?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryEvent {
  type: 'stored' | 'retrieved' | 'searched' | 'deleted' | 'expired' | 'summarized';
  memoryId?: string;
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type MemoryEventHandler = (event: MemoryEvent) => void | Promise<void>;

export interface MemorySummaryResult {
  summary: string;
  keyPoints: string[];
  entities: ExtractedEntity[];
  topics: string[];
  messageCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ConversationContext {
  messages: SessionMessage[];
  totalTokens: number;
  truncated: boolean;
  summary?: string;
}

export interface MemoryConsolidationResult {
  consolidated: number;
  archived: number;
  deleted: number;
  errors: string[];
}

export interface MemoryRetrievalOptions {
  includeExpired?: boolean;
  sortBy?: 'timestamp' | 'importance' | 'accessCount';
  sortOrder?: 'asc' | 'desc';
  maxTokens?: number;
}
