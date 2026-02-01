/**
 * Agent 服务层
 *
 * 职责：
 * 1. 管理 Agent 数据
 * 2. 提供 Agent 市场功能
 * 3. 处理 Agent 对话
 */

import type {
  Agent,
  AgentCategory,
  AgentCategoryInfo,
  AgentConversation,
  AgentMarketFilter,
  AgentMessage,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentStats,
} from '../entities/agent.entity';

/**
 * 模拟 Agent 数据
 */
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: '编程助手',
    description: '专业的编程助手，擅长代码编写、调试和优化。支持多种编程语言，包括 JavaScript、Python、Java 等。',
    avatar: '💻',
    type: 'official',
    category: 'programming',
    capabilities: ['chat', 'code-generation', 'document-analysis'],
    creatorId: 'system',
    creatorName: 'OpenChat',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    usageCount: 12580,
    rating: 4.8,
    ratingCount: 2340,
    isFavorited: false,
    isAdded: true,
    welcomeMessage: '你好！我是编程助手，有什么代码问题我可以帮你解决吗？',
    exampleQuestions: [
      '帮我写一个快速排序算法',
      '解释 React 的 useEffect 钩子',
      '如何优化这段代码的性能？',
    ],
  },
  {
    id: 'agent-2',
    name: '文案大师',
    description: '专业的文案创作助手，擅长撰写各类营销文案、广告词、社交媒体内容等。',
    avatar: '✍️',
    type: 'official',
    category: 'writing',
    capabilities: ['chat', 'translation', 'summarization'],
    creatorId: 'system',
    creatorName: 'OpenChat',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    usageCount: 8920,
    rating: 4.6,
    ratingCount: 1850,
    isFavorited: true,
    isAdded: false,
    welcomeMessage: '你好！我是文案大师，需要创作什么类型的文案呢？',
    exampleQuestions: [
      '帮我写一条双11促销文案',
      '为这款咖啡写一段广告词',
      '写一篇关于AI的公众号文章',
    ],
  },
  {
    id: 'agent-3',
    name: '英语学习助手',
    description: '专业的英语学习助手，提供语法讲解、词汇学习、口语练习等功能。',
    avatar: '📚',
    type: 'official',
    category: 'education',
    capabilities: ['chat', 'translation'],
    creatorId: 'system',
    creatorName: 'OpenChat',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    usageCount: 15670,
    rating: 4.9,
    ratingCount: 3120,
    isFavorited: false,
    isAdded: true,
    welcomeMessage: 'Hello! I\'m your English learning assistant. How can I help you today?',
    exampleQuestions: [
      '解释现在完成时的用法',
      '帮我翻译这段话',
      '练习英语口语对话',
    ],
  },
  {
    id: 'agent-4',
    name: '数据分析专家',
    description: '专业的数据分析助手，擅长数据可视化、统计分析、报表生成等。',
    avatar: '📊',
    type: 'official',
    category: 'business',
    capabilities: ['chat', 'data-analysis', 'document-analysis'],
    creatorId: 'system',
    creatorName: 'OpenChat',
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    usageCount: 6780,
    rating: 4.5,
    ratingCount: 1200,
    isFavorited: false,
    isAdded: false,
    welcomeMessage: '你好！我是数据分析专家，有什么数据问题需要我帮忙分析吗？',
    exampleQuestions: [
      '分析这份销售数据',
      '帮我制作一个数据可视化图表',
      '解释什么是回归分析',
    ],
  },
  {
    id: 'agent-5',
    name: '创意设计师',
    description: '专业的设计创意助手，提供设计灵感、配色方案、排版建议等。',
    avatar: '🎨',
    type: 'community',
    category: 'creative',
    capabilities: ['chat', 'image-generation'],
    creatorId: 'user-1',
    creatorName: '设计达人',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    usageCount: 4560,
    rating: 4.3,
    ratingCount: 890,
    isFavorited: false,
    isAdded: false,
    welcomeMessage: '你好！我是创意设计师，需要什么样的设计灵感呢？',
    exampleQuestions: [
      '为我的品牌设计一个Logo',
      '推荐一套配色方案',
      '这个排版有什么改进建议？',
    ],
  },
  {
    id: 'agent-6',
    name: '生活助手',
    description: '贴心的生活助手，提供食谱推荐、旅行规划、健康建议等生活服务。',
    avatar: '🏠',
    type: 'official',
    category: 'life',
    capabilities: ['chat', 'web-search'],
    creatorId: 'system',
    creatorName: 'OpenChat',
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
    usageCount: 23450,
    rating: 4.7,
    ratingCount: 4560,
    isFavorited: true,
    isAdded: true,
    welcomeMessage: '你好！我是生活助手，有什么可以帮你的吗？',
    exampleQuestions: [
      '推荐一道简单的晚餐食谱',
      '规划一个周末旅行路线',
      '有什么健康生活的建议？',
    ],
  },
];

