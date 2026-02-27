/**
 * Agent 服务
 *
 * 职责：
 * 1. 管理 Agent 的 CRUD 操作
 * 2. 处理 Agent 对话和消息
 * 3. 管理 Agent 会话
 * 4. 提供 Agent 搜索和推荐
 */

import {
  Agent,
  AgentStatus,
  AgentType,
  AgentCategory,
  AgentSession,
  ChatMessage,
  AgentStats,
  CreateAgentRequest,
  UpdateAgentRequest,
  SendMessageRequest,
  CreateSessionRequest,
} from '../entities/agent.entity';

// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const AGENT_ENDPOINT = `${API_BASE_URL}/agents`;
const IS_DEV = import.meta.env.DEV;

// 模拟 Agent 数据
const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    uuid: 'agent-uuid-1',
    name: 'AI 编程助手',
    description: '专业的编程助手，支持多种编程语言，可以帮助你解决代码问题、优化代码、解释代码逻辑。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-03-01').toISOString(),
  },
  {
    id: 'agent-2',
    uuid: 'agent-uuid-2',
    name: '写作大师',
    description: '创意写作助手，可以帮助你写文章、故事、文案，提供写作建议和灵感。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date('2024-03-05').toISOString(),
  },
  {
    id: 'agent-3',
    uuid: 'agent-uuid-3',
    name: '英语学习伙伴',
    description: '英语学习助手，可以帮助你练习英语对话、纠正语法错误、提供学习建议。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date('2024-03-10').toISOString(),
  },
  {
    id: 'agent-4',
    uuid: 'agent-uuid-4',
    name: '数据分析专家',
    description: '数据分析助手，可以帮助你分析数据、生成图表、提供数据洞察。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-02-10').toISOString(),
    updatedAt: new Date('2024-03-12').toISOString(),
  },
  {
    id: 'agent-5',
    uuid: 'agent-uuid-5',
    name: '旅行规划师',
    description: '旅行规划助手，可以根据你的需求制定完美的旅行计划，推荐景点和美食。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-02-15').toISOString(),
    updatedAt: new Date('2024-03-15').toISOString(),
  },
  {
    id: 'agent-6',
    uuid: 'agent-uuid-6',
    name: '健身教练',
    description: '健身指导助手，可以制定健身计划、提供营养建议、解答健身疑问。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-02-20').toISOString(),
    updatedAt: new Date('2024-03-18').toISOString(),
  },
  {
    id: 'agent-7',
    uuid: 'agent-uuid-7',
    name: '美食达人',
    description: '美食推荐助手，可以根据你的口味推荐菜谱、餐厅，提供烹饪技巧。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-02-25').toISOString(),
    updatedAt: new Date('2024-03-20').toISOString(),
  },
  {
    id: 'agent-8',
    uuid: 'agent-uuid-8',
    name: '心理咨询师',
    description: '心理健康助手，提供情绪支持、压力管理建议，帮助你保持心理健康。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-03-01').toISOString(),
    updatedAt: new Date('2024-03-22').toISOString(),
  },
  {
    id: 'agent-9',
    uuid: 'agent-uuid-9',
    name: '游戏攻略王',
    description: '游戏攻略助手，提供各种游戏的攻略、技巧、隐藏要素，帮助你成为游戏高手。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-03-05').toISOString(),
    updatedAt: new Date('2024-03-24').toISOString(),
  },
  {
    id: 'agent-10',
    uuid: 'agent-uuid-10',
    name: '设计师助手',
    description: '设计创意助手，提供设计灵感、配色建议、布局方案，帮助你完成设计项目。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-03-10').toISOString(),
    updatedAt: new Date('2024-03-26').toISOString(),
  },
  {
    id: 'agent-11',
    uuid: 'agent-uuid-11',
    name: '法律顾问',
    description: '法律咨询助手，提供法律知识解答、合同审查建议、法律风险评估。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-03-12').toISOString(),
    updatedAt: new Date('2024-03-28').toISOString(),
  },
  {
    id: 'agent-12',
    uuid: 'agent-uuid-12',
    name: '投资理财师',
    description: '投资理财助手，提供投资建议、理财规划、风险评估，帮助你做出明智的财务决策。',
    type: AgentType.ASSISTANT,
    status: AgentStatus.READY,
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
    ownerId: 'system',
    isPublic: true,
    isDeleted: false,
    createdAt: new Date('2024-03-15').toISOString(),
    updatedAt: new Date('2024-03-30').toISOString(),
  },
];

// 模拟会话数据
const MOCK_SESSIONS: Map<string, AgentSession> = new Map();

// 模拟消息数据
const MOCK_MESSAGES: Map<string, ChatMessage[]> = new Map();

