# AI 机器人 API

AI 机器人 API 提供 AI 机器人的创建、管理、消息处理等功能。

## 概述

所有 AI 机器人 API 都需要 JWT 认证，路径前缀为 `/api/v1/ai-bots`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建机器人 | POST | `/ai-bots` | 创建新的AI机器人 |
| 获取机器人列表 | GET | `/ai-bots` | 获取所有AI机器人列表 |
| 获取机器人详情 | GET | `/ai-bots/:id` | 获取AI机器人详细信息 |
| 更新机器人 | PUT | `/ai-bots/:id` | 更新AI机器人信息 |
| 删除机器人 | DELETE | `/ai-bots/:id` | 删除AI机器人 |
| 激活机器人 | POST | `/ai-bots/:id/activate` | 激活AI机器人 |
| 停用机器人 | POST | `/ai-bots/:id/deactivate` | 停用AI机器人 |
| 处理消息 | POST | `/ai-bots/:id/messages` | 使用AI机器人处理消息 |

---

## 创建机器人

创建一个新的AI机器人。

```http
POST /api/v1/ai-bots
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "name": "智能客服助手",
  "description": "提供24小时在线客服支持",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "你是一个专业的客服助手，请用友好、专业的语气回答用户问题。",
    "apiKey": "sk-xxx",
    "apiEndpoint": "https://api.openai.com/v1"
  },
  "isActive": true
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 机器人名称 |
| description | string | 是 | 机器人描述 |
| type | string | 是 | 机器人类型：chatgpt, claude, custom |
| config | object | 否 | 机器人配置 |
| config.model | string | 否 | 使用的模型 |
| config.temperature | number | 否 | 温度参数（0-1） |
| config.maxTokens | number | 否 | 最大Token数 |
| config.systemPrompt | string | 否 | 系统提示词 |
| config.apiKey | string | 否 | API密钥 |
| config.apiEndpoint | string | 否 | API端点 |
| isActive | boolean | 否 | 是否激活，默认false |

### 响应示例

```json
{
  "id": "bot-uuid",
  "name": "智能客服助手",
  "description": "提供24小时在线客服支持",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "你是一个专业的客服助手..."
  },
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 400: 请求参数错误

---

## 获取机器人列表

获取所有AI机器人列表。

```http
GET /api/v1/ai-bots
Authorization: Bearer <access-token>
```

### 响应示例

```json
[
  {
    "id": "bot-001",
    "name": "智能客服助手",
    "description": "提供24小时在线客服支持",
    "type": "chatgpt",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "bot-002",
    "name": "代码助手",
    "description": "帮助用户编写和调试代码",
    "type": "claude",
    "isActive": true,
    "createdAt": "2024-01-14T15:00:00Z",
    "updatedAt": "2024-01-14T15:00:00Z"
  }
]
```

---

## 获取机器人详情

根据ID获取AI机器人详细信息。

```http
GET /api/v1/ai-bots/:id
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 响应示例

```json
{
  "id": "bot-uuid",
  "name": "智能客服助手",
  "description": "提供24小时在线客服支持",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "你是一个专业的客服助手，请用友好、专业的语气回答用户问题。"
  },
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: 机器人不存在

---

## 更新机器人

更新AI机器人信息。