/**
 * Agent 分类信息
 */
const categoryInfos: AgentCategoryInfo[] = [
  { id: 'all', name: '全部', icon: '🔥', description: '所有智能体', agentCount: 100 },
  { id: 'productivity', name: '效率工具', icon: '⚡', description: '提升工作效率的智能体', agentCount: 25 },
  { id: 'education', name: '学习教育', icon: '📚', description: '学习和教育相关智能体', agentCount: 20 },
  { id: 'entertainment', name: '娱乐休闲', icon: '🎮', description: '娱乐和休闲相关智能体', agentCount: 15 },
  { id: 'life', name: '生活助手', icon: '🏠', description: '日常生活相关智能体', agentCount: 18 },
  { id: 'programming', name: '编程开发', icon: '💻', description: '编程和开发相关智能体', agentCount: 22 },
  { id: 'writing', name: '写作创作', icon: '✍️', description: '写作和创作相关智能体', agentCount: 16 },
  { id: 'business', name: '商业办公', icon: '💼', description: '商业和办公相关智能体', agentCount: 14 },
  { id: 'creative', name: '创意设计', icon: '🎨', description: '创意和设计相关智能体', agentCount: 12 },
];

/**
 * Agent 服务类
 */
export class AgentService {
  private agents: Agent[] = [...mockAgents];
  private conversations: AgentConversation[] = [];
  private messages: Map<string, AgentMessage[]> = new Map();

  /**
   * 获取 Agent 列表
   */
  async getAgents(filter?: AgentMarketFilter): Promise<Agent[]> {
    let result = [...this.agents];

    if (filter) {
      // 分类筛选
      if (filter.category && filter.category !== 'all') {
        result = result.filter((agent) => agent.category === filter.category);
      }

      // 类型筛选
      if (filter.type) {
        result = result.filter((agent) => agent.type === filter.type);
      }

      // 关键词搜索
      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase();
        result = result.filter(
          (agent) =>
            agent.name.toLowerCase().includes(keyword) ||
            agent.description.toLowerCase().includes(keyword)
        );
      }

      // 排序
      switch (filter.sortBy) {
        case 'popular':
          result.sort((a, b) => b.usageCount - a.usageCount);
          break;
        case 'newest':
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'rating':
          result.sort((a, b) => b.rating - a.rating);
          break;
      }
    }

