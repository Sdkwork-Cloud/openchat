# OpenChat 开放平台架构设计

## 设计目标

构建一个业界领先的即时通讯开放平台，支持：
- **Bot 开发生态** - 类似 Telegram Bot API 的简洁体验
- **企业集成** - 类似 Slack 的模块化设计
- **实时交互** - 类似 Discord 的组件系统
- **智能体调用** - 标准化的 AI Agent 接口

## 核心设计原则

1. **开放优先** - 所有功能通过 API 开放，无功能限制
2. **渐进复杂度** - 从简单 Token 到 OAuth，满足不同场景
3. **类型安全** - 100% TypeScript 类型覆盖
4. **事件驱动** - 统一的 Webhook + WebSocket 事件系统
5. **多租户隔离** - 企业级安全和数据隔离

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           开放平台层 (Open Platform)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Bot API    │  │  OAuth 2.0   │  │   Webhook    │  │    SDKs      │    │
│  │              │  │              │  │              │  │              │    │
│  │ • 消息收发   │  │ • 授权流程   │  │ • 事件推送   │  │ • TypeScript │    │
│  │ • 命令系统   │  │ • 权限范围   │  │ • 签名验证   │  │ • Python     │    │
│  │ • 交互组件   │  │ • Token管理  │  │ • 重试机制   │  │ • Go         │    │
│  │ • 卡片模板   │  │ • 刷新策略   │  │ • 过滤规则   │  │ • Java       │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      核心服务层 (Core Services)                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │ Bot Manager │  │  Command    │  │ Interaction │  │   Event    │ │   │
│  │  │             │  │   System    │  │   Engine    │  │   Router   │ │   │
│  │  │ • 注册管理  │  │             │  │             │  │            │ │   │
│  │  │ • 生命周期  │  │ • 命令注册  │  │ • 组件渲染  │  │ • 事件分发 │ │   │
│  │  │ • 权限控制  │  │ • 参数解析  │  │ • 回调处理  │  │ • 订阅管理 │ │   │
│  │  │ • 限流策略  │  │ • 自动补全  │  │ • 状态管理  │  │ • 过滤规则 │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │   Intent    │  │   Plugin    │  │   Agent     │  │  Context   │ │   │
│  │  │   Engine    │  │   System    │  │   Bridge    │  │   Store    │ │   │
│  │  │             │  │             │  │             │  │            │ │   │
│  │  │ • 意图识别  │  │ • 插件注册  │  │ • AI调用    │  │ • 会话状态 │ │   │
│  │  │ • 权限计算  │  │ • 沙箱执行  │  │ • 工具集成  │  │ • 用户偏好 │ │   │
│  │  │ • 事件过滤  │  │ • 扩展点    │  │ • 流式响应  │  │ • 历史记录 │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      基础设施层 (Infrastructure)                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Redis | PostgreSQL | RabbitMQ/Kafka | MinIO | Elasticsearch       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心模块设计

### 1. Bot 管理系统

