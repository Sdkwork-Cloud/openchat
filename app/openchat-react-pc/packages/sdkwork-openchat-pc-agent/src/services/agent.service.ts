import { IS_DEV, apiClient } from "@sdkwork/openchat-pc-kernel";
import {
  AgentCategory,
  AgentStatus,
  AgentType,
  type Agent,
  type AgentSession,
  type AgentStats,
  type ChatMessage,
  type CreateAgentRequest,
  type CreateSessionRequest,
  type SendMessageRequest,
  type UpdateAgentRequest,
} from "../entities/agent.entity";

const AGENT_ENDPOINT = "/agents";
const FAVORITE_STORAGE_KEY = "openchat.agent.favorite";
const RECENT_STORAGE_KEY = "openchat.agent.recent";
const MAX_RECENT_AGENT_COUNT = 12;

type AgentSortType = "popular" | "newest" | "rating";

interface GetAgentsParams {
  category?: AgentCategory;
  type?: AgentType;
  search?: string;
  sortBy?: AgentSortType;
  page?: number;
  pageSize?: number;
}

interface AgentListResponse {
  agents: Agent[];
  total: number;
}

const fallbackAgentSeed: Agent[] = [
  {
    id: "agent-devops",
    uuid: "agent-devops-001",
    name: "DevOps Copilot",
    description: "Assist deployment checks, incident triage, and release runbooks.",
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
    avatar: "ops",
    config: {
      category: AgentCategory.PROGRAMMING,
      tags: ["devops", "release", "incident"],
      rating: 4.9,
      usageCount: 18240,
      creator: "OpenChat Team",
      llmConfig: {
        model: "gpt-4o",
        temperature: 0.3,
        maxTokens: 4096,
        systemPrompt: "You are a senior DevOps assistant.",
      },
      welcomeMessage: "Tell me your release goal or incident symptoms.",
    },
    ownerId: "system",
    isPublic: true,
    isDeleted: false,
    createdAt: "2025-11-10T08:00:00.000Z",
    updatedAt: "2026-02-10T08:00:00.000Z",
  },
  {
    id: "agent-writing",
    uuid: "agent-writing-001",
    name: "Writing Studio",
    description: "Draft product docs, announcements, and localized content.",
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
    avatar: "wr",
    config: {
      category: AgentCategory.WRITING,
      tags: ["docs", "copy", "localization"],
      rating: 4.8,
      usageCount: 14320,
      creator: "OpenChat Team",
      llmConfig: {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: "You are a precise and concise writing assistant.",
      },
      welcomeMessage: "Share your audience and tone, then I will draft it.",
    },
    ownerId: "system",
    isPublic: true,
    isDeleted: false,
    createdAt: "2025-11-20T08:00:00.000Z",
    updatedAt: "2026-02-08T08:00:00.000Z",
  },
  {
    id: "agent-analyst",
    uuid: "agent-analyst-001",
    name: "Data Analyst",
    description: "Summarize trends and generate concise data insights.",
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
    avatar: "da",
    config: {
      category: AgentCategory.BUSINESS,
      tags: ["data", "analytics", "kpi"],
      rating: 4.7,
      usageCount: 11960,
      creator: "OpenChat Team",
      llmConfig: {
        model: "gpt-4o",
        temperature: 0.4,
        maxTokens: 4096,
        systemPrompt: "You are an analytics assistant focused on business outcomes.",
      },
      welcomeMessage: "Describe your metric question and available dataset.",
    },
    ownerId: "system",
    isPublic: true,
    isDeleted: false,
    createdAt: "2025-12-01T08:00:00.000Z",
    updatedAt: "2026-02-15T08:00:00.000Z",
  },
  {
    id: "agent-learning",
    uuid: "agent-learning-001",
    name: "Learning Coach",
    description: "Build step-by-step learning plans and review progress.",
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
    avatar: "lc",
    config: {
      category: AgentCategory.EDUCATION,
      tags: ["learning", "plan", "exam"],
      rating: 4.6,
      usageCount: 8740,
      creator: "OpenChat Team",
      llmConfig: {
        model: "gpt-4o-mini",
        temperature: 0.6,
        maxTokens: 3072,
        systemPrompt: "You are a structured learning coach.",
      },
      welcomeMessage: "What skill do you want to master in the next month?",
    },
    ownerId: "system",
    isPublic: true,
    isDeleted: false,
    createdAt: "2025-12-12T08:00:00.000Z",
    updatedAt: "2026-02-05T08:00:00.000Z",
  },
  {
    id: "agent-travel",
    uuid: "agent-travel-001",
    name: "Trip Planner",
    description: "Create efficient travel itineraries with risk reminders.",
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
    avatar: "tp",
    config: {
      category: AgentCategory.LIFE,
      tags: ["travel", "itinerary", "budget"],
      rating: 4.5,
      usageCount: 6920,
      creator: "OpenChat Team",
      llmConfig: {
        model: "gpt-4o-mini",
        temperature: 0.8,
        maxTokens: 3072,
        systemPrompt: "You are a practical travel planner.",
      },
      welcomeMessage: "Tell me your destination, dates, and budget.",
    },
    ownerId: "system",
    isPublic: true,
    isDeleted: false,
    createdAt: "2025-12-18T08:00:00.000Z",
    updatedAt: "2026-02-03T08:00:00.000Z",
  },
];

