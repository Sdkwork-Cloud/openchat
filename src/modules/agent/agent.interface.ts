/**
 * Agent Domain - 智能体领域核心
 * 
 * 设计原则：
 * 1. DDD 领域驱动 - 高内聚低耦合
 * 2. 极简主义 - 核心概念最少化
 * 3. OpenAI 兼容 - 标准接口
 * 4. 事件驱动 - 完整事件模型
 * 
 * @domain Agent
 * @version 2.0.0
 */

// ============================================
// Agent Status & Type - 状态与类型
// ============================================

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

// ============================================
// Agent Events - 智能体事件
// ============================================

export enum AgentEventType {
  AGENT_INITIALIZED = 'agent:initialized',
  AGENT_STARTED = 'agent:started',
  AGENT_STOPPED = 'agent:stopped',
  AGENT_DESTROYED = 'agent:destroyed',
  AGENT_ERROR = 'agent:error',
  AGENT_RESET = 'agent:reset',
  CHAT_STARTED = 'chat:started',
  CHAT_MESSAGE = 'chat:message',
  CHAT_STREAM = 'chat:stream',
  CHAT_COMPLETED = 'chat:completed',
  CHAT_ABORTED = 'chat:aborted',
  CHAT_ERROR = 'chat:error',
  EXECUTION_STARTED = 'execution:started',
  EXECUTION_STEP = 'execution:step',
  EXECUTION_PROGRESS = 'execution:progress',
  EXECUTION_COMPLETED = 'execution:completed',
  EXECUTION_FAILED = 'execution:failed',
  TOOL_INVOKING = 'tool:invoking',
  TOOL_INVOKED = 'tool:invoked',
  TOOL_COMPLETED = 'tool:completed',
  TOOL_FAILED = 'tool:failed',
  SKILL_INVOKING = 'skill:invoking',
  SKILL_INVOKED = 'skill:invoked',
  SKILL_COMPLETED = 'skill:completed',
  SKILL_FAILED = 'skill:failed',
  MEMORY_STORED = 'memory:stored',
  MEMORY_RETRIEVED = 'memory:retrieved',
  MEMORY_SEARCHED = 'memory:searched',
}

export interface AgentEvent<T = unknown> {
  type: AgentEventType;
  timestamp: number;
  payload: T;
  metadata: {
    agentId: string;
    sessionId?: string;
    executionId?: string;
    userId?: string;
  };
}

// ============================================
// Chat Domain - 对话领域
// ============================================

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
  tools?: ToolDefinition[];
  toolChoice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  responseFormat?: { type: 'text' | 'json_object' | 'json_schema'; schema?: unknown };
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

// ============================================
// Tool Domain - 工具领域
// ============================================

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

export interface Tool {
  name: string;
  description: string;
  parameters?: JSONSchema;
  execute: (input: unknown, context: ToolExecutionContext) => Promise<ToolResult>;
}

export interface ToolExecutionContext {
  agentId: string;
  sessionId?: string;
  userId?: string;
  executionId?: string;
}

export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

// ============================================
// Skill Domain - 技能领域
// ============================================

export interface Skill {
  id: string;
  name: string;
  description: string;
  version?: string;
  input?: JSONSchema;
  output?: JSONSchema;
  execute: (input: unknown, context: SkillExecutionContext) => Promise<SkillResult>;
}

export interface SkillExecutionContext {
  executionId: string;
  agentId: string;
  sessionId?: string;
  userId?: string;
  input: unknown;
  logger: SkillLogger;
  signal?: AbortSignal;
  startedAt: Date;
}

export type SkillLogger = {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
};

export interface SkillResult {
  success: boolean;
  output?: unknown;
  error?: string;
  metadata?: SkillExecutionMeta;
}

export interface SkillExecutionMeta {
  executionId: string;
  skillId: string;
  skillName: string;
  startTime: number;
  endTime: number;
  duration: number;
}

// ============================================
// Memory Domain - 记忆领域
// ============================================

export interface MemoryConfig {
  maxTokens?: number;
  limit?: number;
  type?: 'episodic' | 'semantic' | 'procedural' | 'working';
}

export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface MemoryStore {
  add(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry>;
  get(id: string): Promise<MemoryEntry | null>;
  search(query: string, limit?: number): Promise<MemoryEntry[]>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

// ============================================
// Agent Configuration - 智能体配置
// ============================================

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

// ============================================
// JSON Schema - 数据验证
// ============================================

export interface JSONSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
  default?: unknown;
}

// ============================================
// Agent Interface - 智能体接口
// ============================================

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
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSession {
  id: string;
  agentId: string;
  userId: string;
  title?: string;
  context?: ChatMessage[];
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  userId: string;
  sessionId: string;
  content: string | ChatContentPart[];
  role: 'user' | 'assistant' | 'system' | 'tool';
  type: 'text' | 'image' | 'file' | 'event';
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// Agent Manager Interface - 智能体管理器
// ============================================

export interface AgentManager {
  createAgent(agent: Omit<Agent, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<Agent>;
  updateAgent(id: string, agent: Partial<Agent>): Promise<Agent | null>;
  deleteAgent(id: string): Promise<boolean>;
  getAgentById(id: string): Promise<Agent | null>;
  getAgentsByOwner(ownerId: string): Promise<Agent[]>;
  getPublicAgents(): Promise<Agent[]>;
}

export interface AgentChatManager {
  createSession(agentId: string, userId: string, title?: string): Promise<AgentSession>;
  getSession(sessionId: string): Promise<AgentSession | null>;
  sendMessage(sessionId: string, content: string, userId: string): Promise<AgentMessage>;
  getMessages(sessionId: string, limit?: number): Promise<AgentMessage[]>;
  streamMessage(sessionId: string, content: string, userId: string): AsyncGenerator<AgentMessage>;
}

// ============================================
// Execution Domain - 执行领域
// ============================================

export enum ExecutionState {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted',
}

export interface ExecutionContext {
  id: string;
  agentId: string;
  sessionId?: string;
  userId?: string;
  request: ChatRequest;
  state: ExecutionState;
  startTime: number;
  steps: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  type: 'llm' | 'tool' | 'skill' | 'memory' | 'validation';
  name: string;
  input: unknown;
  output?: unknown;
  state: ExecutionState;
  startTime: number;
  endTime?: number;
  error?: Error;
}

// ============================================
// Capability - 能力
// ============================================

export interface AgentCapability {
  name: string;
  description: string;
  type: 'tool' | 'skill' | 'knowledge' | 'custom';
  enabled: boolean;
  config?: Record<string, unknown>;
}

// ============================================
// Knowledge Base - 知识库
// ============================================

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  type: 'document' | 'vector' | 'graph' | 'hybrid';
  documents?: KnowledgeDocument[];
  embedding?: {
    model: string;
    dimension: number;
  };
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
