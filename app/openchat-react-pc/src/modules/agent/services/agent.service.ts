/**
 * Agent 服务层
 *
 * 职责：
 * 1. 调用后端 API 管理智能体
 * 2. 提供智能体市场功能
 * 3. 处理智能体会话和消息
 * 4. 开发环境模拟数据
 */

import { apiClient } from '@/services/api.client';
import { IS_DEV } from '@/app/env';
import {
  AgentCategory,
  AgentType,
  AgentStatus,
} from '../entities/agent.entity';
import type {
  Agent,
  AgentSession,
  AgentMessage,
  AgentTool,
  AgentSkill,
  AgentCategoryInfo,
  AgentStats,
  CreateAgentRequest,
  UpdateAgentRequest,
  CreateSessionRequest,
  SendMessageRequest,
  AddToolRequest,
  AddSkillRequest,
  ChatStreamChunk,
  AvailableTool,
  AvailableSkill,
} from '../entities/agent.entity';

const AGENT_ENDPOINT = '/agents';

const CATEGORY_INFOS: AgentCategoryInfo[] = [
  { id: AgentCategory.ALL, name: '全部', icon: '🔥', description: '所有智能体', agentCount: 100 },
  { id: AgentCategory.PRODUCTIVITY, name: '效率工具', icon: '⚡', description: '提升工作效率的智能体', agentCount: 25 },
  { id: AgentCategory.EDUCATION, name: '学习教育', icon: '📚', description: '学习和教育相关智能体', agentCount: 20 },
  { id: AgentCategory.ENTERTAINMENT, name: '娱乐休闲', icon: '🎮', description: '娱乐和休闲相关智能体', agentCount: 15 },
  { id: AgentCategory.LIFE, name: '生活助手', icon: '🏠', description: '日常生活相关智能体', agentCount: 18 },
  { id: AgentCategory.PROGRAMMING, name: '编程开发', icon: '💻', description: '编程和开发相关智能体', agentCount: 22 },
  { id: AgentCategory.WRITING, name: '写作创作', icon: '✍️', description: '写作和创作相关智能体', agentCount: 16 },
  { id: AgentCategory.BUSINESS, name: '商业办公', icon: '💼', description: '商业和办公相关智能体', agentCount: 14 },
  { id: AgentCategory.CREATIVE, name: '创意设计', icon: '🎨', description: '创意和设计相关智能体', agentCount: 12 },
];

