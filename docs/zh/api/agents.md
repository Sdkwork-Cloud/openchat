# AI Agent API

AI Agent API 提供智能代理的创建、管理、消息交互等功能。

## 概述

所有 AI Agent API 都需要 JWT 认证，路径前缀为 `/api/v1/agents`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建Agent | POST | `/agents` | 创建新的AI代理 |
| 获取Agent列表 | GET | `/agents` | 获取用户的Agent列表 |
| 获取Agent详情 | GET | `/agents/:id` | 获取Agent详细信息 |
| 更新Agent | PUT | `/agents/:id` | 更新Agent信息 |
| 删除Agent | DELETE | `/agents/:id` | 删除Agent |
| 创建会话 | POST | `/agents/:id/sessions` | 创建聊天会话 |
| 获取会话列表 | GET | `/agents/:id/sessions` | 获取Agent的会话列表 |
| 获取会话详情 | GET | `/agents/sessions/:sessionId` | 获取会话详情 |
| 删除会话 | DELETE | `/agents/sessions/:sessionId` | 删除会话 |
| 获取会话消息 | GET | `/agents/sessions/:sessionId/messages` | 获取会话消息 |
| 发送消息 | POST | `/agents/sessions/:sessionId/messages` | 发送消息给Agent |
| 流式消息 | SSE | `/agents/sessions/:sessionId/stream` | 流式接收Agent响应 |
| 获取Agent工具 | GET | `/agents/:id/tools` | 获取Agent的工具列表 |
| 添加工具 | POST | `/agents/:id/tools` | 为Agent添加工具 |
| 获取Agent技能 | GET | `/agents/:id/skills` | 获取Agent的技能列表 |
| 添加技能 | POST | `/agents/:id/skills` | 为Agent添加技能 |
| 获取可用工具 | GET | `/agents/tools/available` | 获取所有可用工具 |
| 获取可用技能 | GET | `/agents/skills/available` | 获取所有可用技能 |
| 启动Agent | POST | `/agents/:id/start` | 启动Agent运行时 |
| 停止Agent | POST | `/agents/:id/stop` | 停止Agent运行时 |
| 重置Agent | POST | `/agents/:id/reset` | 重置Agent状态 |

---

## 创建Agent

创建一个新的AI代理。

```http
POST /api/v1/agents
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 请求体

```json
{
  "name": "智能助手",
  "description": "一个友好的智能助手，帮助用户解决各种问题",
  "avatar": "https://example.com/avatar.jpg",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "你是一个友好的智能助手，请用专业、耐心的语气回答用户的问题。",
    "apiKey": "sk-xxx",
    "apiEndpoint": "https://api.openai.com/v1"
  },
  "isPublic": false
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | Agent名称 |
| description | string | 是 | Agent描述 |
| avatar | string | 否 | Agent头像URL |
| type | string | 是 | Agent类型：chatgpt, claude, custom |
| config | object | 是 | Agent配置 |
| isPublic | boolean | 否 | 是否公开，默认false |

### 响应示例

```json
{
  "id": "agent-uuid",
  "name": "智能助手",
  "description": "一个友好的智能助手",
  "avatar": "https://example.com/avatar.jpg",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "你是一个友好的智能助手..."
  },
  "isPublic": false,
  "status": "idle",
  "createdBy": "user-001",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## 获取Agent列表

获取用户的所有Agent列表。

```http
GET /api/v1/agents?public=false
Authorization: Bearer &lt;access-token&gt;
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| public | boolean | 否 | 是否获取公开Agent |

### 响应示例

```json
[
  {
    "id": "agent-001",
    "name": "智能助手",
    "description": "一个友好的智能助手",
    "avatar": "https://example.com/avatar1.jpg",
    "type": "chatgpt",
    "isPublic": false,
    "status": "idle",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "agent-002",
    "name": "代码助手",
    "description": "帮助用户编写和调试代码",
    "avatar": "https://example.com/avatar2.jpg",
    "type": "claude",
    "isPublic": true,
    "status": "ready",
    "createdAt": "2024-01-14T15:00:00Z"
  }
]
```

