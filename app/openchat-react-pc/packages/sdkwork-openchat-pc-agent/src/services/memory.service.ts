import { IS_DEV, apiClient } from "@sdkwork/openchat-pc-kernel";
import { MemorySource, MemoryType } from "../entities/memory.entity";
import type {
  AddKnowledgeDocumentRequest,
  AgentMemory,
  ConsolidateResult,
  ConversationHistoryItem,
  GetMemoriesRequest,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeSearchResult,
  KnowledgeStats,
  MemorySearchResult,
  MemoryStats,
  MemorySummary,
  StoreMemoryRequest,
} from "../entities/memory.entity";

const AGENT_MEMORY_ENDPOINT = "/agents";

const memoryStore = new Map<string, AgentMemory[]>();
const knowledgeDocumentStore = new Map<string, KnowledgeDocument[]>();
const knowledgeChunkStore = new Map<string, KnowledgeChunk[]>();

function unwrapData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const wrapped = payload as { data?: T };
    return wrapped.data ?? fallback;
  }
  if (payload === undefined || payload === null) {
    return fallback;
  }
  return payload as T;
}

async function withFallback<T>(apiTask: () => Promise<T>, fallbackTask: () => T | Promise<T>): Promise<T> {
  try {
    return await apiTask();
  } catch (error) {
    if (IS_DEV) {
      return fallbackTask();
    }
    throw error;
  }
}

function createMemory(
  agentId: string,
  overrides: Partial<AgentMemory>,
): AgentMemory {
  const now = new Date().toISOString();
  const id = overrides.id || `memory-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  return {
    id,
    uuid: overrides.uuid || `${id}-uuid`,
    agentId,
    userId: overrides.userId || "current-user",
    sessionId: overrides.sessionId,
    type: overrides.type || MemoryType.EPISODIC,
    source: overrides.source || MemorySource.USER,
    content: overrides.content || "",
    embedding: overrides.embedding,
    importance: Number(overrides.importance ?? 0.6),
    accessCount: Number(overrides.accessCount ?? 0),
    lastAccessedAt: overrides.lastAccessedAt,
    expiresAt: overrides.expiresAt,
    metadata: overrides.metadata,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

function createDocument(
  agentId: string,
  request: Partial<KnowledgeDocument>,
): KnowledgeDocument {
  const now = new Date().toISOString();
  const id = request.id || `doc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const content = request.content || "";
  const tokenCount = Math.max(1, Math.round(content.length / 3));

  return {
    id,
    uuid: request.uuid || `${id}-uuid`,
    agentId,
    title: request.title || "Untitled Document",
    description: request.description,
    content,
    sourcePath: request.sourcePath,
    sourceType: request.sourceType || "manual",
    chunkCount: Number(request.chunkCount ?? 0),
    tokenCount: Number(request.tokenCount ?? tokenCount),
    status: request.status || "ready",
    error: request.error,
    metadata: request.metadata,
    createdAt: request.createdAt || now,
    updatedAt: request.updatedAt || now,
  };
}

function chunkDocument(document: KnowledgeDocument): KnowledgeChunk[] {
  const rawParts = document.content
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const parts = rawParts.length > 0 ? rawParts : [document.content.trim() || document.title];

  return parts.map((part, index) => {
    const id = `${document.id}-chunk-${index + 1}`;
    return {
      id,
      uuid: `${id}-uuid`,
      documentId: document.id,
      agentId: document.agentId,
      content: part,
      chunkIndex: index,
      tokenCount: Math.max(1, Math.round(part.length / 3)),
      createdAt: document.updatedAt,
      metadata: {
        sourceType: document.sourceType || "manual",
      },
    };
  });
}