// 模拟 Agent 数据
const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'AI 编程助手',
    description: '专业的编程助手，支持多种编程语言，可以帮助你解决代码问题、优化代码、解释代码逻辑。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '🤖',
    config: {
      category: AgentCategory.PROGRAMMING,
      tags: ['编程', '代码', '开发'],
      rating: 4.9,
      usageCount: 12580,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: '你是一个专业的编程助手，帮助用户解决编程问题。',
      },
    },
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-03-01').toISOString(),
  },
  {
    id: 'agent-2',
    name: '写作大师',
    description: '创意写作助手，可以帮助你写文章、故事、文案，提供写作建议和灵感。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '✍️',
    config: {
      category: AgentCategory.WRITING,
      tags: ['写作', '创意', '文案'],
      rating: 4.8,
      usageCount: 8920,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.9,
        maxTokens: 4096,
        systemPrompt: '你是一个创意写作助手，帮助用户创作优质内容。',
      },
    },
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date('2024-03-05').toISOString(),
  },
  {
    id: 'agent-3',
    name: '英语学习伙伴',
    description: '英语学习助手，可以帮助你练习英语对话、纠正语法错误、提供学习建议。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '📚',
    config: {
      category: AgentCategory.EDUCATION,
      tags: ['英语', '学习', '教育'],
      rating: 4.7,
      usageCount: 6750,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.6,
        maxTokens: 2048,
        systemPrompt: '你是一个英语学习助手，帮助用户提高英语水平。',
      },
    },
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date('2024-03-10').toISOString(),
  },
  {
    id: 'agent-4',
    name: '数据分析专家',
    description: '数据分析助手，可以帮助你分析数据、生成图表、提供数据洞察。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '📊',
    config: {
      category: AgentCategory.BUSINESS,
      tags: ['数据', '分析', '图表'],
      rating: 4.6,
      usageCount: 4520,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4096,
        systemPrompt: '你是一个数据分析专家，帮助用户分析和理解数据。',
      },
    },
    createdAt: new Date('2024-02-10').toISOString(),
    updatedAt: new Date('2024-03-12').toISOString(),
  },
  {
    id: 'agent-5',
    name: '旅行规划师',
    description: '旅行规划助手，可以根据你的需求制定完美的旅行计划，推荐景点和美食。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '✈️',
    config: {
      category: AgentCategory.LIFE,
      tags: ['旅行', '规划', '生活'],
      rating: 4.8,
      usageCount: 7230,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 2048,
        systemPrompt: '你是一个旅行规划师，帮助用户制定完美的旅行计划。',
      },
    },
    createdAt: new Date('2024-02-15').toISOString(),
    updatedAt: new Date('2024-03-15').toISOString(),
  },
  {
    id: 'agent-6',
    name: '健身教练',
    description: '健身指导助手，可以制定健身计划、提供营养建议、解答健身疑问。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '💪',
    config: {
      category: AgentCategory.LIFE,
      tags: ['健身', '运动', '健康'],
      rating: 4.5,
      usageCount: 3890,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: '你是一个健身教练，帮助用户实现健康目标。',
      },
    },
    createdAt: new Date('2024-02-20').toISOString(),
    updatedAt: new Date('2024-03-18').toISOString(),
  },
  {
    id: 'agent-7',
    name: '美食达人',
    description: '美食推荐助手，可以根据你的口味推荐菜谱、餐厅，提供烹饪技巧。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '🍳',
    config: {
      category: AgentCategory.LIFE,
      tags: ['美食', '烹饪', '生活'],
      rating: 4.7,
      usageCount: 5670,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 2048,
        systemPrompt: '你是一个美食达人，帮助用户发现和制作美食。',
      },
    },
    createdAt: new Date('2024-02-25').toISOString(),
    updatedAt: new Date('2024-03-20').toISOString(),
  },
  {
    id: 'agent-8',
    name: '心理咨询师',
    description: '心理健康助手，提供情绪支持、压力管理建议，帮助你保持心理健康。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '💚',
    config: {
      category: AgentCategory.LIFE,
      tags: ['心理', '健康', '情绪'],
      rating: 4.9,
      usageCount: 9870,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.9,
        maxTokens: 2048,
        systemPrompt: '你是一个心理咨询师，帮助用户处理情绪和心理问题。',
      },
    },
    createdAt: new Date('2024-03-01').toISOString(),
    updatedAt: new Date('2024-03-22').toISOString(),
  },
  {
    id: 'agent-9',
    name: '游戏攻略王',
    description: '游戏攻略助手，提供各种游戏的攻略、技巧、隐藏要素，帮助你成为游戏高手。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '🎮',
    config: {
      category: AgentCategory.ENTERTAINMENT,
      tags: ['游戏', '攻略', '娱乐'],
      rating: 4.6,
      usageCount: 4120,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: '你是一个游戏攻略专家，帮助用户掌握各种游戏技巧。',
      },
    },
    createdAt: new Date('2024-03-05').toISOString(),
    updatedAt: new Date('2024-03-24').toISOString(),
  },
  {
    id: 'agent-10',
    name: '设计师助手',
    description: '设计创意助手，提供设计灵感、配色建议、布局方案，帮助你完成设计项目。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '🎨',
    config: {
      category: AgentCategory.CREATIVE,
      tags: ['设计', '创意', '艺术'],
      rating: 4.8,
      usageCount: 6340,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.9,
        maxTokens: 4096,
        systemPrompt: '你是一个设计师助手，帮助用户完成创意设计项目。',
      },
    },
    createdAt: new Date('2024-03-10').toISOString(),
    updatedAt: new Date('2024-03-26').toISOString(),
  },
  {
    id: 'agent-11',
    name: '法律顾问',
    description: '法律咨询助手，提供法律知识解答、合同审查建议、法律风险评估。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '⚖️',
    config: {
      category: AgentCategory.BUSINESS,
      tags: ['法律', '咨询', '商务'],
      rating: 4.5,
      usageCount: 2890,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4096,
        systemPrompt: '你是一个法律顾问，帮助用户解答法律问题。',
      },
    },
    createdAt: new Date('2024-03-12').toISOString(),
    updatedAt: new Date('2024-03-28').toISOString(),
  },
  {
    id: 'agent-12',
    name: '投资理财师',
    description: '投资理财助手，提供投资建议、理财规划、风险评估，帮助你做出明智的财务决策。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.ACTIVE,
    avatar: '💰',
    config: {
      category: AgentCategory.BUSINESS,
      tags: ['投资', '理财', '金融'],
      rating: 4.4,
      usageCount: 3560,
      creator: 'OpenChat Team',
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.6,
        maxTokens: 2048,
        systemPrompt: '你是一个投资理财顾问，帮助用户做出明智的财务决策。',
      },
    },
    createdAt: new Date('2024-03-15').toISOString(),
    updatedAt: new Date('2024-03-30').toISOString(),
  },
];

