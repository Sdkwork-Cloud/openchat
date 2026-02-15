export enum AgentType {
  CHAT = 'chat',
  ASSISTANT = 'assistant',
  WORKFLOW = 'workflow',
}

export enum AgentStatus {
  IDLE = 'idle',
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  type: AgentType;
  config?: Record<string, any>;
  isPublic: boolean;
  status: AgentStatus;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAgentParams {
  name: string;
  description?: string;
  avatar?: string;
  type: AgentType;
  config?: Record<string, any>;
  isPublic?: boolean;
}

export interface UpdateAgentParams {
  name?: string;
  description?: string;
  avatar?: string;
  type?: AgentType;
  config?: Record<string, any>;
  isPublic?: boolean;
  status?: AgentStatus;
}

export interface AgentSession {
  id: string;
  agentId: string;
  userId: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  agentId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface ChatRequest {
  messages: Array<{
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
  }>;
  sessionId: string;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finishReason?: string;
  }>;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
    };
    finishReason?: string | null;
  }>;
}

export interface AgentTool {
  id: string;
  name: string;
  description?: string;
  type: string;
  config?: Record<string, any>;
}

export interface AddToolParams {
  name: string;
  description?: string;
  type: string;
  config?: Record<string, any>;
}

export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  type: string;
  config?: Record<string, any>;
}

export interface AddSkillParams {
  name: string;
  description?: string;
  type: string;
  config?: Record<string, any>;
}

export interface CreateSessionParams {
  title?: string;
}

export interface AgentSendMessageParams {
  content: string;
}
