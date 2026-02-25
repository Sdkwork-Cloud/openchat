import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { AgentStatus, AgentType } from './agent.interface';

@Entity('chat_agents')
@Index('idx_agents_owner', ['ownerId'])
@Index('idx_agents_status', ['status'])
@Index('idx_agents_type', ['type'])
@Index('idx_agents_public', ['isPublic', 'status'])
export class Agent extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'enum', enum: AgentType, default: AgentType.CHAT })
  type: AgentType;

  @Column({ type: 'enum', enum: AgentStatus, default: AgentStatus.IDLE })
  status: AgentStatus;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  config: AgentConfigEntity;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'boolean', default: false, name: 'is_public' })
  isPublic: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  capabilities: AgentCapabilityEntity[];

  @Column({ type: 'jsonb', nullable: true, default: [], name: 'knowledge_base_ids' })
  knowledgeBaseIds: string[];
}

export interface AgentConfigEntity {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  welcomeMessage?: string;
  tools?: string[];
  skills?: string[];
  memory?: {
    maxTokens?: number;
    limit?: number;
    type?: string;
  };
  llm?: {
    provider: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    defaults?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    };
  };
  customSettings?: Record<string, unknown>;
}

export interface AgentCapabilityEntity {
  name: string;
  description: string;
  type: 'tool' | 'skill' | 'knowledge' | 'custom';
  enabled: boolean;
  config?: Record<string, unknown>;
}

@Entity('chat_agent_sessions')
@Index('idx_agent_sessions_agent', ['agentId'])
@Index('idx_agent_sessions_user', ['userId'])
@Index('idx_agent_sessions_agent_user', ['agentId', 'userId'])
export class AgentSession extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  context: ChatMessageEntity[];

  @Column({ type: 'timestamp', nullable: true, name: 'last_activity_at' })
  lastActivityAt: Date;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, unknown>;
}

export interface ChatMessageEntity {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCallEntity[];
  toolCallId?: string;
  timestamp: number;
}

export interface ToolCallEntity {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

@Entity('chat_agent_messages')
@Index('idx_agent_messages_session', ['sessionId'])
@Index('idx_agent_messages_agent', ['agentId'])
@Index('idx_agent_messages_user', ['userId'])
@Index('idx_agent_messages_created', ['createdAt'])
export class AgentMessage extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ type: 'enum', enum: ['user', 'assistant', 'system', 'tool'], default: 'user' })
  role: 'user' | 'assistant' | 'system' | 'tool';

  @Column({ type: 'enum', enum: ['text', 'image', 'file', 'event'], default: 'text' })
  type: 'text' | 'image' | 'file' | 'event';

  @Column({ type: 'jsonb', nullable: true, name: 'tool_calls' })
  toolCalls: ToolCallEntity[];

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'tool_call_id' })
  toolCallId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'int', nullable: true, default: 0, name: 'token_count' })
  tokenCount: number;
}

@Entity('chat_agent_tools')
@Index('idx_agent_tools_agent', ['agentId'])
export class AgentTool extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown>;
}

@Entity('chat_agent_skills')
@Index('idx_agent_skills_agent', ['agentId'])
export class AgentSkill extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'skill_id' })
  skillId: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  version: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown>;
}

@Entity('chat_agent_executions')
@Index('idx_agent_executions_agent', ['agentId'])
@Index('idx_agent_executions_session', ['sessionId'])
@Index('idx_agent_executions_user', ['userId'])
export class AgentExecution extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: ['pending', 'running', 'paused', 'completed', 'failed', 'aborted'], default: 'pending' })
  state: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted';

  @Column({ type: 'jsonb', nullable: true })
  steps: ExecutionStepEntity[];

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'ended_at' })
  endedAt: Date;

  @Column({ type: 'int', nullable: true, default: 0, name: 'total_tokens' })
  totalTokens: number;

  @Column({ type: 'jsonb', nullable: true })
  error: {
    message: string;
    code?: string;
    stack?: string;
  };
}

export interface ExecutionStepEntity {
  id: string;
  type: 'llm' | 'tool' | 'skill' | 'memory' | 'validation';
  name: string;
  input: unknown;
  output?: unknown;
  state: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  error?: {
    message: string;
    code?: string;
  };
}