```typescript
// Bot 实体定义
interface Bot {
  // 基础信息
  id: string;                    // Bot 唯一标识
  appId: string;                 // 应用 ID
  name: string;                  // Bot 名称
  username: string;              // Bot 用户名（唯一）
  description: string;           // 描述
  avatar?: string;               // 头像
  
  // 认证信息
  token: string;                 // Bot Token
  tokenHash: string;             // Token 哈希（存储用）
  
  // 权限配置
  intents: BotIntent[];          // 订阅的事件类型
  scopes: BotScope[];            // 权限范围
  
  // Webhook 配置
  webhook?: {
    url: string;                 // Webhook URL
    secret: string;              // 签名密钥
    events: string[];            // 订阅的事件
    retryPolicy: RetryPolicy;    // 重试策略
  };
  
  // 状态
  status: 'active' | 'inactive' | 'suspended';
  
  // 统计
  stats: {
    totalMessages: number;
    totalUsers: number;
    lastActivityAt: Date;
  };
  
  // 元数据
  createdBy: string;             // 创建者
  createdAt: Date;
  updatedAt: Date;
}

// Bot Intent（参考 Discord）
enum BotIntent {
  MESSAGES = 1 << 0,            // 消息事件
  MESSAGE_CONTENT = 1 << 1,     // 消息内容（敏感）
  USERS = 1 << 2,               // 用户信息
  GROUPS = 1 << 3,              // 群组信息
  REACTIONS = 1 << 4,           // 消息反应
  TYPING = 1 << 5,              // 输入状态
  PRESENCE = 1 << 6,            // 在线状态
  VOICE = 1 << 7,               // 语音状态
  COMMANDS = 1 << 8,            // 命令交互
  INTERACTIONS = 1 << 9,        // 组件交互
}

// Bot Scope（参考 Slack）
type BotScope = 
  | 'bot:basic'                 // 基础功能
  | 'messages:read'             // 读取消息
  | 'messages:send'             // 发送消息
  | 'messages:manage'           // 管理消息
  | 'users:read'                // 读取用户
  | 'users:read:email'          // 读取邮箱
  | 'groups:read'               // 读取群组
  | 'groups:manage'             // 管理群组
  | 'files:read'                // 读取文件
  | 'files:write'               // 上传文件
  | 'webhook'                   // 接收 Webhook
  | 'commands'                  // 注册命令
  | 'interactions';             // 交互组件
```

### 2. 命令系统

```typescript
// 命令定义（参考 Telegram + Discord）
interface BotCommand {
  // 基础信息
  name: string;                  // 命令名称（1-32字符，小写+下划线）
  description: string;           // 描述（1-100字符）
  
  // 多语言支持
  nameLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
  
  // 参数定义
  options?: CommandOption[];
  
  // 权限控制
  defaultMemberPermissions?: string[];  // 默认需要的权限
  dmPermission?: boolean;        // 是否可在私信使用
  contexts?: ('private' | 'group' | 'supergroup')[];
  
  // 处理器
  handler: CommandHandler;
}

// 命令选项类型
interface CommandOption {
  name: string;
  description: string;
  type: CommandOptionType;
  required?: boolean;
  choices?: CommandChoice[];     // 预定义选项
  autocomplete?: boolean;        // 是否启用自动补全
  channelTypes?: string[];       // 限制频道类型
  minValue?: number;             // 数值最小值
  maxValue?: number;             // 数值最大值
  minLength?: number;            // 字符串最小长度
  maxLength?: number;            // 字符串最大长度
}

enum CommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
  NUMBER = 10,
  ATTACHMENT = 11,
}

// 命令上下文
interface CommandContext {
  bot: Bot;
  command: BotCommand;
  user: User;
  conversation: Conversation;
  args: CommandArgs;
  options: Record<string, any>;
  
  // 回复方法
  reply: (content: MessageContent) => Promise<Message>;
  replyWithCard: (card: Card) => Promise<Message>;
  showModal: (modal: Modal) => Promise<void>;
  deferReply: () => Promise<DeferredResponse>;
  
  // 交互数据
  triggerId: string;             // 用于打开模态框
  responseUrl?: string;          // 延迟响应 URL
}
```

### 3. 交互组件系统