// API 客户端（模拟）
const apiClient = {
  get: async <T>(url: string): Promise<T> => {
    if (IS_DEV) {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 解析 URL 获取 agent ID
      const match = url.match(/\/agents\/([^\/]+)/);
      if (match) {
        const agentId = match[1];
        const agent = MOCK_AGENTS.find(a => a.id === agentId);
        if (agent) return agent as T;
      }
      
      throw new Error('Agent not found');
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  
  post: async <T>(url: string, data?: unknown): Promise<T> => {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 创建 Agent
      if (url === AGENT_ENDPOINT && data) {
        const newAgent: Agent = {
          ...(data as CreateAgentRequest),
          id: `agent-${Date.now()}`,
          uuid: `agent-uuid-${Date.now()}`,
          ownerId: 'current-user',
          isPublic: false,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Agent;
        MOCK_AGENTS.push(newAgent);
        return newAgent as T;
      }
      
      // 发送消息
      const match = url.match(/\/agents\/([^\/]+)\/messages/);
      if (match) {
        const agentId = match[1];
        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: '这是一个模拟的 AI 回复消息。',
          timestamp: Date.now(),
        } as T;
      }
      
      return {} as T;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  
  put: async <T>(url: string, data?: unknown): Promise<T> => {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const match = url.match(/\/agents\/([^\/]+)/);
      if (match && data) {
        const agentId = match[1];
        const index = MOCK_AGENTS.findIndex(a => a.id === agentId);
        if (index !== -1) {
          MOCK_AGENTS[index] = {
            ...MOCK_AGENTS[index],
            ...(data as UpdateAgentRequest),
            updatedAt: new Date().toISOString(),
          };
          return MOCK_AGENTS[index] as T;
        }
      }
      
      throw new Error('Agent not found');
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  
  delete: async (url: string): Promise<void> => {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const match = url.match(/\/agents\/([^\/]+)/);
      if (match) {
        const agentId = match[1];
        const index = MOCK_AGENTS.findIndex(a => a.id === agentId);
        if (index !== -1) {
          MOCK_AGENTS.splice(index, 1);
          return;
        }
      }
      
      throw new Error('Agent not found');
    }
    
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  },
};

// Agent 服务
export const AgentService = {
  // 获取 Agent 列表
  async getAgents(params?: {
    category?: AgentCategory;
    type?: AgentType;
    search?: string;
    sortBy?: 'popular' | 'newest' | 'rating';
    page?: number;
    pageSize?: number;
  }): Promise<{ agents: Agent[]; total: number }> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let filtered = [...MOCK_AGENTS];
      
      // 分类筛选
      if (params?.category && params.category !== AgentCategory.ALL) {
        filtered = filtered.filter(
          a => a.config.category === params.category
        );
      }
      
      // 类型筛选
      if (params?.type) {
        filtered = filtered.filter(a => a.type === params.type);
      }
      
      // 搜索
      if (params?.search) {
        const keyword = params.search.toLowerCase();
        filtered = filtered.filter(
          a =>
            a.name.toLowerCase().includes(keyword) ||
            a.description?.toLowerCase().includes(keyword) ||
            a.config.tags?.some(tag => tag.toLowerCase().includes(keyword))
        );
      }
      
      // 排序
      switch (params?.sortBy) {
        case 'popular':
          filtered.sort((a, b) => (b.config.usageCount || 0) - (a.config.usageCount || 0));
          break;
        case 'newest':
          filtered.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case 'rating':
          filtered.sort((a, b) => (b.config.rating || 0) - (a.config.rating || 0));
          break;
      }
      
      // 分页
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);
      
      return { agents: paginated, total: filtered.length };
    }
    
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());
    
    return apiClient.get(
      `${AGENT_ENDPOINT}?${queryParams.toString()}`
    );
  },

  // 获取单个 Agent
  async getAgent(agentId: string): Promise<Agent> {
    return apiClient.get(`${AGENT_ENDPOINT}/${agentId}`);
  },

  // 创建 Agent
  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    return apiClient.post(AGENT_ENDPOINT, request);
  },

  // 更新 Agent
  async updateAgent(
    agentId: string,
    request: UpdateAgentRequest
  ): Promise<Agent> {
    return apiClient.put(`${AGENT_ENDPOINT}/${agentId}`, request);
  },

  // 删除 Agent
  async deleteAgent(agentId: string): Promise<void> {
    return apiClient.delete(`${AGENT_ENDPOINT}/${agentId}`);
  },

  // 获取 Agent 会话列表
  async getAgentSessions(agentId: string): Promise<AgentSession[]> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return Array.from(MOCK_SESSIONS.values()).filter(
        s => s.agentId === agentId
      );
    }
    return apiClient.get(`${AGENT_ENDPOINT}/${agentId}/sessions`);
  },

  // 创建会话
  async createSession(
    agentId: string,
    request: CreateSessionRequest
  ): Promise<AgentSession> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const session: AgentSession = {
        id: `session-${Date.now()}`,
        agentId,
        userId: 'current-user',
        title: request.title || '新会话',
        context: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_SESSIONS.set(session.id, session);
      MOCK_MESSAGES.set(session.id, []);
      return session;
    }
    return apiClient.post(`${AGENT_ENDPOINT}/${agentId}/sessions`, request);
  },

  // 获取会话消息
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return MOCK_MESSAGES.get(sessionId) || [];
    }
    return apiClient.get(`${AGENT_ENDPOINT}/sessions/${sessionId}/messages`);
  },

  // 发送消息
  async sendMessage(
    sessionId: string,
    request: SendMessageRequest
  ): Promise<ChatMessage> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: request.content,
        timestamp: Date.now(),
      };
      
      const messages = MOCK_MESSAGES.get(sessionId) || [];
      messages.push(userMessage);
      
      // 模拟 AI 回复
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `这是模拟回复：我收到了你的消息 "${request.content}"。在实际应用中，这里会调用 LLM API 生成回复。`,
        timestamp: Date.now(),
      };
      messages.push(aiMessage);
      
      MOCK_MESSAGES.set(sessionId, messages);
      return aiMessage;
    }
    return apiClient.post(
      `${AGENT_ENDPOINT}/sessions/${sessionId}/messages`,
      request
    );
  },

  // 流式发送消息
  async streamMessage(
    sessionId: string,
    request: SendMessageRequest,
    onChunk: (chunk: { id: string; content: string; done: boolean }) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: request.content,
        timestamp: Date.now(),
      };
      
      const messages = MOCK_MESSAGES.get(sessionId) || [];
      messages.push(userMessage);
      
      // 模拟流式响应
      const responseText = `这是模拟的流式回复：我收到了你的消息 "${request.content}"。在实际应用中，这里会调用 LLM API 的流式接口。`;
      const chunks = responseText.split('');
      
      const aiMessageId = `msg-${Date.now()}-ai`;
      let accumulatedContent = '';
      
      for (let i = 0; i < chunks.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        accumulatedContent += chunks[i];
        onChunk({
          id: aiMessageId,
          content: accumulatedContent,
          done: i === chunks.length - 1,
        });
      }
      
      // 保存完整消息
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: accumulatedContent,
        timestamp: Date.now(),
      };
      messages.push(aiMessage);
      MOCK_MESSAGES.set(sessionId, messages);
      
      onComplete();
    } catch (error) {
      onError(error as Error);
    }
  },

  // 删除会话
  async deleteSession(sessionId: string): Promise<void> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 200));
      MOCK_SESSIONS.delete(sessionId);
      MOCK_MESSAGES.delete(sessionId);
      return;
    }
    return apiClient.delete(`${AGENT_ENDPOINT}/sessions/${sessionId}`);
  },

  // 清空会话历史
  async clearSessionHistory(sessionId: string): Promise<void> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 200));
      MOCK_MESSAGES.set(sessionId, []);
      return;
    }
    return apiClient.post(`${AGENT_ENDPOINT}/sessions/${sessionId}/clear`);
  },

  // 重置 Agent
  async resetAgent(agentId: string): Promise<void> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 300));
      // 删除该 Agent 的所有会话
      for (const [sessionId, session] of MOCK_SESSIONS.entries()) {
        if (session.agentId === agentId) {
          MOCK_SESSIONS.delete(sessionId);
          MOCK_MESSAGES.delete(sessionId);
        }
      }
      return;
    }
    return apiClient.post(`${AGENT_ENDPOINT}/${agentId}/reset`);
  },

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
  },

  async searchAgents(
    keyword: string,
    category?: AgentCategory,
    type?: AgentType,
    sortBy: 'popular' | 'newest' | 'rating' = 'popular'
  ): Promise<Agent[]> {
    if (IS_DEV) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let filtered = [...MOCK_AGENTS];
      
      // 关键词搜索
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        filtered = filtered.filter(
          agent =>
            agent.name.toLowerCase().includes(lowerKeyword) ||
            agent.description?.toLowerCase().includes(lowerKeyword) ||
            agent.config.tags?.some(tag =>
              tag.toLowerCase().includes(lowerKeyword)
            )
        );
      }
      
      // 分类筛选
      if (category && category !== AgentCategory.ALL) {
        filtered = filtered.filter(
          agent => agent.config.category === category
        );
      }
      
      // 类型筛选
      if (type) {
        filtered = filtered.filter(agent => agent.type === type);
      }
      
      // 排序
      switch (sortBy) {
        case 'popular':
          filtered.sort(
            (a, b) => (b.config.usageCount || 0) - (a.config.usageCount || 0)
          );
          break;
        case 'newest':
          filtered.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case 'rating':
          filtered.sort(
            (a, b) => (b.config.rating || 0) - (a.config.rating || 0)
          );
          break;
      }
      
      return filtered;
    }
    
    const queryParams = new URLSearchParams();
    queryParams.append('keyword', keyword);
    if (category) queryParams.append('category', category);
    if (type) queryParams.append('type', type);
    queryParams.append('sortBy', sortBy);
    
    return apiClient.get(`${AGENT_ENDPOINT}/search?${queryParams.toString()}`);
  },
};

export default AgentService;