---

## 获取Agent详情

根据ID获取Agent详细信息。

```http
GET /api/v1/agents/:id
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 响应示例

```json
{
  "id": "agent-uuid",
  "name": "智能助手",
  "description": "一个友好的智能助手",
  "avatar": "https://example.com/avatar.jpg",
  "type": "chatgpt",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "你是一个友好的智能助手..."
  },
  "isPublic": false,
  "status": "idle",
  "createdBy": "user-001",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: Agent不存在

---

## 更新Agent

更新Agent信息。

```http
PUT /api/v1/agents/:id
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 请求体

```json
{
  "name": "智能助手Pro",
  "description": "一个更强大的智能助手",
  "config": {
    "model": "gpt-4-turbo",
    "temperature": 0.5
  },
  "isPublic": true,
  "status": "ready"
}
```

### 响应示例

```json
{
  "id": "agent-uuid",
  "name": "智能助手Pro",
  "description": "一个更强大的智能助手",
  "config": {
    "model": "gpt-4-turbo",
    "temperature": 0.5
  },
  "isPublic": true,
  "status": "ready",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

## 删除Agent

删除指定的Agent。

```http
DELETE /api/v1/agents/:id
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 响应示例

```json
{
  "success": true
}
```

---

## 创建会话

为Agent创建一个新的聊天会话。

```http
POST /api/v1/agents/:id/sessions
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 请求体

```json
{
  "title": "新对话"
}
```

### 响应示例

```json
{
  "id": "session-uuid",
  "agentId": "agent-uuid",
  "userId": "user-001",
  "title": "新对话",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## 获取会话列表

获取Agent的所有会话列表。

```http
GET /api/v1/agents/:id/sessions?limit=20
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | number | 否 | 20 | 返回数量限制 |

### 响应示例

```json
[
  {
    "id": "session-001",
    "agentId": "agent-uuid",
    "userId": "user-001",
    "title": "关于编程的问题",
    "messageCount": 15,
    "lastMessageAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

---

## 获取会话详情

根据ID获取会话详情。

```http
GET /api/v1/agents/sessions/:sessionId
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |

### 响应示例

```json
{
  "id": "session-uuid",
  "agentId": "agent-uuid",
  "userId": "user-001",
  "title": "关于编程的问题",
  "messageCount": 15,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## 删除会话

删除指定的会话。

```http
DELETE /api/v1/agents/sessions/:sessionId
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |

### 响应示例

```json
{
  "success": true
}
```

---

## 获取会话消息

获取会话的所有消息。

```http
GET /api/v1/agents/sessions/:sessionId/messages?limit=50&amp;offset=0
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | number | 否 | 50 | 返回数量限制，最大200 |
| offset | number | 否 | 0 | 偏移量 |

### 响应示例

```json
[
  {
    "id": "msg-001",
    "role": "user",
    "content": "你好，帮我写一个排序算法",
    "timestamp": "2024-01-15T10:00:00Z"
  },
  {
    "id": "msg-002",
    "role": "assistant",
    "content": "好的，我来帮你实现一个快速排序算法...",
    "timestamp": "2024-01-15T10:00:05Z",
    "metadata": {
      "model": "gpt-4",
      "usage": {
        "promptTokens": 50,
        "completionTokens": 200,
        "totalTokens": 250
      }
    }
  }
]
```

---

## 发送消息

发送消息给Agent。

```http
POST /api/v1/agents/sessions/:sessionId/messages
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |

### 请求体

```json
{
  "content": "你好，帮我解释一下什么是快速排序算法"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 消息内容 |

### 响应示例

```json
{
  "id": "msg-uuid",
  "role": "assistant",
  "content": "快速排序（Quicksort）是一种高效的排序算法...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## 流式消息

使用Server-Sent Events (SSE) 流式接收Agent的响应。

```http
POST /api/v1/agents/sessions/:sessionId/stream
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |

### 请求体

```json
{
  "content": "写一个Python的快速排序"
}
```

### 响应流格式

```
data: {"id":"msg-1","content":"快速","done":false}
data: {"id":"msg-1","content":"排序是","done":false}
data: {"id":"msg-1","content":"一种高效","done":false}
...
data: {"id":"msg-1","content":"。","done":true}
```

---

## 获取Agent工具

获取Agent已添加的工具列表。

```http
GET /api/v1/agents/:id/tools
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 响应示例

```json
[
  {
    "id": "tool-001",
    "name": "web_search",
    "description": "网络搜索",
    "enabled": true,
    "addedAt": "2024-01-15T10:00:00Z"
  }
]
```

---

## 添加工具

为Agent添加工具。

```http
POST /api/v1/agents/:id/tools
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 请求体

```json
{
  "toolId": "web_search"
}
```

### 响应示例

```json
{
  "success": true
}
```

---

## 获取Agent技能

获取Agent已添加的技能列表。

```http
GET /api/v1/agents/:id/skills
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 响应示例

```json
[
  {
    "id": "skill-001",
    "name": "code_writing",
    "description": "代码编写",
    "enabled": true,
    "addedAt": "2024-01-15T10:00:00Z"
  }
]
```

---

## 添加技能

为Agent添加技能。

```http
POST /api/v1/agents/:id/skills
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 请求体

```json
{
  "skillId": "code_writing"
}
```

### 响应示例

```json
{
  "success": true
}
```

---

## 获取可用工具

获取所有可用的工具列表。

```http
GET /api/v1/agents/tools/available
Authorization: Bearer &lt;access-token&gt;
```

### 响应示例

```json
[
  {
    "id": "web_search",
    "name": "网络搜索",
    "description": "在网络上搜索信息",
    "category": "search"
  },
  {
    "id": "calculator",
    "name": "计算器",
    "description": "执行数学计算",
    "category": "utility"
  },
  {
    "id": "code_executor",
    "name": "代码执行",
    "description": "执行代码片段",
    "category": "code"
  }
]
```

---

## 获取可用技能

获取所有可用的技能列表。

```http
GET /api/v1/agents/skills/available
Authorization: Bearer &lt;access-token&gt;
```

### 响应示例

```json
[
  {
    "id": "code_writing",
    "name": "代码编写",
    "description": "专业的代码编写和调试",
    "category": "coding"
  },
  {
    "id": "creative_writing",
    "name": "创意写作",
    "description": "创意内容创作",
    "category": "writing"
  },
  {
    "id": "data_analysis",
    "name": "数据分析",
    "description": "数据分析和可视化",
    "category": "analysis"
  }
]
```

---

## 启动Agent

启动Agent的运行时。

```http
POST /api/v1/agents/:id/start
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 响应示例

```json
{
  "runtimeId": "runtime-uuid",
  "status": "started"
}
```

---

## 停止Agent

停止Agent的运行时。

```http
POST /api/v1/agents/:id/stop
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 响应示例

```json
{
  "status": "stopped"
}
```

---

## 重置Agent

重置Agent状态。

```http
POST /api/v1/agents/:id/reset
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | Agent ID |

### 响应示例

```json
{
  "status": "reset"
}
```

---

## Agent状态

| 状态 | 说明 |
|------|------|
| idle | 空闲 |
| starting | 启动中 |
| ready | 就绪 |
| busy | 忙碌 |
| stopping | 停止中 |
| error | 错误 |

---

## Agent类型

| 类型 | 说明 |
|------|------|
| chatgpt | OpenAI ChatGPT |
| claude | Anthropic Claude |
| custom | 自定义模型 |

---

## 数据类型

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  type: 'chatgpt' | 'claude' | 'custom';
  config: any;
  isPublic: boolean;
  status: AgentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AgentSession {
  id: string;
  agentId: string;
  userId: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}
```

---

## 相关链接

- [AI 机器人 API](./ai-bots.md)
- [消息管理 API](./messages.md)
