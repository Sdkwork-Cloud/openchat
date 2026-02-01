/**
 * Agent 实体定义
 *
 * 参考豆包智能体市场的功能设计
 */

/**
 * Agent 类型
 */
export type AgentType = 'official' | 'community' | 'custom';

/**
 * Agent 分类
 */
export type AgentCategory =
  | 'all'
  | 'productivity'
  | 'education'
  | 'entertainment'
  | 'life'
  | 'programming'
  | 'writing'
  | 'business'
  | 'creative';

/**
 * Agent 能力标签
 */
export type AgentCapability =
  | 'chat'
  | 'image-generation'
  | 'code-generation'
  | 'document-analysis'
  | 'web-search'
  | 'data-analysis'
  | 'translation'
  | 'summarization';

/**
 * Agent 实体
 */
export interface Agent {
  /** 唯一标识 */
  id: string;
  /** 名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 头像/图标 */
  avatar: string;
  /** 类型 */
  type: AgentType;
  /** 分类 */
  category: AgentCategory;
  /** 能力标签 */
  capabilities: AgentCapability[];
  /** 创建者 ID */
  creatorId: string;
  /** 创建者名称 */
  creatorName: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 使用次数 */
  usageCount: number;
  /** 评分 (1-5) */
  rating: number;
  /** 评分人数 */
  ratingCount: number;
  /** 是否已收藏 */
  isFavorited: boolean;
  /** 是否已添加到我的 Agent */
  isAdded: boolean;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 欢迎语 */
  welcomeMessage?: string;
  /** 示例问题 */
  exampleQuestions?: string[];
  /** 模型配置 */
  modelConfig?: AgentModelConfig;
  /** 工具配置 */
  tools?: AgentTool[];
}

/**
 * Agent 模型配置
 */
export interface AgentModelConfig {
  /** 模型名称 */
  model: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 token */
  maxTokens?: number;
  /** Top P */
  topP?: number;
}

/**
 * Agent 工具配置
 */
export interface AgentTool {
  /** 工具 ID */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
  /** 工具配置 */
  config?: Record<string, unknown>;
}

/**
 * Agent 分类信息
 */
export interface AgentCategoryInfo {
  /** 分类 ID */
  id: AgentCategory;
  /** 分类名称 */
  name: string;
  /** 分类图标 */
  icon: string;
  /** 描述 */
  description: string;
  /** Agent 数量 */
  agentCount: number;
}

/**
 * Agent 市场筛选条件
 */
export interface AgentMarketFilter {
  /** 分类 */
  category?: AgentCategory;
  /** 类型 */
  type?: AgentType;
  /** 搜索关键词 */
  keyword?: string;
  /** 排序方式 */
  sortBy: 'popular' | 'newest' | 'rating';
}

/**
 * Agent 对话消息
 */
export interface AgentMessage {
  /** 消息 ID */
  id: string;
  /** 会话 ID */
  conversationId: string;
  /** Agent ID */
  agentId: string;
  /** 角色 */
  role: 'user' | 'assistant' | 'system';
  /** 内容 */
  content: string;
  /** 创建时间 */
  createdAt: string;
  /** 附件 */
  attachments?: AgentAttachment[];
  /** 思考过程 (用于展示推理过程) */
  reasoning?: string;
  /** 使用的工具 */
  usedTools?: string[];
}

/**
 * Agent 附件
 */
export interface AgentAttachment {
  /** 附件 ID */
  id: string;
  /** 类型 */
  type: 'image' | 'file' | 'audio';
  /** URL */
  url: string;
  /** 名称 */
  name: string;
  /** 大小 */
  size?: number;
}

/**
 * Agent 会话
 */
export interface AgentConversation {
  /** 会话 ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** 用户 ID */
  userId: string;
  /** 会话标题 */
  title: string;
  /** 最后一条消息 */
  lastMessage?: AgentMessage;
  /** 消息数量 */
  messageCount: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 创建 Agent 请求
 */
export interface CreateAgentRequest {
  name: string;
  description: string;
  avatar?: string;
  category: AgentCategory;
  systemPrompt: string;
  welcomeMessage?: string;
  exampleQuestions?: string[];
  modelConfig?: AgentModelConfig;
  tools?: AgentTool[];
}

/**
 * 更新 Agent 请求
 */
export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  id: string;
}

/**
 * Agent 统计数据
 */
export interface AgentStats {
  /** 总使用次数 */
  totalUsage: number;
  /** 今日使用次数 */
  todayUsage: number;
  /** 本周使用次数 */
  weeklyUsage: number;
  /** 平均评分 */
  averageRating: number;
  /** 收藏数 */
  favoriteCount: number;
}
