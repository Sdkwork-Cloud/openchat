/**
 * Memory 服务层
 *
 * 职责：
 * 1. 调用后端 API 管理智能体记忆
 * 2. 提供记忆搜索、存储、删除等功能
 * 3. 管理知识库文档
 */

import { apiClient } from '@/services/api.client';
import { MemoryType } from '../entities/memory.entity';
import type {
  AgentMemory,
  MemorySummary,
  KnowledgeChunk,
  KnowledgeDocument,
  MemoryStats,
  KnowledgeStats,
  MemorySearchResult,
  KnowledgeSearchResult,
  StoreMemoryRequest,
  AddKnowledgeDocumentRequest,
  GetMemoriesRequest,
  ConversationHistoryItem,
  ConsolidateResult,
} from '../entities/memory.entity';

const AGENT_MEMORY_ENDPOINT = '/agents';

export class MemoryService {
  async getMemories(
    agentId: string,
    params?: GetMemoriesRequest
  ): Promise<AgentMemory[]> {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.source) queryParams.source = params.source;
    if (params?.sessionId) queryParams.sessionId = params.sessionId;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    
    return apiClient.get(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory`, {
      params: queryParams,
    });
  }

  async searchMemories(
    agentId: string,
    query: string,
    type?: MemoryType,
    limit?: number,
    threshold?: number
  ): Promise<MemorySearchResult[]> {
    const params: Record<string, string | number | boolean> = { q: query };
    if (type) params.type = type;
    if (limit) params.limit = limit;
    if (threshold) params.threshold = threshold;
    
    return apiClient.get(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/search`, {
      params,
    });
  }

  async semanticSearch(
    agentId: string,
    query: string,
    limit?: number
  ): Promise<MemorySearchResult[]> {
    const params: Record<string, string | number | boolean> = { q: query };
    if (limit) params.limit = limit;
    
    return apiClient.get(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/semantic-search`, {
      params,
    });
  }

  async getStats(agentId: string): Promise<MemoryStats> {
    return apiClient.get(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/stats`);
  }

  async getConversationHistory(
    agentId: string,
    sessionId: string,
    maxTokens?: number
  ): Promise<ConversationHistoryItem[]> {
    const params: Record<string, string | number | boolean> = {};
    if (maxTokens) params.maxTokens = maxTokens;
    
    return apiClient.get(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/sessions/${sessionId}/history`,
      { params }
    );
  }

  async summarizeSession(
    agentId: string,
    sessionId: string
  ): Promise<MemorySummary> {
    return apiClient.post(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/sessions/${sessionId}/summarize`
    );
  }

  async storeMemory(
    agentId: string,
    request: StoreMemoryRequest
  ): Promise<AgentMemory> {
    return apiClient.post(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory`, request);
  }

  async deleteMemory(agentId: string, memoryId: string): Promise<{ success: boolean }> {
    return apiClient.delete(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/${memoryId}`
    );
  }

  async clearSessionMemories(
    agentId: string,
    sessionId: string
  ): Promise<{ success: boolean }> {
    return apiClient.delete(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/sessions/${sessionId}`
    );
  }

  async consolidateMemories(agentId: string): Promise<ConsolidateResult> {
    return apiClient.post(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/consolidate`
    );
  }

  async getKnowledgeDocuments(agentId: string): Promise<KnowledgeDocument[]> {
    return apiClient.get(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge`);
  }

  async addKnowledgeDocument(
    agentId: string,
    request: AddKnowledgeDocumentRequest
  ): Promise<KnowledgeDocument> {
    return apiClient.post(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge`,
      request
    );
  }

  async searchKnowledge(
    agentId: string,
    query: string,
    limit?: number,
    threshold?: number
  ): Promise<KnowledgeSearchResult[]> {
    const params: Record<string, string | number | boolean> = { q: query };
    if (limit) params.limit = limit;
    if (threshold) params.threshold = threshold;
    
    return apiClient.get(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/search`,
      { params }
    );
  }

  async getKnowledgeStats(agentId: string): Promise<KnowledgeStats> {
    return apiClient.get(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/stats`
    );
  }

  async getKnowledgeDocument(
    agentId: string,
    documentId: string
  ): Promise<KnowledgeDocument> {
    return apiClient.get(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/${documentId}`
    );
  }

  async deleteKnowledgeDocument(
    agentId: string,
    documentId: string
  ): Promise<{ success: boolean }> {
    return apiClient.delete(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/${documentId}`
    );
  }

  async getDocumentChunks(
    agentId: string,
    documentId: string
  ): Promise<KnowledgeChunk[]> {
    return apiClient.get(
      `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/${documentId}/chunks`
    );
  }
}

export const memoryService = new MemoryService();
