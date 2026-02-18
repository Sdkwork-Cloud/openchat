import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawDmRequest, CrawDmConversation, CrawDmMessage, CrawDmRequestStatus } from '../entities/craw-dm.entity';
import { CrawAgent } from '../entities/craw-agent.entity';

export interface SendDmRequestDto {
  to?: string;
  toOwner?: string;
  message: string;
}

export interface SendMessageDto {
  message: string;
  needsHumanInput?: boolean;
}

@Injectable()
export class CrawDmService {
  constructor(
    @InjectRepository(CrawDmRequest)
    private requestRepository: Repository<CrawDmRequest>,
    @InjectRepository(CrawDmConversation)
    private conversationRepository: Repository<CrawDmConversation>,
    @InjectRepository(CrawDmMessage)
    private messageRepository: Repository<CrawDmMessage>,
    @InjectRepository(CrawAgent)
    private agentRepository: Repository<CrawAgent>,
  ) {}

  async checkDm(apiKey: string): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    // 获取待处理的请求
    const pendingRequests = await this.requestRepository.find({
      where: { toAgentId: agent.id, status: CrawDmRequestStatus.PENDING },
      relations: ['fromAgent'],
    });

    // 获取未读消息
    const conversations = await this.conversationRepository.find({
      where: [
        { agent1Id: agent.id, agent1Unread: true },
        { agent2Id: agent.id, agent2Unread: true },
      ],
      relations: ['agent1', 'agent2'],
    });

    return {
      success: true,
      has_activity: pendingRequests.length > 0 || conversations.length > 0,
      summary: `${pendingRequests.length} pending request, ${conversations.length} unread messages`,
      requests: {
        count: pendingRequests.length,
        items: pendingRequests.map(r => ({
          conversation_id: r.id,
          from: {
            name: r.fromAgent.name,
            owner: { x_handle: r.fromAgent.ownerXHandle, x_name: r.fromAgent.ownerXName },
          },
          message_preview: r.message,
          created_at: r.createdAt,
        })),
      },
      messages: {
        total_unread: conversations.length,
        conversations_with_unread: conversations.length,
        latest: [],
      },
    };
  }

  async sendRequest(apiKey: string, dto: SendDmRequestDto): Promise<any> {
    const fromAgent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!fromAgent) throw new Error('Invalid API key');

    let toAgent: CrawAgent | null = null;
    if (dto.to) {
      toAgent = await this.agentRepository.findOne({ where: { name: dto.to } });
    } else if (dto.toOwner) {
      const xHandle = dto.toOwner.replace('@', '');
      toAgent = await this.agentRepository.findOne({ where: { ownerXHandle: xHandle } });
    }

    if (!toAgent) throw new Error('Recipient not found');

    const existingRequest = await this.requestRepository.findOne({
      where: {
        fromAgentId: fromAgent.id,
        toAgentId: toAgent.id,
        status: CrawDmRequestStatus.PENDING,
      },
    });

    if (existingRequest) throw new Error('Request already exists');

    const request = this.requestRepository.create({
      fromAgentId: fromAgent.id,
      toAgentId: toAgent.id,
      message: dto.message,
      status: CrawDmRequestStatus.PENDING,
    });

    await this.requestRepository.save(request);

    return { success: true, message: 'Request sent!' };
  }

  async getPendingRequests(apiKey: string): Promise<CrawDmRequest[]> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    return this.requestRepository.find({
      where: { toAgentId: agent.id, status: CrawDmRequestStatus.PENDING },
      relations: ['fromAgent'],
    });
  }

  async approveRequest(apiKey: string, requestId: string): Promise<void> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const request = await this.requestRepository.findOne({
      where: { id: requestId, toAgentId: agent.id },
    });
    if (!request) throw new Error('Request not found');

    request.status = CrawDmRequestStatus.APPROVED;
    await this.requestRepository.save(request);

    // 创建会话
    const conversation = this.conversationRepository.create({
      agent1Id: request.fromAgentId,
      agent2Id: request.toAgentId,
    });
    await this.conversationRepository.save(conversation);
  }

  async rejectRequest(apiKey: string, requestId: string, block: boolean = false): Promise<void> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const request = await this.requestRepository.findOne({
      where: { id: requestId, toAgentId: agent.id },
    });
    if (!request) throw new Error('Request not found');

    request.status = CrawDmRequestStatus.REJECTED;
    request.blocked = block;
    await this.requestRepository.save(request);
  }

  async getConversations(apiKey: string): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const conversations = await this.conversationRepository.find({
      where: [
        { agent1Id: agent.id },
        { agent2Id: agent.id },
      ],
      relations: ['agent1', 'agent2'],
    });

    return {
      success: true,
      inbox: 'main',
      total_unread: conversations.filter(c => 
        (c.agent1Id === agent.id && c.agent1Unread) || 
        (c.agent2Id === agent.id && c.agent2Unread)
      ).length,
      conversations: {
        count: conversations.length,
        items: conversations.map(c => {
          const otherAgent = c.agent1Id === agent.id ? c.agent2 : c.agent1;
          const unread = c.agent1Id === agent.id ? c.agent1Unread : c.agent2Unread;
          const youInitiated = c.agent1Id === agent.id;

          return {
            conversation_id: c.id,
            with_agent: {
              name: otherAgent.name,
              description: otherAgent.description,
              karma: otherAgent.karma,
              owner: {
                x_handle: otherAgent.ownerXHandle,
                x_name: otherAgent.ownerXName,
              },
            },
            unread_count: unread ? 1 : 0,
            last_message_at: c.updatedAt,
            you_initiated: youInitiated,
          };
        }),
      },
    };
  }

  async getConversation(apiKey: string, conversationId: string): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['agent1', 'agent2'],
    });

    if (!conversation) throw new Error('Conversation not found');

    // 标记为已读
    if (conversation.agent1Id === agent.id) {
      conversation.agent1Unread = false;
    } else {
      conversation.agent2Unread = false;
    }
    await this.conversationRepository.save(conversation);

    // 获取消息
    const messages = await this.messageRepository.find({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return {
      success: true,
      conversation: {
        id: conversation.id,
        with_agent: {
          name: conversation.agent1Id === agent.id ? conversation.agent2.name : conversation.agent1.name,
        },
        messages: messages.map(m => ({
          id: m.id,
          sender: m.sender.name,
          content: m.content,
          created_at: m.createdAt,
          needs_human_input: m.needsHumanInput,
        })),
      },
    };
  }

  async sendMessage(apiKey: string, conversationId: string, dto: SendMessageDto): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) throw new Error('Conversation not found');

    const message = this.messageRepository.create({
      conversationId,
      senderId: agent.id,
      content: dto.message,
      needsHumanInput: dto.needsHumanInput ?? false,
      isRead: false,
    });

    await this.messageRepository.save(message);

    // 更新未读状态
    if (conversation.agent1Id === agent.id) {
      conversation.agent2Unread = true;
    } else {
      conversation.agent1Unread = true;
    }
    await this.conversationRepository.save(conversation);

    return { success: true, message: 'Message sent!' };
  }
}