```typescript
// 消息组件（参考 Slack Block Kit + Discord Components）
interface MessageComponent {
  type: ComponentType;
  id: string;                    // 组件唯一标识
}

enum ComponentType {
  // 容器组件
  ACTION_ROW = 1,               // 操作行（容纳其他组件）
  
  // 基础组件
  BUTTON = 2,                   // 按钮
  SELECT_MENU = 3,              // 选择菜单
  TEXT_INPUT = 4,               // 文本输入
  
  // 高级选择器
  USER_SELECT = 5,              // 用户选择
  CHANNEL_SELECT = 6,           // 频道选择
  ROLE_SELECT = 7,              // 角色选择
  MENTIONABLE_SELECT = 8,       // 可提及选择
}

// 按钮组件
interface ButtonComponent extends MessageComponent {
  type: ComponentType.BUTTON;
  style: ButtonStyle;
  label: string;
  emoji?: Emoji;
  
  // 动作类型
  action: 
    | { type: 'callback'; data: string }     // 回调动作
    | { type: 'url'; url: string }           // 跳转链接
    | { type: 'webapp'; url: string };       // 打开 Web App
  
  disabled?: boolean;
}

enum ButtonStyle {
  PRIMARY = 1,                  // 主按钮（品牌色）
  SECONDARY = 2,                // 次要按钮（灰色）
  SUCCESS = 3,                  // 成功（绿色）
  DANGER = 4,                   // 危险（红色）
  LINK = 5,                     // 链接（带箭头）
}

// 选择菜单
interface SelectMenuComponent extends MessageComponent {
  type: ComponentType.SELECT_MENU;
  placeholder?: string;
  options: SelectOption[];
  minValues?: number;            // 最少选择数
  maxValues?: number;            // 最多选择数
  disabled?: boolean;
}

// 文本输入（用于模态框）
interface TextInputComponent extends MessageComponent {
  type: ComponentType.TEXT_INPUT;
  style: TextInputStyle;
  label: string;
  placeholder?: string;
  value?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}

enum TextInputStyle {
  SHORT = 1,                    // 单行输入
  PARAGRAPH = 2,                // 多行输入
}

// 回调查询（参考 Telegram CallbackQuery）
interface ComponentCallback {
  id: string;                    // 回调唯一标识
  componentType: ComponentType;
  componentId: string;
  
  // 触发者信息
  user: User;
  conversation: Conversation;
  message?: Message;             // 触发回调的消息
  
  // 数据
  data: string;                  // 回调数据（1-100字符）
  values?: string[];             // 选择菜单的值
  
  // 响应方法
  ack: () => Promise<void>;      // 确认接收（必须调用）
  reply: (content: MessageContent) => Promise<void>;
  update: (content: MessageContent) => Promise<void>;
  showModal: (modal: Modal) => Promise<void>;
}
```

### 4. 卡片模板系统

```typescript
// 消息卡片（参考 Slack Block Kit + Teams Adaptive Cards）
interface MessageCard {
  version: string;               // 卡片版本
  type: 'card';
  
  // 头部
  header?: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    style?: 'default' | 'info' | 'success' | 'warning' | 'error';
  };
  
  // 内容区域
  sections: CardSection[];
  
  // 操作区
  actions?: CardAction[];
  
  // 样式
  theme?: 'light' | 'dark' | 'auto';
  accentColor?: string;
}

// 卡片区块
interface CardSection {
  type: 'section';
  text?: RichText;
  fields?: Field[];              // 键值对列表
  accessory?: ButtonComponent | ImageComponent | SelectMenuComponent;
  separator?: boolean;           // 是否显示分隔线
}

// 富文本
interface RichText {
  type: 'mrkdwn' | 'plain_text' | 'html';
  content: string;
  emoji?: boolean;               // 是否解析 emoji
}

// 字段
interface Field {
  title: string;
  value: string;
  short?: boolean;               // 是否短字段（并排显示）
}

// 卡片动作
interface CardAction {
  type: 'action_row';
  elements: (ButtonComponent | SelectMenuComponent | DatePicker | TimePicker)[];
}

// 使用示例
const exampleCard: MessageCard = {
  version: '1.0',
  type: 'card',
  header: {
    title: '订单确认',
    subtitle: '订单号: #12345',
    style: 'success'
  },
  sections: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        content: '您的订单已确认，预计 **3天内** 发货'
      },
      fields: [
        { title: '商品', value: 'iPhone 15 Pro', short: true },
        { title: '价格', value: '¥8999', short: true },
        { title: '数量', value: '1', short: true },
        { title: '总计', value: '¥8999', short: true }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'plain_text',
        content: '如有问题请联系客服'
      }
    }
  ],
  actions: [
    {
      type: 'action_row',
      elements: [
        {
          type: ComponentType.BUTTON,
          id: 'btn_view_order',
          style: ButtonStyle.PRIMARY,
          label: '查看详情',
          action: { type: 'callback', data: 'view_order:12345' }
        },
        {
          type: ComponentType.BUTTON,
          id: 'btn_cancel_order',
          style: ButtonStyle.DANGER,
          label: '取消订单',
          action: { type: 'callback', data: 'cancel_order:12345' }
        }
      ]
    }
  ]
};
```