    return result;
  }

  /**
   * 获取单个 Agent
   */
  async getAgent(id: string): Promise<Agent | null> {
    const agent = this.agents.find((a) => a.id === id);
    return agent || null;
  }

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<AgentCategoryInfo[]> {
    return categoryInfos;
  }

  /**
   * 获取推荐 Agent
   */
  async getRecommendedAgents(limit: number = 6): Promise<Agent[]> {
    return this.agents
      .filter((agent) => agent.rating >= 4.5)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * 获取我的 Agent
   */
  async getMyAgents(): Promise<Agent[]> {
    return this.agents.filter((agent) => agent.isAdded);
  }

  /**
   * 获取收藏的 Agent
   */
  async getFavoriteAgents(): Promise<Agent[]> {
    return this.agents.filter((agent) => agent.isFavorited);
  }

  /**
   * 添加 Agent 到我的列表
   */
  async addAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.isAdded = true;
      return true;
    }
    return false;
  }

  /**
   * 从我的列表移除 Agent
   */
  async removeAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.isAdded = false;
      return true;
    }
    return false;
  }

  /**
   * 收藏 Agent
   */
  async favoriteAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.isFavorited = true;
      return true;
    }
    return false;
  }

  /**
   * 取消收藏 Agent
   */
  async unfavoriteAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) {
      agent.isFavorited = false;
      return true;
    }
    return false;
  }

  /**
   * 创建 Agent
   */
  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      ...request,
      type: 'custom',
      creatorId: 'current-user',
      creatorName: '我',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      isFavorited: false,
      isAdded: true,
    };
    this.agents.push(newAgent);
    return newAgent;
  }

  /**
   * 更新 Agent
   */
  async updateAgent(request: UpdateAgentRequest): Promise<Agent | null> {
    const index = this.agents.findIndex((a) => a.id === request.id);
    if (index === -1) return null;

    this.agents[index] = {
      ...this.agents[index],
      ...request,
      updatedAt: new Date().toISOString(),
    };
    return this.agents[index];
  }

  /**
   * 删除 Agent
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    const index = this.agents.findIndex((a) => a.id === agentId);
    if (index === -1) return false;

    this.agents.splice(index, 1);
    return true;
  }

  /**
   * 获取 Agent 统计数据
   */
  async getAgentStats(agentId: string): Promise<AgentStats | null> {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return null;

    return {
      totalUsage: agent.usageCount,
      todayUsage: Math.floor(Math.random() * 100),
      weeklyUsage: Math.floor(Math.random() * 500),
      averageRating: agent.rating,
      favoriteCount: Math.floor(Math.random() * 1000),
    };
  }

  /**
   * 获取会话列表
   */
  async getConversations(agentId?: string): Promise<AgentConversation[]> {
    if (agentId) {
      return this.conversations.filter((c) => c.agentId === agentId);
    }
    return this.conversations;
  }

  /**
   * 创建会话
   */
  async createConversation(agentId: string, title: string): Promise<AgentConversation> {
    const conversation: AgentConversation = {
      id: `conv-${Date.now()}`,
      agentId,
      userId: 'current-user',
      title,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.push(conversation);
    this.messages.set(conversation.id, []);
    return conversation;
  }

  /**
   * 获取会话消息
   */
  async getMessages(conversationId: string): Promise<AgentMessage[]> {
    return this.messages.get(conversationId) || [];
  }

  /**
   * 发送消息
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{ userMessage: AgentMessage; assistantMessage: AgentMessage }> {
    const conversation = this.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error('Conversation not found');

    // 创建用户消息
    const userMessage: AgentMessage = {
      id: `msg-${Date.now()}-user`,
      conversationId,
      agentId: conversation.agentId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    // 模拟 AI 回复
    const agent = this.agents.find((a) => a.id === conversation.agentId);
    const assistantMessage: AgentMessage = {
      id: `msg-${Date.now()}-assistant`,
      conversationId,
      agentId: conversation.agentId,
      role: 'assistant',
      content: `我是 ${agent?.name || 'AI 助手'}，收到你的消息："${content}"\n\n这是一个模拟回复，实际项目中会调用 AI API 获取真实回复。`,
      createdAt: new Date().toISOString(),
    };

    // 保存消息
    const conversationMessages = this.messages.get(conversationId) || [];
    conversationMessages.push(userMessage, assistantMessage);
    this.messages.set(conversationId, conversationMessages);

    // 更新会话
    conversation.lastMessage = assistantMessage;
    conversation.messageCount += 2;
    conversation.updatedAt = new Date().toISOString();

    // 更新 Agent 使用次数
    if (agent) {
      agent.usageCount++;
    }

    return { userMessage, assistantMessage };
  }

  /**
   * 删除会话
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const index = this.conversations.findIndex((c) => c.id === conversationId);
    if (index === -1) return false;

    this.conversations.splice(index, 1);
    this.messages.delete(conversationId);
    return true;
  }
}

// 导出单例
export const agentService = new AgentService();