function ensureAgentSeed(agentId: string): void {
  if (!memoryStore.has(agentId)) {
    memoryStore.set(agentId, [
      createMemory(agentId, {
        id: `${agentId}-mem-1`,
        type: MemoryType.SEMANTIC,
        source: MemorySource.SYSTEM,
        content: "User prefers concise technical answers with actionable steps.",
        importance: 0.85,
        accessCount: 4,
      }),
      createMemory(agentId, {
        id: `${agentId}-mem-2`,
        type: MemoryType.EPISODIC,
        source: MemorySource.CONVERSATION,
        sessionId: `${agentId}-session-default`,
        content: "Discussed package modularization and strict workspace boundaries.",
        importance: 0.76,
        accessCount: 3,
        metadata: { role: "assistant" },
      }),
      createMemory(agentId, {
        id: `${agentId}-mem-3`,
        type: MemoryType.PROCEDURAL,
        source: MemorySource.USER,
        content: "Validation workflow: typecheck -> tests -> build -> package verification.",
        importance: 0.7,
        accessCount: 2,
      }),
    ]);
  }

  if (!knowledgeDocumentStore.has(agentId)) {
    const documents = [
      createDocument(agentId, {
        id: `${agentId}-doc-1`,
        title: "Architecture Notes",
        description: "Monorepo packaging and dependency boundary standards.",
        content:
          "All business modules must live in packages/.\n\nEach package exposes only src/index.ts public APIs.\n\nCross-package imports must use package names instead of relative src paths.",
        sourceType: "markdown",
      }),
      createDocument(agentId, {
        id: `${agentId}-doc-2`,
        title: "UI Layout Guidelines",
        description: "Desktop split-pane experience baseline.",
        content:
          "Chat page uses two-panel layout: conversation list on left and message panel on right.\n\nEvery page should provide loading, empty, and error states.",
        sourceType: "guide",
      }),
    ];

    const normalized = documents.map((document) => {
      const chunks = chunkDocument(document);
      knowledgeChunkStore.set(document.id, chunks);
      return {
        ...document,
        chunkCount: chunks.length,
        tokenCount: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
      };
    });

    knowledgeDocumentStore.set(agentId, normalized);
  }
}

function getMemoriesFromStore(agentId: string): AgentMemory[] {
  ensureAgentSeed(agentId);
  return memoryStore.get(agentId) || [];
}

function getDocumentsFromStore(agentId: string): KnowledgeDocument[] {
  ensureAgentSeed(agentId);
  return knowledgeDocumentStore.get(agentId) || [];
}

function buildMemoryStats(memories: AgentMemory[]): MemoryStats {
  const byType: Record<MemoryType, number> = {
    [MemoryType.EPISODIC]: 0,
    [MemoryType.SEMANTIC]: 0,
    [MemoryType.PROCEDURAL]: 0,
    [MemoryType.WORKING]: 0,
  };

  const bySource: Record<MemorySource, number> = {
    [MemorySource.CONVERSATION]: 0,
    [MemorySource.DOCUMENT]: 0,
    [MemorySource.SYSTEM]: 0,
    [MemorySource.USER]: 0,
    [MemorySource.KNOWLEDGE]: 0,
  };

  let totalTokens = 0;
  let totalImportance = 0;

  memories.forEach((memory) => {
    byType[memory.type] += 1;
    bySource[memory.source] += 1;
    totalTokens += Math.max(1, Math.round(memory.content.length / 3));
    totalImportance += memory.importance;
  });

  const ordered = [...memories].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  return {
    totalMemories: memories.length,
    byType,
    bySource,
    totalTokens,
    avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
    oldestMemory: ordered[0]?.createdAt,
    newestMemory: ordered[ordered.length - 1]?.createdAt,
  };
}

function buildKnowledgeStats(documents: KnowledgeDocument[]): KnowledgeStats {
  const statusMap: Record<string, number> = {};
  const sourceTypeMap: Record<string, number> = {};

  let totalChunks = 0;
  let totalTokens = 0;

  documents.forEach((document) => {
    statusMap[document.status] = (statusMap[document.status] || 0) + 1;
    const sourceType = document.sourceType || "unknown";
    sourceTypeMap[sourceType] = (sourceTypeMap[sourceType] || 0) + 1;
    totalChunks += document.chunkCount;
    totalTokens += document.tokenCount;
  });

  return {
    totalDocuments: documents.length,
    totalChunks,
    totalTokens,
    byStatus: statusMap,
    bySourceType: sourceTypeMap,
  };
}