```http
PUT /api/v1/ai-bots/:id
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 请求体

```json
{
  "name": "智能客服助手Pro",
  "description": "提供更专业的客服支持",
  "config": {
    "model": "gpt-4-turbo",
    "temperature": 0.5,
    "maxTokens": 4096
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 机器人名称 |
| description | string | 否 | 机器人描述 |
| type | string | 否 | 机器人类型 |
| config | object | 否 | 机器人配置 |
| isActive | boolean | 否 | 是否激活 |

### 响应示例

```json
{
  "id": "bot-uuid",
  "name": "智能客服助手Pro",
  "description": "提供更专业的客服支持",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4-turbo",
    "temperature": 0.5,
    "maxTokens": 4096
  },
  "isActive": true,
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### 错误响应

- 404: 机器人不存在

---

## 删除机器人

删除指定的AI机器人。

```http
DELETE /api/v1/ai-bots/:id
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 响应示例

无内容（HTTP 204）

### 错误响应

- 404: 机器人不存在

---

## 激活机器人

激活一个AI机器人，使其可以处理消息。

```http
POST /api/v1/ai-bots/:id/activate
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 响应示例

```json
{
  "success": true
}
```

### 错误响应

- 404: 机器人不存在

---

## 停用机器人

停用一个AI机器人，使其停止处理消息。

```http
POST /api/v1/ai-bots/:id/deactivate
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 响应示例

```json
{
  "success": true
}
```

### 错误响应

- 404: 机器人不存在

---

## 处理消息

使用AI机器人处理用户消息。

```http
POST /api/v1/ai-bots/:id/messages
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 请求体

```json
{
  "userId": "user-001",
  "message": "你好，我想了解一下你们的产品功能"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| message | string | 是 | 用户消息内容 |

### 响应示例

```json
{
  "id": "msg-uuid",
  "botId": "bot-uuid",
  "userId": "user-001",
  "userMessage": "你好，我想了解一下你们的产品功能",
  "response": "您好！很高兴为您介绍我们的产品功能。OpenChat是一个功能强大的即时通讯平台，主要功能包括：\n\n1. 多种消息类型支持（文本、图片、视频、语音等）\n2. 群组聊天和好友系统\n3. 实时音视频通话\n4. 消息搜索和历史记录\n5. AI智能助手集成\n\n请问您对哪个功能特别感兴趣？",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: 机器人不存在
- 400: 机器人未激活

---

## 机器人类型

| 类型 | 说明 | 支持的模型 |
|------|------|-----------|
| chatgpt | OpenAI ChatGPT | gpt-3.5-turbo, gpt-4, gpt-4-turbo |
| claude | Anthropic Claude | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| custom | 自定义机器人 | 用户自定义API |

---

## 数据类型

```typescript
interface AIBot {
  id: string;                    // 机器人ID
  name: string;                  // 机器人名称
  description: string;           // 机器人描述
  type: 'chatgpt' | 'claude' | 'custom'; // 机器人类型
  config: AIBotConfig;           // 机器人配置
  isActive: boolean;             // 是否激活
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}

interface AIBotConfig {
  model?: string;                // 使用的模型
  temperature?: number;          // 温度参数（0-1）
  maxTokens?: number;            // 最大Token数
  systemPrompt?: string;         // 系统提示词
  apiKey?: string;               // API密钥
  apiEndpoint?: string;          // API端点
  [key: string]: any;            // 其他配置
}

interface BotMessage {
  id: string;                    // 消息ID
  botId: string;                 // 机器人ID
  userId: string;                // 用户ID
  userMessage: string;           // 用户消息
  response: string;              // 机器人响应
  createdAt: Date;               // 创建时间
}

interface CreateBotRequest {
  name: string;                  // 机器人名称
  description: string;           // 机器人描述
  type: string;                  // 机器人类型
  config?: AIBotConfig;          // 机器人配置
  isActive?: boolean;            // 是否激活
}

interface ProcessMessageRequest {
  userId: string;                // 用户ID
  message: string;               // 用户消息
}
```

---

## 使用场景

### 1. 智能客服

创建一个智能客服机器人，自动回答用户常见问题：

```json
{
  "name": "智能客服",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4",
    "systemPrompt": "你是OpenChat的客服助手，请用专业、友好的语气回答用户问题。如果遇到无法解决的问题，请引导用户联系人工客服。"
  }
}
```

### 2. 代码助手

创建一个代码助手，帮助用户编写和调试代码：

```json
{
  "name": "代码助手",
  "type": "claude",
  "config": {
    "model": "claude-3-opus",
    "systemPrompt": "你是一个专业的编程助手，精通多种编程语言。请帮助用户编写、调试和优化代码，并提供最佳实践建议。"
  }
}
```

### 3. 翻译助手

创建一个多语言翻译助手：

```json
{
  "name": "翻译助手",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4",
    "systemPrompt": "你是一个专业的翻译助手，支持中文、英文、日文、韩文等多种语言的互译。请准确翻译用户提供的内容，并保持原文的风格和语气。"
  }
}
```

---

## 相关链接

- [消息管理 API](./messages.md)
- [用户管理 API](./users.md)
