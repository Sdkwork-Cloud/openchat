// OpenChat SDK - Memory Type Definitions
// 记忆管理类型定义

// ==================== 记忆类型枚举 ====================

/**
 * 记忆类型
 */
export enum MemoryType {
  EPISODIC = 'EPISODIC',
  SEMANTIC = 'SEMANTIC',
  PROCEDURAL = 'PROCEDURAL'
}

/**
 * 记忆来源
 */
export enum MemorySource {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  OBSERVATION = 'OBSERVATION'
}

/**
 * 知识文档状态
 */
export enum KnowledgeDocumentStatus {
  PENDING = 'PENDING',
  INDEXING = 'INDEXING',
  READY = 'READY',
  FAILED = 'FAILED'
}

// ==================== 核心数据结构 ====================

/**
 * 记忆条目
 */
export interface Memory {
  id: string;
  agentId: string;
  userId?: string;
  type: MemoryType;
  content: string;
  source: MemorySource;
  sessionId?: string;
  relevance?: number;
  embeddingId?: string;
  timestamp: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * 记忆查询参数
 */
export interface MemoryQueryParams {
  type?: MemoryType;
  source?: MemorySource;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

/**
 * 记忆搜索参数
 */
export interface MemorySearchParams {
  q: string;
  type?: MemoryType;
  limit?: number;
  threshold?: number;
}

/**
 * 语义搜索参数
 */
export interface SemanticSearchParams {
  q: string;
  limit?: number;
}

/**
 * 存储记忆参数
 */
export interface StoreMemoryParams {
  type: MemoryType;
  content: string;
  source: MemorySource;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  totalMemories: number;
  episodicCount: number;
  semanticCount: number;
  proceduralCount: number;
  lastUpdated: string;
}

// ==================== 会话记忆相关 ====================

/**
 * 会话历史消息
 */
export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * 会话历史
 */
export interface SessionHistory {
  sessionId: string;
  messages: SessionMessage[];
  total: number;
}

/**
 * 会话总结参数
 */
export interface SummarizeSessionParams {
  maxTokens?: number;
  language?: string;
}

/**
 * 会话总结结果
 */
export interface SessionSummary {
  sessionId: string;
  summary: string;
  keyPoints: string[];
  createdAt: string;
}

// ==================== 知识文档相关 ====================

/**
 * 知识文档
 */
export interface KnowledgeDocument {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  sourceType: string;
  status: KnowledgeDocumentStatus;
  chunkCount?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * 知识文档查询参数
 */
export interface KnowledgeQueryParams {
  status?: KnowledgeDocumentStatus;
  sourceType?: string;
  limit?: number;
  offset?: number;
}

/**
 * 添加知识文档参数
 */
export interface AddKnowledgeDocumentParams {
  title: string;
  description?: string;
  content?: string;
  url?: string;
  sourceType: string;
  metadata?: Record<string, any>;
}

/**
 * 知识搜索参数
 */
export interface KnowledgeSearchParams {
  q: string;
  limit?: number;
  threshold?: number;
}

/**
 * 知识统计
 */
export interface KnowledgeStats {
  totalDocuments: number;
  readyCount: number;
  indexingCount: number;
  failedCount: number;
  totalChunks: number;
}

/**
 * 文档片段
 */
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  embeddingId?: string;
  createdAt: string;
}

// ==================== API 响应类型 ====================

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * 搜索结果
 */
export interface SearchResult<T> {
  item: T;
  relevance: number;
}
