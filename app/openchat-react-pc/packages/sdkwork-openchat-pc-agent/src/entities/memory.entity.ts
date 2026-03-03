/**
 * Memory 实体定义
 *
 * 与后端 API 对齐的记忆管理领域模型
 * 参考: src/modules/agent/memory/memory.entity.ts, memory.interface.ts
 */

export enum MemoryType {
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
  WORKING = 'working',
}

export enum MemorySource {
  CONVERSATION = 'conversation',
  DOCUMENT = 'document',
  SYSTEM = 'system',
  USER = 'user',
  KNOWLEDGE = 'knowledge',
}

export interface AgentMemory {
  id: string;
  uuid: string;
  agentId: string;
  userId?: string;
  sessionId?: string;
  type: MemoryType;
  source: MemorySource;
  content: string;
  embedding?: number[];
  importance: number;
  accessCount: number;
  lastAccessedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySummary {
  id: string;
  uuid: string;
  agentId: string;
  sessionId: string;
  summary: string;
  keyPoints: string[];
  entities: MemoryEntity[];
  sentiment?: string;
  topics?: string[];
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntity {
  name: string;
  type: string;
  mentions: number;
  relevance: number;
}

export interface KnowledgeChunk {
  id: string;
  uuid: string;
  documentId: string;
  agentId: string;
  content: string;
  embedding?: number[];
  chunkIndex: number;
  tokenCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  uuid: string;
  agentId: string;
  title: string;
  description?: string;
  content: string;
  sourcePath?: string;
  sourceType?: string;
  chunkCount: number;
  tokenCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryVector {
  id: string;
  uuid: string;
  memoryId: string;
  agentId: string;
  vector: number[];
  dimension: number;
  createdAt: string;
}

export interface MemorySearchResult {
  memory: AgentMemory;
  score: number;
  highlights?: string[];
}

export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  document: KnowledgeDocument;
  score: number;
  highlights?: string[];
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  bySource: Record<MemorySource, number>;
  totalTokens: number;
  avgImportance: number;
  oldestMemory?: string;
  newestMemory?: string;
}

export interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  byStatus: Record<string, number>;
  bySourceType: Record<string, number>;
}

export interface StoreMemoryRequest {
  content: string;
  type?: MemoryType;
  source?: MemorySource;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchMemoryRequest {
  query: string;
  type?: MemoryType;
  limit?: number;
  threshold?: number;
}

export interface AddKnowledgeDocumentRequest {
  title: string;
  content: string;
  description?: string;
  sourcePath?: string;
  sourceType?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchKnowledgeRequest {
  query: string;
  limit?: number;
  threshold?: number;
}

export interface GetMemoriesRequest {
  type?: MemoryType;
  source?: MemorySource;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

export interface ConversationHistoryItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ConsolidateResult {
  processed: number;
  consolidated: number;
  archived: number;
  deleted: number;
}