### 5. 事件系统

```typescript
// 事件类型（统一命名空间）
type OpenChatEvent =
  // 消息事件
  | MessageReceivedEvent
  | MessageSentEvent
  | MessageDeliveredEvent
  | MessageReadEvent
  | MessageUpdatedEvent
  | MessageDeletedEvent
  | MessageReactedEvent
  
  // 用户事件
  | UserOnlineEvent
  | UserOfflineEvent
  | UserTypingEvent
  | UserProfileUpdatedEvent
  
  // 群组事件
  | GroupMemberJoinedEvent
  | GroupMemberLeftEvent
  | GroupInfoUpdatedEvent
  
  // Bot 事件
  | BotCommandEvent
  | BotCallbackEvent
  | BotFormSubmitEvent
  | BotMentionedEvent
  
  // 系统事件
  | SystemNoticeEvent;

// 基础事件结构
interface BaseEvent {
  eventId: string;               // 事件唯一标识（幂等性）
  eventType: string;             // 事件类型
  timestamp: number;             // 时间戳
  botId: string;                 // 接收方 Bot ID
  
  // 签名验证
  signature?: string;
}

// 消息接收事件
interface MessageReceivedEvent extends BaseEvent {
  eventType: 'message.received';
  data: {
    message: Message;
    conversation: Conversation;
    sender: User;
  };
}

// Bot 命令事件
interface BotCommandEvent extends BaseEvent {
  eventType: 'bot.command';
  data: {
    command: string;
    args: string;
    user: User;
    conversation: Conversation;
    triggerId: string;
    responseUrl?: string;
  };
}

// Bot 回调事件
interface BotCallbackEvent extends BaseEvent {
  eventType: 'bot.callback';
  data: {
    callbackId: string;
    componentType: ComponentType;
    componentId: string;
    data: string;
    user: User;
    conversation: Conversation;
    message?: Message;
  };
}

// Webhook 配置
interface WebhookConfig {
  url: string;                   // Webhook URL（必须 HTTPS）
  secret: string;                // 签名密钥
  events: string[];              // 订阅的事件类型（支持通配符）
  
  // 过滤规则
  filters?: {
    conversations?: string[];    // 指定会话
    users?: string[];            // 指定用户
    groups?: string[];           // 指定群组
  };
  
  // 重试策略
  retryPolicy: {
    maxRetries: number;          // 最大重试次数
    backoffType: 'fixed' | 'exponential';
    initialDelay: number;        // 初始延迟（毫秒）
    maxDelay: number;            // 最大延迟（毫秒）
  };
  
  // 超时设置
  timeout: number;               // 请求超时（毫秒）
}

// Webhook 签名验证
interface WebhookSignature {
  algorithm: 'HMAC-SHA256';
  header: 'X-OpenChat-Signature';
  timestamp: 'X-OpenChat-Timestamp';
  version: 'v1';
}
```

### 6. 智能体调用接口