let fallbackAgents: Agent[] = fallbackAgentSeed.map((agent) => ({ ...agent, config: { ...agent.config } }));
const fallbackSessions = new Map<string, AgentSession>();
const fallbackMessages = new Map<string, ChatMessage[]>();

function readFavoriteAgentIds(): Set<string> {
  if (typeof localStorage === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = localStorage.getItem(FAVORITE_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeFavoriteAgentIds(favoriteIds: Set<string>): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(Array.from(favoriteIds)));
}

function readRecentAgentIds(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT_AGENT_COUNT);
  } catch {
    return [];
  }
}

function writeRecentAgentIds(recentIds: string[]): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentIds.slice(0, MAX_RECENT_AGENT_COUNT)));
}

let favoriteAgentIds = readFavoriteAgentIds();
let recentAgentIds = readRecentAgentIds();

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

function normalizeAgent(input: Partial<Agent>): Agent {
  const timestamp = new Date().toISOString();

  return {
    id: input.id || `agent-${Date.now()}`,
    uuid: input.uuid || `agent-uuid-${Date.now()}`,
    name: input.name || "Unnamed Agent",
    description: input.description || "",
    avatar: input.avatar || "agent",
    type: input.type || AgentType.ASSISTANT,
    status: input.status || AgentStatus.READY,
    config: {
      model: input.config?.model,
      temperature: input.config?.temperature,
      maxTokens: input.config?.maxTokens,
      systemPrompt: input.config?.systemPrompt,
      welcomeMessage: input.config?.welcomeMessage,
      tools: input.config?.tools,
      skills: input.config?.skills,
      memory: input.config?.memory,
      llm: input.config?.llm,
      customSettings: input.config?.customSettings,
      category: input.config?.category || AgentCategory.ALL,
      tags: Array.isArray(input.config?.tags) ? input.config?.tags : [],
      rating: Number(input.config?.rating ?? 0),
      usageCount: Number(input.config?.usageCount ?? 0),
      creator: input.config?.creator || "OpenChat",
      llmConfig: {
        model: input.config?.llmConfig?.model || input.config?.model,
        temperature: input.config?.llmConfig?.temperature ?? input.config?.temperature,
        maxTokens: input.config?.llmConfig?.maxTokens ?? input.config?.maxTokens,
        systemPrompt: input.config?.llmConfig?.systemPrompt || input.config?.systemPrompt,
      },
    },
    ownerId: input.ownerId || "current-user",
    isPublic: input.isPublic ?? true,
    isDeleted: input.isDeleted ?? false,
    capabilities: input.capabilities,
    knowledgeBaseIds: input.knowledgeBaseIds,
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

function normalizeSession(input: Partial<AgentSession>): AgentSession {
  const timestamp = new Date().toISOString();
  return {
    id: input.id || `session-${Date.now()}`,
    uuid: input.uuid,
    agentId: input.agentId || "",
    userId: input.userId || "current-user",
    title: input.title || "New Session",
    context: Array.isArray(input.context) ? input.context : [],
    lastActivityAt: input.lastActivityAt,
    metadata: input.metadata,
    status: input.status,
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

function normalizeChatMessage(input: Partial<ChatMessage>): ChatMessage {
  return {
    id: input.id || `msg-${Date.now()}`,
    role: input.role || "assistant",
    content: input.content || "",
    name: input.name,
    toolCalls: input.toolCalls,
    toolCallId: input.toolCallId,
    metadata: input.metadata,
    timestamp: Number(input.timestamp ?? Date.now()),
  };
}

function toTextContent(content: ChatMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      if (part.type === "image_url") {
        return `[image] ${part.imageUrl.url}`;
      }
      return `[file] ${part.file.name}`;
    })
    .join(" ");
}

function sortAgents(list: Agent[], sortBy: AgentSortType): Agent[] {
  const result = [...list];

  if (sortBy === "rating") {
    result.sort((left, right) => (right.config.rating || 0) - (left.config.rating || 0));
    return result;
  }

  if (sortBy === "newest") {
    result.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    return result;
  }

  result.sort((left, right) => (right.config.usageCount || 0) - (left.config.usageCount || 0));
  return result;
}

function filterAgents(agents: Agent[], params?: GetAgentsParams): Agent[] {
  const keyword = params?.search?.trim().toLowerCase();

  return agents.filter((agent) => {
    if (params?.category && params.category !== AgentCategory.ALL) {
      if (agent.config.category !== params.category) {
        return false;
      }
    }

    if (params?.type && agent.type !== params.type) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const source = `${agent.name} ${agent.description || ""} ${(agent.config.tags || []).join(" ")}`.toLowerCase();
    return source.includes(keyword);
  });
}

function buildAssistantReply(prompt: string): string {
  const text = prompt.trim();

  if (!text) {
    return "I am ready whenever you are.";
  }

  if (text.length <= 40) {
    return `I received: "${text}". Would you like a concise answer or a step-by-step plan?`;
  }

  return `I reviewed your request. Suggested next steps:\n1. Clarify the expected output.\n2. Split the task into executable actions.\n3. Validate each action and summarize the result.`;
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

function getFallbackAgent(agentId: string): Agent {
  const agent = fallbackAgents.find((item) => item.id === agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }
  return agent;
}

export const AgentService = {
  getFavoriteAgentIds(): string[] {
    return Array.from(favoriteAgentIds);
  },

  isAgentFavorite(agentId: string): boolean {
    return favoriteAgentIds.has(agentId);
  },

  toggleFavoriteAgent(agentId: string): boolean {
    if (favoriteAgentIds.has(agentId)) {
      favoriteAgentIds.delete(agentId);
      writeFavoriteAgentIds(favoriteAgentIds);
      return false;
    }

    favoriteAgentIds.add(agentId);
    writeFavoriteAgentIds(favoriteAgentIds);
    return true;
  },

  getRecentAgentIds(): string[] {
    return [...recentAgentIds];
  },

  markAgentOpened(agentId: string): string[] {
    const filtered = recentAgentIds.filter((id) => id !== agentId);
    recentAgentIds = [agentId, ...filtered].slice(0, MAX_RECENT_AGENT_COUNT);
    writeRecentAgentIds(recentAgentIds);
    return [...recentAgentIds];
  },

  async getAgents(params?: GetAgentsParams): Promise<AgentListResponse> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(AGENT_ENDPOINT, {
          params: {
            category:
              params?.category && params.category !== AgentCategory.ALL
                ? params.category
                : undefined,
            type: params?.type,
            search: params?.search?.trim() || undefined,
            sortBy: params?.sortBy,
            page: params?.page,
            pageSize: params?.pageSize,
          },
        });

        const unwrapped = unwrapData<unknown>(response, response);
        const payload = unwrapped as Partial<AgentListResponse> & { items?: unknown[] };

        const list = Array.isArray(payload.agents)
          ? payload.agents
          : Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(unwrapped)
              ? unwrapped
              : [];

        const agents = list.map((item) => normalizeAgent(item as Partial<Agent>));
        return {
          agents,
          total: Number(payload.total ?? agents.length),
        };
      },
      () => {
        const filtered = filterAgents(fallbackAgents, params);
        const sorted = sortAgents(filtered, params?.sortBy || "popular");

        const page = params?.page || 1;
        const pageSize = params?.pageSize || 20;
        const start = (page - 1) * pageSize;

        return {
          agents: sorted.slice(start, start + pageSize).map((item) => ({ ...item, config: { ...item.config } })),
          total: sorted.length,
        };
      },
    );
  },

  async getAgent(agentId: string): Promise<Agent> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${AGENT_ENDPOINT}/${agentId}`);
        return normalizeAgent(unwrapData<Partial<Agent>>(response, {}));
      },
      () => {
        const agent = getFallbackAgent(agentId);
        return { ...agent, config: { ...agent.config } };
      },
    );
  },

  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(AGENT_ENDPOINT, request);
        return normalizeAgent(unwrapData<Partial<Agent>>(response, {}));
      },
      () => {
        const timestamp = new Date().toISOString();
        const created = normalizeAgent({
          ...request,
          id: `agent-${Date.now()}`,
          uuid: `agent-uuid-${Date.now()}`,
          ownerId: "current-user",
          isPublic: request.isPublic ?? false,
          isDeleted: false,
          status: AgentStatus.READY,
          createdAt: timestamp,
          updatedAt: timestamp,
          config: {
            ...request.config,
            category: request.config?.category || AgentCategory.LIFE,
            tags: request.config?.tags || [],
            usageCount: 0,
            rating: 0,
            creator: "You",
          },
        });

        fallbackAgents = [created, ...fallbackAgents];
        return created;
      },
    );
  },

  async updateAgent(agentId: string, request: UpdateAgentRequest): Promise<Agent> {
    return withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${AGENT_ENDPOINT}/${agentId}`, request);
        return normalizeAgent(unwrapData<Partial<Agent>>(response, {}));
      },
      () => {
        const index = fallbackAgents.findIndex((item) => item.id === agentId);
        if (index < 0) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        const current = fallbackAgents[index];
        const updated = normalizeAgent({
          ...current,
          ...request,
          config: {
            ...current.config,
            ...request.config,
            llmConfig: {
              ...current.config.llmConfig,
              ...request.config?.llmConfig,
            },
            tags: request.config?.tags || current.config.tags,
          },
          updatedAt: new Date().toISOString(),
        });

        fallbackAgents[index] = updated;
        return updated;
      },
    );
  },

  async deleteAgent(agentId: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.delete(`${AGENT_ENDPOINT}/${agentId}`);
      },
      () => {
        fallbackAgents = fallbackAgents.filter((item) => item.id !== agentId);

        Array.from(fallbackSessions.values())
          .filter((session) => session.agentId === agentId)
          .forEach((session) => {
            fallbackSessions.delete(session.id);
            fallbackMessages.delete(session.id);
          });
      },
    );
  },

  async getAgentSessions(agentId: string): Promise<AgentSession[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${AGENT_ENDPOINT}/${agentId}/sessions`);
        const list = unwrapData<unknown[]>(response, []);
        return Array.isArray(list)
          ? list.map((item) => normalizeSession(item as Partial<AgentSession>))
          : [];
      },
      () =>
        Array.from(fallbackSessions.values())
          .filter((item) => item.agentId === agentId)
          .sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
          ),
    );
  },

  async createSession(agentId: string, request: CreateSessionRequest): Promise<AgentSession> {
    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(
          `${AGENT_ENDPOINT}/${agentId}/sessions`,
          request,
        );
        return normalizeSession(unwrapData<Partial<AgentSession>>(response, {}));
      },
      () => {
        const session = normalizeSession({
          id: `session-${Date.now()}`,
          agentId,
          userId: "current-user",
          title: request.title || "New Session",
          context: [],
        });

        fallbackSessions.set(session.id, session);
        if (!fallbackMessages.has(session.id)) {
          fallbackMessages.set(session.id, []);
        }
        return session;
      },
    );
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${AGENT_ENDPOINT}/sessions/${sessionId}/messages`);
        const list = unwrapData<unknown[]>(response, []);
        return Array.isArray(list)
          ? list.map((item) => normalizeChatMessage(item as Partial<ChatMessage>))
          : [];
      },
      () => (fallbackMessages.get(sessionId) || []).map((item) => ({ ...item })),
    );
  },

  async sendMessage(sessionId: string, request: SendMessageRequest): Promise<ChatMessage> {
    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(
          `${AGENT_ENDPOINT}/sessions/${sessionId}/messages`,
          request,
        );
        return normalizeChatMessage(unwrapData<Partial<ChatMessage>>(response, {}));
      },
      () => {
        const messages = fallbackMessages.get(sessionId) || [];
        const now = Date.now();

        const userMessage = normalizeChatMessage({
          id: `msg-user-${now}`,
          role: "user",
          content: request.content,
          timestamp: now,
        });
        messages.push(userMessage);

        const assistantMessage = normalizeChatMessage({
          id: `msg-assistant-${now + 1}`,
          role: "assistant",
          content: buildAssistantReply(request.content),
          timestamp: now + 1,
        });
        messages.push(assistantMessage);

        fallbackMessages.set(sessionId, messages);

        const session = fallbackSessions.get(sessionId);
        if (session) {
          fallbackSessions.set(sessionId, {
            ...session,
            updatedAt: new Date().toISOString(),
          });
        }

        return assistantMessage;
      },
    );
  },

  async streamMessage(
    sessionId: string,
    request: SendMessageRequest,
    onChunk: (chunk: { id: string; content: string; done: boolean }) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    try {
      if (!IS_DEV) {
        const message = await this.sendMessage(sessionId, request);
        onChunk({
          id: message.id,
          content: toTextContent(message.content),
          done: true,
        });
        onComplete();
        return;
      }

      const messages = fallbackMessages.get(sessionId) || [];
      const userMessage = normalizeChatMessage({
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: request.content,
      });
      messages.push(userMessage);

      const fullText = buildAssistantReply(request.content);
      const chunkWords = fullText.split(" ");
      const messageId = `msg-stream-${Date.now()}`;

      let current = "";
      for (let index = 0; index < chunkWords.length; index += 1) {
        current = current ? `${current} ${chunkWords[index]}` : chunkWords[index];
        onChunk({
          id: messageId,
          content: current,
          done: index === chunkWords.length - 1,
        });
        await new Promise((resolve) => setTimeout(resolve, 28));
      }

      messages.push(
        normalizeChatMessage({
          id: messageId,
          role: "assistant",
          content: current,
        }),
      );

      fallbackMessages.set(sessionId, messages);
      const session = fallbackSessions.get(sessionId);
      if (session) {
        fallbackSessions.set(sessionId, {
          ...session,
          updatedAt: new Date().toISOString(),
        });
      }

      onComplete();
    } catch (error) {
      onError(error as Error);
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.delete(`${AGENT_ENDPOINT}/sessions/${sessionId}`);
      },
      () => {
        fallbackSessions.delete(sessionId);
        fallbackMessages.delete(sessionId);
      },
    );
  },

  async clearSessionHistory(sessionId: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`${AGENT_ENDPOINT}/sessions/${sessionId}/clear`);
      },
      () => {
        fallbackMessages.set(sessionId, []);
      },
    );
  },

  async resetAgent(agentId: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`${AGENT_ENDPOINT}/${agentId}/reset`);
      },
      () => {
        Array.from(fallbackSessions.entries()).forEach(([sessionId, session]) => {
          if (session.agentId === agentId) {
            fallbackSessions.delete(sessionId);
            fallbackMessages.delete(sessionId);
          }
        });
      },
    );
  },

  async getAgentStats(agentId: string): Promise<AgentStats> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${AGENT_ENDPOINT}/${agentId}/stats`);
        const stats = unwrapData<Partial<AgentStats>>(response, {});
        return {
          totalUsage: stats.totalUsage,
          todayUsage: stats.todayUsage,
          weeklyUsage: stats.weeklyUsage,
          averageRating: stats.averageRating,
          favoriteCount: stats.favoriteCount,
          totalSessions: Number(stats.totalSessions ?? 0),
          totalMessages: Number(stats.totalMessages ?? 0),
          avgResponseTime: Number(stats.avgResponseTime ?? 0),
          satisfactionRate: Number(stats.satisfactionRate ?? 0),
        };
      },
      () => {
        const agent = fallbackAgents.find((item) => item.id === agentId);
        const usage = agent?.config.usageCount || 0;
        const rating = agent?.config.rating || 4.5;

        const relatedSessions = Array.from(fallbackSessions.values()).filter(
          (session) => session.agentId === agentId,
        );

        const messageCount = relatedSessions.reduce((sum, session) => {
          return sum + (fallbackMessages.get(session.id)?.length || 0);
        }, 0);

        const stableOffset = agentId
          .split("")
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);

        const inferredSessions = Math.max(1, Math.floor(usage / 22));
        const inferredMessages = Math.max(inferredSessions * 3, Math.floor(usage * 2.7));

        return {
          totalSessions: Math.max(relatedSessions.length, inferredSessions),
          totalMessages: Math.max(messageCount, inferredMessages),
          avgResponseTime: 180 + (stableOffset % 160),
          satisfactionRate: Math.min(0.99, Math.max(0.7, rating / 5)),
        };
      },
    );
  },

  async searchAgents(
    keyword: string,
    category?: AgentCategory,
    type?: AgentType,
    sortBy: AgentSortType = "popular",
  ): Promise<Agent[]> {
    const result = await this.getAgents({
      category,
      type,
      search: keyword,
      sortBy,
      page: 1,
      pageSize: 200,
    });

    return result.agents;
  },
};

export default AgentService;
