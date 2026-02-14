import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Agent,
  AgentSession,
  AgentMessage,
  AgentConfig,
  AgentStatus,
  AgentType,
  AgentEventType,
  ChatMessage,
} from './agent.interface';
import {
  Agent as AgentEntity,
  AgentSession as AgentSessionEntity,
  AgentMessage as AgentMessageEntity,
  AgentTool as AgentToolEntity,
  AgentSkill as AgentSkillEntity,
  AgentExecution as AgentExecutionEntity,
} from './agent.entity';
import { AgentRuntimeService } from './services/agent-runtime.service';
import { AgentEventService } from './agent-event.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(AgentEntity)
    private agentRepository: Repository<AgentEntity>,
    @InjectRepository(AgentSessionEntity)
    private sessionRepository: Repository<AgentSessionEntity>,
    @InjectRepository(AgentMessageEntity)
    private messageRepository: Repository<AgentMessageEntity>,
    @InjectRepository(AgentToolEntity)
    private toolRepository: Repository<AgentToolEntity>,
    @InjectRepository(AgentSkillEntity)
    private skillRepository: Repository<AgentSkillEntity>,
    @InjectRepository(AgentExecutionEntity)
    private executionRepository: Repository<AgentExecutionEntity>,
    private runtimeService: AgentRuntimeService,
    private eventService: AgentEventService,
  ) {}

  async createAgent(
    ownerId: string,
    data: {
      name: string;
      description?: string;
      avatar?: string;
      type?: AgentType;
      config?: AgentConfig;
      isPublic?: boolean;
    },
  ): Promise<Agent> {
    const agent = this.agentRepository.create({
      name: data.name,
      description: data.description || '',
      avatar: data.avatar || '',
      type: data.type || AgentType.CHAT,
      status: AgentStatus.IDLE,
      config: {
        model: data.config?.model || 'gpt-4',
        temperature: data.config?.temperature ?? 0.7,
        maxTokens: data.config?.maxTokens || 4096,
        systemPrompt: data.config?.systemPrompt || '',
        welcomeMessage: data.config?.welcomeMessage || '',
        tools: data.config?.tools || [],
        skills: data.config?.skills || [],
        memory: data.config?.memory || { maxTokens: 4000, limit: 100, type: 'short_term' },
        llm: data.config?.llm || { provider: 'openai' },
        customSettings: data.config?.customSettings || {},
      },
      ownerId,
      isPublic: data.isPublic || false,
      isDeleted: false,
      capabilities: [],
      knowledgeBaseIds: [],
    });

    const savedAgent = await this.agentRepository.save(agent);
    
    this.eventService.emit({
      type: AgentEventType.AGENT_INITIALIZED,
      timestamp: Date.now(),
      payload: { agent: savedAgent },
      metadata: { agentId: savedAgent.id },
    });

    this.logger.log(`Created agent: ${savedAgent.id} by owner: ${ownerId}`);
    
    return this.toAgent(savedAgent);
  }

  async updateAgent(
    id: string,
    ownerId: string,
    data: Partial<{
      name: string;
      description: string;
      avatar: string;
      type: AgentType;
      config: AgentConfig;
      isPublic: boolean;
      status: AgentStatus;
    }>,
  ): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id, ownerId, isDeleted: false },
    });

    if (!agent) {
      throw new NotFoundException(`Agent not found: ${id}`);
    }

    if (data.name !== undefined) agent.name = data.name;
    if (data.description !== undefined) agent.description = data.description;
    if (data.avatar !== undefined) agent.avatar = data.avatar;
    if (data.type !== undefined) agent.type = data.type;
    if (data.status !== undefined) agent.status = data.status;
    if (data.isPublic !== undefined) agent.isPublic = data.isPublic;
    if (data.config !== undefined) {
      agent.config = { ...agent.config, ...data.config };
    }

    const savedAgent = await this.agentRepository.save(agent);
    this.logger.log(`Updated agent: ${id}`);
    
    return this.toAgent(savedAgent);
  }

  async deleteAgent(id: string, ownerId: string): Promise<boolean> {
    const agent = await this.agentRepository.findOne({
      where: { id, ownerId, isDeleted: false },
    });

    if (!agent) {
      return false;
    }

    agent.isDeleted = true;
    await this.agentRepository.save(agent);
    
    this.eventService.emit({
      type: AgentEventType.AGENT_DESTROYED,
      timestamp: Date.now(),
      payload: { agentId: id },
      metadata: { agentId: id },
    });

    this.logger.log(`Deleted agent: ${id}`);
    return true;
  }

  async getAgentById(id: string): Promise<Agent | null> {
    const agent = await this.agentRepository.findOne({
      where: { id, isDeleted: false },
    });
    return agent ? this.toAgent(agent) : null;
  }

  async getAgentsByOwner(ownerId: string): Promise<Agent[]> {
    const agents = await this.agentRepository.find({
      where: { ownerId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
    return agents.map(this.toAgent);
  }

  async getPublicAgents(limit: number = 20, offset: number = 0): Promise<Agent[]> {
    const agents = await this.agentRepository.find({
      where: { isPublic: true, isDeleted: false, status: AgentStatus.READY },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return agents.map(this.toAgent);
  }

  async createSession(
    agentId: string,
    userId: string,
    title?: string,
  ): Promise<AgentSession> {
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent not found: ${agentId}`);
    }

    const session = this.sessionRepository.create({
      agentId,
      userId,
      title: title || `Chat with ${agent.name}`,
      context: [],
      lastActivityAt: new Date(),
      metadata: {},
    });

    const savedSession = await this.sessionRepository.save(session);
    this.logger.log(`Created session: ${savedSession.id} for agent: ${agentId}`);
    
    return this.toSession(savedSession);
  }

  async getSession(sessionId: string): Promise<AgentSession | null> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    return session ? this.toSession(session) : null;
  }

  async getSessionsByUser(
    agentId: string,
    userId: string,
    limit: number = 20,
  ): Promise<AgentSession[]> {
    const sessions = await this.sessionRepository.find({
      where: { agentId, userId },
      order: { lastActivityAt: 'DESC' },
      take: limit,
    });
    return sessions.map(this.toSession);
  }

  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.sessionRepository.delete({
      id: sessionId,
      userId,
    });
    return (result.affected || 0) > 0;
  }

  async getMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AgentMessage[]> {
    const messages = await this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });
    return messages.map(this.toMessage);
  }

  async addMessage(
    sessionId: string,
    agentId: string,
    userId: string,
    content: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    metadata?: Record<string, unknown>,
  ): Promise<AgentMessage> {
    const message = this.messageRepository.create({
      sessionId,
      agentId,
      userId,
      content,
      role,
      type: 'text',
      toolCalls: [],
      metadata: metadata || {},
      tokenCount: this.estimateTokens(content),
    });

    const savedMessage = await this.messageRepository.save(message);
    
    await this.sessionRepository.update(sessionId, {
      lastActivityAt: new Date(),
    });

    return this.toMessage(savedMessage);
  }

  async addToolToAgent(
    agentId: string,
    tool: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
      config?: Record<string, unknown>;
    },
  ): Promise<AgentToolEntity> {
    const agentTool = this.toolRepository.create({
      agentId,
      name: tool.name,
      description: tool.description || '',
      parameters: tool.parameters || {},
      enabled: true,
      config: tool.config || {},
    });

    return this.toolRepository.save(agentTool);
  }

  async addSkillToAgent(
    agentId: string,
    skill: {
      skillId: string;
      name: string;
      description?: string;
      version?: string;
      config?: Record<string, unknown>;
    },
  ): Promise<AgentSkillEntity> {
    const agentSkill = this.skillRepository.create({
      agentId,
      skillId: skill.skillId,
      name: skill.name,
      description: skill.description || '',
      version: skill.version || '1.0.0',
      enabled: true,
      config: skill.config || {},
    });

    return this.skillRepository.save(agentSkill);
  }

  async getAgentTools(agentId: string): Promise<AgentToolEntity[]> {
    return this.toolRepository.find({
      where: { agentId, enabled: true },
    });
  }

  async getAgentSkills(agentId: string): Promise<AgentSkillEntity[]> {
    return this.skillRepository.find({
      where: { agentId, enabled: true },
    });
  }

  async updateAgentStatus(id: string, status: AgentStatus): Promise<void> {
    await this.agentRepository.update(id, { status });
    this.logger.debug(`Updated agent ${id} status to ${status}`);
  }

  private toAgent(entity: AgentEntity): Agent {
    return {
      id: entity.id,
      uuid: entity.uuid,
      name: entity.name,
      description: entity.description,
      avatar: entity.avatar,
      type: entity.type,
      status: entity.status,
      config: entity.config as AgentConfig,
      ownerId: entity.ownerId,
      isPublic: entity.isPublic,
      isDeleted: entity.isDeleted,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toSession(entity: AgentSessionEntity): AgentSession {
    return {
      id: entity.id,
      agentId: entity.agentId,
      userId: entity.userId,
      title: entity.title,
      context: entity.context as ChatMessage[],
      lastActivityAt: entity.lastActivityAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toMessage(entity: AgentMessageEntity): AgentMessage {
    return {
      id: entity.id,
      agentId: entity.agentId,
      userId: entity.userId,
      sessionId: entity.sessionId,
      content: entity.content,
      role: entity.role,
      type: entity.type,
      toolCalls: entity.toolCalls,
      toolCallId: entity.toolCallId,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