```typescript
// AI Agent 调用标准接口
interface AgentInterface {
  // 基础信息
  id: string;
  name: string;
  description: string;
  version: string;
  
  // 能力声明
  capabilities: AgentCapability[];
  
  // 调用端点
  endpoint: string;
  
  // 认证方式
  auth: {
    type: 'bearer' | 'api_key' | 'oauth';
    config: Record<string, any>;
  };
}

// Agent 能力
interface AgentCapability {
  name: string;
  description: string;
  parameters: JSONSchema;
  returns: JSONSchema;
}

// Agent 调用请求
interface AgentInvokeRequest {
  agentId: string;
  capability: string;
  parameters: Record<string, any>;
  context: {
    conversationId: string;
    userId: string;
    messageId?: string;
    history?: Message[];
  };
  streaming?: boolean;           // 是否流式响应
}

// Agent 调用响应
interface AgentInvokeResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  usage?: {
    tokens: number;
    cost: number;
    latency: number;
  };
}

// 流式响应
interface AgentStreamResponse {
  type: 'chunk' | 'tool_call' | 'tool_result' | 'complete' | 'error';
  data: any;
}

// Bot 与 Agent 集成
interface BotAgentIntegration {
  // Agent 注册
  registerAgent: (agent: AgentInterface) => Promise<void>;
  
  // 能力发现
  discoverCapabilities: (agentId: string) => Promise<AgentCapability[]>;
  
  // 调用 Agent
  invoke: (request: AgentInvokeRequest) => Promise<AgentInvokeResponse>;
  invokeStream: (request: AgentInvokeRequest) => AsyncIterable<AgentStreamResponse>;
  
  // 工具调用（Function Calling）
  registerTool: (tool: AgentTool) => void;
  handleToolCall: (call: ToolCall) => Promise<ToolResult>;
}

// Agent 工具
interface AgentTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  handler: (params: any, context: ToolContext) => Promise<any>;
}

interface ToolContext {
  bot: Bot;
  user: User;
  conversation: Conversation;
  message: Message;
}
```

## API 端点设计

### REST API

```yaml
# Bot 管理
POST   /api/v1/bots                    # 创建 Bot
GET    /api/v1/bots                    # 获取 Bot 列表
GET    /api/v1/bots/:id                # 获取 Bot 详情
PUT    /api/v1/bots/:id                # 更新 Bot
DELETE /api/v1/bots/:id                # 删除 Bot
POST   /api/v1/bots/:id/regenerate-token  # 重新生成 Token

# 消息发送
POST   /api/v1/bots/:id/messages       # 发送消息
POST   /api/v1/bots/:id/messages/bulk  # 批量发送
POST   /api/v1/bots/:id/messages/:messageId/edit    # 编辑消息
DELETE /api/v1/bots/:id/messages/:messageId         # 删除消息

# 命令管理
POST   /api/v1/bots/:id/commands       # 注册命令
GET    /api/v1/bots/:id/commands       # 获取命令列表
DELETE /api/v1/bots/:id/commands/:name # 删除命令

# Webhook 管理
POST   /api/v1/bots/:id/webhook        # 设置 Webhook
DELETE /api/v1/bots/:id/webhook        # 删除 Webhook
GET    /api/v1/bots/:id/webhook/status # 获取 Webhook 状态

# 文件上传
POST   /api/v1/bots/:id/files          # 上传文件
GET    /api/v1/files/:id               # 获取文件

# 用户信息
GET    /api/v1/users/:id               # 获取用户信息
GET    /api/v1/users/:id/conversations # 获取用户会话列表

# 群组信息
GET    /api/v1/groups/:id              # 获取群组信息
GET    /api/v1/groups/:id/members      # 获取群组成员
POST   /api/v1/groups/:id/members      # 添加成员

# Agent 接口
POST   /api/v1/agents                  # 注册 Agent
GET    /api/v1/agents                  # 获取 Agent 列表
POST   /api/v1/agents/:id/invoke       # 调用 Agent
POST   /api/v1/agents/:id/invoke/stream # 流式调用
```

### WebSocket API

```yaml
# 连接
CONNECT /ws/bots/:token                # 使用 Bot Token 连接

# 发送消息
EVENT message:send
{
  "messageId": "uuid",
  "type": "text",
  "content": {...},
  "conversationId": "...",
  "replyTo?: "..."
}

# 接收事件
EVENT message:received
EVENT message:delivered
EVENT message:read
EVENT bot:command
EVENT bot:callback
EVENT user:typing
```

## 安全设计

### 1. 认证安全