export class MemoryService {
  async getMemories(agentId: string, params?: GetMemoriesRequest): Promise<AgentMemory[]> {
    return withFallback(
      async () => {
        const queryParams: Record<string, string | number | boolean> = {};
        if (params?.type) queryParams.type = params.type;
        if (params?.source) queryParams.source = params.source;
        if (params?.sessionId) queryParams.sessionId = params.sessionId;
        if (params?.limit) queryParams.limit = params.limit;
        if (params?.offset) queryParams.offset = params.offset;

        const response = await apiClient.get<unknown>(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory`, {
          params: queryParams,
        });

        const list = unwrapData<unknown[]>(response, []);
        return Array.isArray(list) ? (list as AgentMemory[]) : [];
      },
      () => {
        let memories = [...getMemoriesFromStore(agentId)];

        if (params?.type) {
          memories = memories.filter((memory) => memory.type === params.type);
        }
        if (params?.source) {
          memories = memories.filter((memory) => memory.source === params.source);
        }
        if (params?.sessionId) {
          memories = memories.filter((memory) => memory.sessionId === params.sessionId);
        }

        memories.sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        );

        const offset = params?.offset || 0;
        const limit = params?.limit || memories.length;
        return memories.slice(offset, offset + limit);
      },
    );
  }

  async searchMemories(
    agentId: string,
    query: string,
    type?: MemoryType,
    limit: number = 10,
    threshold: number = 0,
  ): Promise<MemorySearchResult[]> {
    return withFallback(
      async () => {
        const params: Record<string, string | number | boolean> = { q: query };
        if (type) params.type = type;
        if (limit) params.limit = limit;
        if (threshold) params.threshold = threshold;

        const response = await apiClient.get<unknown>(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/search`, {
          params,
        });

        const list = unwrapData<unknown[]>(response, []);
        return Array.isArray(list) ? (list as MemorySearchResult[]) : [];
      },
      () => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) {
          return [];
        }

        const candidates = getMemoriesFromStore(agentId)
          .filter((memory) => (type ? memory.type === type : true))
          .map((memory) => {
            const source = memory.content.toLowerCase();
            const contains = source.includes(keyword);
            if (!contains) {
              return null;
            }

            const ratio = keyword.length / Math.max(1, source.length);
            const score = Number((Math.min(1, 0.55 + ratio * 8 + memory.importance * 0.2)).toFixed(4));

            return {
              memory,
              score,
              highlights: [memory.content],
            } as MemorySearchResult;
          })
          .filter((item): item is MemorySearchResult => item !== null)
          .filter((item) => item.score >= threshold)
          .sort((left, right) => right.score - left.score)
          .slice(0, limit);

        return candidates;
      },
    );
  }

  async semanticSearch(agentId: string, query: string, limit: number = 10): Promise<MemorySearchResult[]> {
    return this.searchMemories(agentId, query, undefined, limit, 0);
  }

  async getStats(agentId: string): Promise<MemoryStats> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/stats`);
        return unwrapData<MemoryStats>(response, buildMemoryStats([]));
      },
      () => buildMemoryStats(getMemoriesFromStore(agentId)),
    );
  }

  async getConversationHistory(
    agentId: string,
    sessionId: string,
    maxTokens?: number,
  ): Promise<ConversationHistoryItem[]> {
    return withFallback(
      async () => {
        const params: Record<string, string | number | boolean> = {};
        if (maxTokens) params.maxTokens = maxTokens;

        const response = await apiClient.get<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/sessions/${sessionId}/history`,
          { params },
        );

        const list = unwrapData<unknown[]>(response, []);
        return Array.isArray(list) ? (list as ConversationHistoryItem[]) : [];
      },
      () => {
        const history = getMemoriesFromStore(agentId)
          .filter(
            (memory) =>
              memory.sessionId === sessionId && memory.source === MemorySource.CONVERSATION,
          )
          .sort(
            (left, right) =>
              new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
          )
          .map((memory) => ({
            role: (memory.metadata?.role as ConversationHistoryItem["role"]) || "assistant",
            content: memory.content,
            timestamp: new Date(memory.createdAt).getTime(),
          }));

        if (!maxTokens) {
          return history;
        }

        let consumed = 0;
        const selected: ConversationHistoryItem[] = [];

        for (let index = history.length - 1; index >= 0; index -= 1) {
          const item = history[index];
          const estimate = Math.max(1, Math.round(item.content.length / 3));
          if (consumed + estimate > maxTokens) {
            break;
          }
          consumed += estimate;
          selected.unshift(item);
        }

        return selected;
      },
    );
  }

  async summarizeSession(agentId: string, sessionId: string): Promise<MemorySummary> {
    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/sessions/${sessionId}/summarize`,
        );
        return unwrapData<MemorySummary>(response, {
          id: `summary-${Date.now()}`,
          uuid: `summary-${Date.now()}-uuid`,
          agentId,
          sessionId,
          summary: "",
          keyPoints: [],
          entities: [],
          tokenCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      },
      () => {
        const conversationMemories = getMemoriesFromStore(agentId)
          .filter(
            (memory) =>
              memory.sessionId === sessionId && memory.source === MemorySource.CONVERSATION,
          )
          .sort(
            (left, right) =>
              new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
          );

        const lines = conversationMemories.map((memory) => memory.content);
        const joined = lines.join(" ").trim();
        const keyPoints = lines.slice(-3);
        const timestamp = new Date().toISOString();

        return {
          id: `summary-${Date.now()}`,
          uuid: `summary-${Date.now()}-uuid`,
          agentId,
          sessionId,
          summary: joined || "No conversation memory available for this session.",
          keyPoints,
          entities: [],
          topics: ["conversation"],
          tokenCount: Math.max(1, Math.round(joined.length / 3)),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      },
    );
  }

  async storeMemory(agentId: string, request: StoreMemoryRequest): Promise<AgentMemory> {
    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory`, request);
        return unwrapData<AgentMemory>(response, createMemory(agentId, request));
      },
      () => {
        const memory = createMemory(agentId, {
          content: request.content,
          type: request.type || MemoryType.EPISODIC,
          source: request.source || MemorySource.USER,
          sessionId: request.sessionId,
          metadata: request.metadata,
        });

        const memories = getMemoriesFromStore(agentId);
        memoryStore.set(agentId, [memory, ...memories]);
        return memory;
      },
    );
  }

  async deleteMemory(agentId: string, memoryId: string): Promise<{ success: boolean }> {
    return withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/${memoryId}`,
        );
        return unwrapData<{ success: boolean }>(response, { success: true });
      },
      () => {
        const memories = getMemoriesFromStore(agentId);
        memoryStore.set(
          agentId,
          memories.filter((memory) => memory.id !== memoryId),
        );
        return { success: true };
      },
    );
  }

  async clearSessionMemories(agentId: string, sessionId: string): Promise<{ success: boolean }> {
    return withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/sessions/${sessionId}`,
        );
        return unwrapData<{ success: boolean }>(response, { success: true });
      },
      () => {
        const memories = getMemoriesFromStore(agentId);
        memoryStore.set(
          agentId,
          memories.filter((memory) => memory.sessionId !== sessionId),
        );
        return { success: true };
      },
    );
  }

  async consolidateMemories(agentId: string): Promise<ConsolidateResult> {
    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/consolidate`,
        );
        return unwrapData<ConsolidateResult>(response, {
          processed: 0,
          consolidated: 0,
          archived: 0,
          deleted: 0,
        });
      },
      () => {
        const memories = getMemoriesFromStore(agentId);
        const processed = memories.length;
        const consolidated = Math.max(0, Math.floor(processed * 0.35));

        return {
          processed,
          consolidated,
          archived: Math.max(0, Math.floor(consolidated * 0.4)),
          deleted: Math.max(0, Math.floor(consolidated * 0.15)),
        };
      },
    );
  }

  async getKnowledgeDocuments(agentId: string): Promise<KnowledgeDocument[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge`);
        const list = unwrapData<unknown[]>(response, []);
        return Array.isArray(list) ? (list as KnowledgeDocument[]) : [];
      },
      () => [...getDocumentsFromStore(agentId)],
    );
  }

  async addKnowledgeDocument(
    agentId: string,
    request: AddKnowledgeDocumentRequest,
  ): Promise<KnowledgeDocument> {
    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge`,
          request,
        );
        return unwrapData<KnowledgeDocument>(
          response,
          createDocument(agentId, {
            title: request.title,
            description: request.description,
            content: request.content,
            sourcePath: request.sourcePath,
            sourceType: request.sourceType,
            metadata: request.metadata,
          }),
        );
      },
      () => {
        const baseDocument = createDocument(agentId, {
          title: request.title,
          description: request.description,
          content: request.content,
          sourcePath: request.sourcePath,
          sourceType: request.sourceType,
          metadata: request.metadata,
        });

        const chunks = chunkDocument(baseDocument);
        const document: KnowledgeDocument = {
          ...baseDocument,
          status: "ready",
          chunkCount: chunks.length,
          tokenCount: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
          updatedAt: new Date().toISOString(),
        };

        const documents = getDocumentsFromStore(agentId);
        knowledgeDocumentStore.set(agentId, [document, ...documents]);
        knowledgeChunkStore.set(document.id, chunks);

        return document;
      },
    );
  }

  async searchKnowledge(
    agentId: string,
    query: string,
    limit: number = 10,
    threshold: number = 0,
  ): Promise<KnowledgeSearchResult[]> {
    return withFallback(
      async () => {
        const params: Record<string, string | number | boolean> = { q: query };
        if (limit) params.limit = limit;
        if (threshold) params.threshold = threshold;

        const response = await apiClient.get<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/search`,
          { params },
        );

        const list = unwrapData<unknown[]>(response, []);
        return Array.isArray(list) ? (list as KnowledgeSearchResult[]) : [];
      },
      () => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) {
          return [];
        }

        const documents = getDocumentsFromStore(agentId);
        const docMap = new Map<string, KnowledgeDocument>(documents.map((doc) => [doc.id, doc]));

        const rows: KnowledgeSearchResult[] = [];

        documents.forEach((document) => {
          const chunks = knowledgeChunkStore.get(document.id) || [];
          chunks.forEach((chunk) => {
            const source = chunk.content.toLowerCase();
            if (!source.includes(keyword)) {
              return;
            }
            const score = Number(
              (
                Math.min(1, 0.6 + keyword.length / Math.max(1, source.length) * 9)
              ).toFixed(4),
            );

            if (score < threshold) {
              return;
            }

            rows.push({
              chunk,
              document: docMap.get(chunk.documentId) || document,
              score,
              highlights: [chunk.content],
            });
          });
        });

        rows.sort((left, right) => right.score - left.score);
        return rows.slice(0, limit);
      },
    );
  }

  async getKnowledgeStats(agentId: string): Promise<KnowledgeStats> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/stats`,
        );
        return unwrapData<KnowledgeStats>(response, buildKnowledgeStats([]));
      },
      () => buildKnowledgeStats(getDocumentsFromStore(agentId)),
    );
  }

  async getKnowledgeDocument(agentId: string, documentId: string): Promise<KnowledgeDocument> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/${documentId}`,
        );
        return unwrapData<KnowledgeDocument>(
          response,
          createDocument(agentId, {
            id: documentId,
            title: "Unknown Document",
            content: "",
          }),
        );
      },
      () => {
        const document = getDocumentsFromStore(agentId).find((item) => item.id === documentId);
        if (!document) {
          throw new Error(`Document not found: ${documentId}`);
        }
        return { ...document };
      },
    );
  }

  async deleteKnowledgeDocument(
    agentId: string,
    documentId: string,
  ): Promise<{ success: boolean }> {
    return withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/${documentId}`,
        );
        return unwrapData<{ success: boolean }>(response, { success: true });
      },
      () => {
        const documents = getDocumentsFromStore(agentId);
        knowledgeDocumentStore.set(
          agentId,
          documents.filter((document) => document.id !== documentId),
        );
        knowledgeChunkStore.delete(documentId);
        return { success: true };
      },
    );
  }

  async getDocumentChunks(agentId: string, documentId: string): Promise<KnowledgeChunk[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(
          `${AGENT_MEMORY_ENDPOINT}/${agentId}/memory/knowledge/${documentId}/chunks`,
        );
        const list = unwrapData<unknown[]>(response, []);
        return Array.isArray(list) ? (list as KnowledgeChunk[]) : [];
      },
      () => [...(knowledgeChunkStore.get(documentId) || [])],
    );
  }
}

export const memoryService = new MemoryService();
