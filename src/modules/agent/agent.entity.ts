import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { AgentStatus, AgentType } from './agent.interface';

@Entity('chat_agents')
@Index('idx_agents_owner', ['ownerId'])
@Index('idx_agents_status', ['status'])
@Index('idx_agents_type', ['type'])
@Index('idx_agents_public', ['isPublic', 'status'])
export class Agent extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: '智能体名称',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '智能体描述',
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '智能体头像URL',
  })
  avatar: string;

  @Column({
    type: 'enum',
    enum: AgentType,
    default: AgentType.CHAT,
    comment: '智能体类型',
  })
  type: AgentType;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.IDLE,
    comment: '智能体状态',
  })
  status: AgentStatus;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
    comment: '智能体配置',
  })
  config: AgentConfigEntity;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '所有者ID',
  })
  ownerId: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否公开',
  })
  isPublic: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否删除',
  })
  isDeleted: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
    comment: '智能体能力列表',
  })
  capabilities: AgentCapabilityEntity[];

  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
    comment: '关联知识库ID列表',
  })
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
  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '智能体ID',
  })
  agentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '用户ID',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '会话标题',
  })
  title: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
    comment: '会话上下文',
  })
  context: ChatMessageEntity[];

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '最后活动时间',
  })
  lastActivityAt: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment: '会话元数据',
  })
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
  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '会话ID',
  })
  sessionId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '智能体ID',
  })
  agentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '用户ID',
  })
  userId: string;

  @Column({
    type: 'text',
    nullable: false,
    comment: '消息内容',
  })
  content: string;

  @Column({
    type: 'enum',
    enum: ['user', 'assistant', 'system', 'tool'],
    default: 'user',
    comment: '消息角色',
  })
  role: 'user' | 'assistant' | 'system' | 'tool';

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'file', 'event'],
    default: 'text',
    comment: '消息类型',
  })
  type: 'text' | 'image' | 'file' | 'event';

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '工具调用',
  })
  toolCalls: ToolCallEntity[];

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '工具调用ID',
  })
  toolCallId: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '消息元数据',
  })
  metadata: Record<string, unknown>;

  @Column({
    type: 'int',
    nullable: true,
    default: 0,
    comment: 'Token数量',
  })
  tokenCount: number;
}

@Entity('chat_agent_tools')
@Index('idx_agent_tools_agent', ['agentId'])
export class AgentTool extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '智能体ID',
  })
  agentId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: '工具名称',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '工具描述',
  })
  description: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '工具参数Schema',
  })
  parameters: Record<string, unknown>;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  enabled: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '工具配置',
  })
  config: Record<string, unknown>;
}

@Entity('chat_agent_skills')
@Index('idx_agent_skills_agent', ['agentId'])
export class AgentSkill extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '智能体ID',
  })
  agentId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: '技能ID',
  })
  skillId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: '技能名称',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '技能描述',
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '技能版本',
  })
  version: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  enabled: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '技能配置',
  })
  config: Record<string, unknown>;
}

@Entity('chat_agent_executions')
@Index('idx_agent_executions_agent', ['agentId'])
@Index('idx_agent_executions_session', ['sessionId'])
@Index('idx_agent_executions_user', ['userId'])
export class AgentExecution extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '智能体ID',
  })
  agentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: '会话ID',
  })
  sessionId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: '用户ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'aborted'],
    default: 'pending',
    comment: '执行状态',
  })
  state: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted';

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '执行步骤',
  })
  steps: ExecutionStepEntity[];

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '开始时间',
  })
  startedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '结束时间',
  })
  endedAt: Date;

  @Column({
    type: 'int',
    nullable: true,
    default: 0,
    comment: '总Token数',
  })
  totalTokens: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '错误信息',
  })
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