```typescript
// Token 安全
interface TokenSecurity {
  // Token 格式
  format: 'oc_bot_<appId>_<random32>';
  
  // 存储
  storage: {
    hash: 'bcrypt' | 'argon2';     // 存储哈希值
    plaintext: never;              // 从不存储明文
  };
  
  // 传输
  transport: {
    header: 'Authorization: Bearer <token>';
    https: 'required';             // 强制 HTTPS
  };
  
  // 轮换
  rotation: {
    recommendedInterval: '90 days';
    gracePeriod: '7 days';         // 新旧 Token 同时有效
  };
}

// OAuth 2.0 + PKCE
interface OAuthSecurity {
  // 授权码流程
  flow: 'authorization_code';
  
  // PKCE 支持
  pkce: {
    required: true;
    methods: ['S256'];
  };
  
  // 状态参数
  state: {
    required: true;
    length: '32+ bytes';
  };
  
  // Token 类型
  tokens: {
    accessToken: 'JWT';
    refreshToken: 'opaque';
    idToken: 'JWT (OpenID Connect)';
  };
}
```

### 2. Webhook 安全

```typescript
// Webhook 签名验证
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// 时间戳验证（防重放）
function verifyTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const tolerance = 5 * 60 * 1000; // 5 分钟容差
  return Math.abs(now - timestamp) < tolerance;
}
```

### 3. 权限控制

```typescript
// 基于角色的权限控制（RBAC）
interface RBAC {
  roles: {
    owner: ['*'];                  // 所有权限
    admin: ['bots:manage', 'webhooks:manage'];
    developer: ['bots:read', 'bots:write', 'messages:send'];
    readonly: ['bots:read', 'messages:read'];
  };
  
  // 资源级权限
  resources: {
    bot: ['read', 'write', 'delete', 'manage'];
    message: ['read', 'send', 'edit', 'delete'];
    user: ['read', 'read:email'];
    group: ['read', 'manage'];
  };
}
```

## 开发者体验

### 1. SDK 设计

```typescript
// TypeScript SDK 示例
import { OpenChatBot } from '@openchat/bot-sdk';

const bot = new OpenChatBot({
  token: process.env.BOT_TOKEN,
  intents: ['MESSAGES', 'COMMANDS', 'INTERACTIONS']
});

// 命令注册
bot.command({
  name: 'hello',
  description: 'Say hello',
  options: [{
    name: 'name',
    description: 'Your name',
    type: 'STRING',
    required: false
  }]
}, async (ctx) => {
  const name = ctx.options.name || 'World';
  await ctx.reply(`Hello, ${name}!`);
});

// 消息监听
bot.on('message.received', async (message) => {
  if (message.content.text === 'ping') {
    await bot.sendMessage({
      conversationId: message.conversationId,
      content: { type: 'text', text: 'pong' }
    });
  }
});

// 交互组件
bot.on('callback', async (callback) => {
  if (callback.data === 'confirm') {
    await callback.update({
      content: { type: 'text', text: 'Confirmed!' }
    });
  }
});

// 启动
bot.start();
```

### 2. 调试工具

```typescript
// 开发模式
bot.setLogLevel('debug');

// 本地 Webhook 测试
bot.startWebhookTunnel({
  port: 3000,
  ngrok: true  // 自动启动 ngrok
});

// 模拟事件
bot.simulate('message.received', {
  message: { ... },
  user: { ... }
});
```

## 实施路线图

### Phase 1: 基础能力（1-2月）
- [ ] Bot 注册和认证系统
- [ ] 基础消息 API
- [ ] Webhook 系统
- [ ] TypeScript SDK

### Phase 2: 交互能力（2-3月）
- [ ] 命令系统
- [ ] 基础交互组件（按钮、选择器）
- [ ] 卡片模板
- [ ] Python SDK

### Phase 3: 高级能力（3-4月）
- [ ] 高级交互组件（表单、模态框）
- [ ] Agent 集成接口
- [ ] 插件系统
- [ ] Go/Java SDK

### Phase 4: 企业特性（4-6月）
- [ ] OAuth 2.0 完整支持
- [ ] 审批流程集成
- [ ] 高级权限控制
- [ ] 审计日志
- [ ] 多租户支持

---

*设计文档版本: 1.0*  
*最后更新: 2026-02-01*
