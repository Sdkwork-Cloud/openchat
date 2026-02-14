/**
 * Agent 实体定义
 *
 * 与后端 API 对齐的智能体领域模型
 * 参考: src/modules/agent/agent.entity.ts, agent.interface.ts
 */

export enum AgentStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  CHATTING = 'chatting',
  EXECUTING = 'executing',
  ERROR = 'error',
  DISABLED = 'disabled',
  MAINTENANCE = 'maintenance',
}

export enum AgentType {
  CHAT = 'chat',
  TASK = 'task',
  KNOWLEDGE = 'knowledge',
  ASSISTANT = 'assistant',
  CUSTOM = 'custom',
}

export enum AgentCategory {
  ALL = 'all',
  PRODUCTIVITY = 'productivity',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  LIFE = 'life',
  PROGRAMMING = 'programming',
  WRITING = 'writing',
  BUSINESS = 'business',
  CREATIVE = 'creative',
}

export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'moonshot'
  | 'minimax'
  | 'zhipu'
  | 'qwen'
  | 'deepseek'
  | 'doubao'
  | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  defaults?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface MemoryConfig {
  maxTokens?: number;
  limit?: number;
  type?: 'episodic' | 'semantic' | 'procedural' | 'working';
}

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  welcomeMessage?: string;
  tools?: string[];
  skills?: string[];
  memory?: MemoryConfig;
  llm?: LLMConfig;
  customSettings?: Record<string, unknown>;
}

export interface AgentCapability {
  name: string;
  description: string;
  type: 'tool' | 'skill' | 'knowledge' | 'custom';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface Agent {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  avatar?: string;
  type: AgentType;
  status: AgentStatus;
  config: AgentConfig;
  ownerId: string;
  isPublic: boolean;
  isDeleted: boolean;
  capabilities?: AgentCapability[];
  knowledgeBaseIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentSession {
  id: string;
  uuid?: string;
  agentId: string;
  userId: string;
  title?: string;
  context?: ChatMessage[];
  lastActivityAt?: string;
  metadata?: Record<string, unknown>;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ChatContentPart[];
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; imageUrl: { url: string; detail?: 'low' | 'high' | 'auto' } }
  | { type: 'file'; file: { name: string; content: string; mimeType: string } };

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentMessage {
  id: string;
  uuid?: string;
  agentId?: string;
  userId?: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  type?: 'text' | 'image' | 'file' | 'event';
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
  tokenCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AgentTool {
  id: string;
  uuid: string;
  agentId: string;
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  enabled: boolean;
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSkill {
  id: string;
  uuid: string;
  agentId: string;
  skillId: string;
  name: string;
  description?: string;
  version?: string;
  enabled: boolean;
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionState = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted';

export interface ExecutionStep {
  id: string;
  type: 'llm' | 'tool' | 'skill' | 'memory' | 'validation';
  name: string;
  input: unknown;
  output?: unknown;
  state: ExecutionState;
  startTime: number;
  endTime?: number;
  error?: {
    message: string;
    code?: string;
  };
}

export interface AgentExecution {
  id: string;
  uuid: string;
  agentId: string;
  sessionId?: string;
  userId?: string;
  state: ExecutionState;
  steps?: ExecutionStep[];
  startedAt?: string;
  endedAt?: string;
  totalTokens?: number;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AgentCategoryInfo {
  id: AgentCategory;
  name: string;
  icon: string;
  description: string;
  agentCount: number;
}

export interface AgentMarketFilter {
  category?: AgentCategory;
  type?: AgentType;
  keyword?: string;
  sortBy: 'popular' | 'newest' | 'rating';
}

export interface AgentStats {
  totalUsage: number;
  todayUsage: number;
  weeklyUsage: number;
  averageRating: number;
  favoriteCount: number;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  avatar?: string;
  type?: AgentType;
  config?: AgentConfig;
  isPublic?: boolean;
  capabilities?: AgentCapability[];
  knowledgeBaseIds?: string[];
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  avatar?: string;
  type?: AgentType;
  config?: AgentConfig;
  isPublic?: boolean;
  status?: AgentStatus;
  capabilities?: AgentCapability[];
  knowledgeBaseIds?: string[];
}

export interface CreateSessionRequest {
  title?: string;
}

export interface SendMessageRequest {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AddToolRequest {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface AddSkillRequest {
  skillId: string;
  name: string;
  description?: string;
  version?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: ChatUsage;
  systemFingerprint?: string;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
  systemFingerprint?: string;
  usage?: ChatUsage;
}

export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface StreamDelta {
  role?: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface AvailableTool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface AvailableSkill {
  id: string;
  name: string;
  description: string;
  version?: string;
}