// 模拟会话存储
const mockSessions: Map<string, AgentSession> = new Map();
const mockMessages: Map<string, AgentMessage[]> = new Map();

export class AgentService {
  async getAgents(isPublic?: boolean): Promise<Agent[]> {
    if (IS_DEV) {
      return MOCK_AGENTS.filter(agent => 
        isPublic === undefined || isPublic === true
      );
    }
    const params: Record<string, string | boolean> = {};
    if (isPublic !== undefined) {
      params.public = isPublic;
    }
    return apiClient.get(AGENT_ENDPOINT, { params });
  }

  async getAgent(id: string): Promise<Agent> {
    if (IS_DEV) {
      const agent = MOCK_AGENTS.find(a => a.id === id);
      if (!agent) throw new Error('Agent not found');
      return agent;
    }
    return apiClient.get(`${AGENT_ENDPOINT}/${id}`);
  }

  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    return apiClient.post(AGENT_ENDPOINT, request);
  }

  async updateAgent(id: string, request: UpdateAgentRequest): Promise<Agent> {
    return apiClient.put(`${AGENT_ENDPOINT}/${id}`, request);
  }

  async deleteAgent(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`${AGENT_ENDPOINT}/${id}`);
  }

  async getCategories(): Promise<AgentCategoryInfo[]> {
    return CATEGORY_INFOS;
  }

  async getPublicAgents(): Promise<Agent[]> {
    return this.getAgents(true);
  }

  async getMyAgents(): Promise<Agent[]> {
    return this.getAgents(false);
  }

  async createSession(
    agentId: string,
    request?: CreateSessionRequest
  ): Promise<AgentSession> {
    if (IS_DEV) {
      const sessionId = `session-${Date.now()}`;
      const session: AgentSession = {
        id: sessionId,
        agentId,
        userId: 'test-user',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockSessions.set(sessionId, session);
      mockMessages.set(sessionId, []);
      console.log('[Dev] Created session:', sessionId);
      return session;
    }
    return apiClient.post(`${AGENT_ENDPOINT}/${agentId}/sessions`, request || {});
  }

  async getSessions(agentId: string, limit?: number): Promise<AgentSession[]> {
    if (IS_DEV) {
      return Array.from(mockSessions.values())
        .filter(s => s.agentId === agentId)
        .slice(0, limit || 10);
    }
    const params: Record<string, number> = {};
    if (limit) {
      params.limit = limit;
    }
    return apiClient.get(`${AGENT_ENDPOINT}/${agentId}/sessions`, { params });
  }

  async getSession(sessionId: string): Promise<AgentSession> {
    if (IS_DEV) {
      const session = mockSessions.get(sessionId);
      if (!session) throw new Error('Session not found');
      return session;
    }
    return apiClient.get(`${AGENT_ENDPOINT}/sessions/${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    if (IS_DEV) {
      mockSessions.delete(sessionId);
      mockMessages.delete(sessionId);
      return { success: true };
    }
    return apiClient.delete(`${AGENT_ENDPOINT}/sessions/${sessionId}`);
  }

  async getMessages(
    sessionId: string,
    limit?: number,
    offset?: number
  ): Promise<AgentMessage[]> {
    if (IS_DEV) {
      const messages = mockMessages.get(sessionId) || [];
      return messages.slice(offset || 0, (offset || 0) + (limit || 50));
    }
    const params: Record<string, number> = {};
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    return apiClient.get(`${AGENT_ENDPOINT}/sessions/${sessionId}/messages`, {
      params,
    });
  }

  async sendMessage(
    sessionId: string,
    request: SendMessageRequest
  ): Promise<AgentMessage> {
    if (IS_DEV) {
      const messages = mockMessages.get(sessionId) || [];
      
      // 添加用户消息
      const userMessage: AgentMessage = {
        id: `msg-${Date.now()}-user`,
        sessionId,
        role: 'user',
        content: request.content,
        createdAt: new Date().toISOString(),
      };
      messages.push(userMessage);
      
      // 模拟 AI 响应
      const aiMessage: AgentMessage = {
        id: `msg-${Date.now()}-ai`,
        sessionId,
        role: 'assistant',
        content: this.generateMockResponse(request.content),
        createdAt: new Date().toISOString(),
      };
      messages.push(aiMessage);
      
      mockMessages.set(sessionId, messages);
      return aiMessage;
    }
    return apiClient.post(
      `${AGENT_ENDPOINT}/sessions/${sessionId}/messages`,
      request
    );
  }

  async streamMessage(
    sessionId: string,
    request: SendMessageRequest,
    onChunk: (chunk: ChatStreamChunk) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (IS_DEV) {
      // 开发环境模拟流式响应
      const messages = mockMessages.get(sessionId) || [];
      
      // 添加用户消息
      const userMessage: AgentMessage = {
        id: `msg-${Date.now()}-user`,
        sessionId,
        role: 'user',
        content: request.content,
        createdAt: new Date().toISOString(),
      };
      messages.push(userMessage);
      
      // 模拟 AI 流式响应
      const aiResponse = this.generateMockResponse(request.content);
      const aiMessageId = `msg-${Date.now()}-ai`;
      
      let currentContent = '';
      const words = aiResponse.split('');
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 30));
        currentContent += words[i];
        onChunk({
          id: aiMessageId,
          content: currentContent,
          done: i === words.length - 1,
        });
      }
      
      // 保存完整消息
      const aiMessage: AgentMessage = {
        id: aiMessageId,
        sessionId,
        role: 'assistant',
        content: aiResponse,
        createdAt: new Date().toISOString(),
      };
      messages.push(aiMessage);
      mockMessages.set(sessionId, messages);
      
      onComplete();
      return;
    }

    const token = localStorage.getItem('token');
    const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${API_BASE_URL}/api${AGENT_ENDPOINT}/sessions/${sessionId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      onError(error);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError(new Error('No response body'));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const chunk = JSON.parse(data);
              onChunk(chunk);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Stream error'));
    }
  }

  private generateMockResponse(userMessage: string): string {
    const responses = [
      `感谢您的提问！关于"${userMessage.slice(0, 20)}..."，我来为您详细解答。\n\n首先，这是一个很好的问题。让我从几个方面来分析：\n\n1. **核心概念**：理解这个问题的关键在于把握其本质。\n\n2. **实践建议**：我建议您可以从以下几个方面入手...\n\n3. **注意事项**：在处理这个问题时，需要注意...\n\n希望我的回答对您有所帮助！如果您还有其他问题，欢迎继续提问。`,
      
      `您好！很高兴为您解答这个问题。\n\n根据您的问题，我的理解是：\n\n${userMessage.slice(0, 50)}...\n\n**我的建议如下：**\n\n- 第一点：这是非常重要的方面\n- 第二点：需要考虑的因素\n- 第三点：具体的实施步骤\n\n如果您需要更详细的解释，请随时告诉我！`,
      
      `这是一个非常有趣的话题！\n\n让我来分享一些见解：\n\n> "${userMessage.slice(0, 30)}..."\n\n针对这个问题，我认为可以从多个角度来看待。首先，我们需要理解背景和上下文。其次，分析关键因素和变量。最后，制定合理的策略和方案。\n\n**总结要点：**\n1. 理解问题本质\n2. 分析相关因素\n3. 制定解决方案\n4. 持续优化改进\n\n希望这些信息对您有价值！`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async getAgentTools(agentId: string): Promise<AgentTool[]> {
    return apiClient.get(`${AGENT_ENDPOINT}/${agentId}/tools`);
  }

  async addToolToAgent(
    agentId: string,
    request: AddToolRequest
  ): Promise<AgentTool> {
    return apiClient.post(`${AGENT_ENDPOINT}/${agentId}/tools`, request);
  }

  async getAgentSkills(agentId: string): Promise<AgentSkill[]> {
    return apiClient.get(`${AGENT_ENDPOINT}/${agentId}/skills`);
  }

  async addSkillToAgent(
    agentId: string,
    request: AddSkillRequest
  ): Promise<AgentSkill> {
    return apiClient.post(`${AGENT_ENDPOINT}/${agentId}/skills`, request);
  }

  async getAvailableTools(): Promise<AvailableTool[]> {
    return apiClient.get(`${AGENT_ENDPOINT}/tools/available`);
  }

  async getAvailableSkills(): Promise<AvailableSkill[]> {
    return apiClient.get(`${AGENT_ENDPOINT}/skills/available`);
  }

  async startAgent(agentId: string): Promise<{ runtimeId: string; status: string }> {
    return apiClient.post(`${AGENT_ENDPOINT}/${agentId}/start`);
  }

  async stopAgent(agentId: string): Promise<{ status: string }> {
    return apiClient.post(`${AGENT_ENDPOINT}/${agentId}/stop`);
  }

  async resetAgent(agentId: string): Promise<{ status: string }> {
    return apiClient.post(`${AGENT_ENDPOINT}/${agentId}/reset`);
  }

  async getAgentStats(agentId: string): Promise<AgentStats> {
    if (IS_DEV) {
      return {
        totalSessions: Math.floor(Math.random() * 1000),
        totalMessages: Math.floor(Math.random() * 10000),
        avgResponseTime: Math.floor(Math.random() * 500) + 100,
        satisfactionRate: Math.random() * 0.2 + 0.8,
      };
    }
    return apiClient.get(`${AGENT_ENDPOINT}/${agentId}/stats`);
  }

  async searchAgents(
    keyword: string,
    category?: AgentCategory,
    type?: AgentType,
    sortBy: 'popular' | 'newest' | 'rating' = 'popular'
  ): Promise<Agent[]> {
    let agents = await this.getPublicAgents();

    if (category && category !== AgentCategory.ALL) {
      agents = agents.filter((agent) => {
        const config = agent.config as any;
        return config?.category === category;
      });
    }

    if (type) {
      agents = agents.filter((agent) => agent.type === type);
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      agents = agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(lowerKeyword) ||
          (agent.description?.toLowerCase().includes(lowerKeyword) ?? false)
      );
    }

    switch (sortBy) {
      case 'popular':
        agents.sort((a, b) => {
          const aCount = (a.config as any)?.usageCount || 0;
          const bCount = (b.config as any)?.usageCount || 0;
          return bCount - aCount;
        });
        break;
      case 'newest':
        agents.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'rating':
        agents.sort((a, b) => {
          const aRating = (a.config as any)?.rating || 0;
          const bRating = (b.config as any)?.rating || 0;
          return bRating - aRating;
        });
        break;
    }

    return agents;
  }

  async getRecommendedAgents(limit: number = 6): Promise<Agent[]> {
    const agents = await this.getPublicAgents();
    return agents
      .filter((agent) => {
        const rating = (agent.config as any)?.rating || 0;
        return rating >= 4.5;
      })
      .sort((a, b) => {
        const aCount = (a.config as any)?.usageCount || 0;
        const bCount = (b.config as any)?.usageCount || 0;
        return bCount - aCount;
      })
      .slice(0, limit);
  }
}

export const agentService = new AgentService();
