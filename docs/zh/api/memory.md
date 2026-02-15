
# 记忆管理 API

记忆管理 API 提供 Agent 记忆的存储、搜索、知识文档管理等功能。

## 概述

所有记忆管理 API 都需要 JWT 认证，路径前缀为 `/api/v1/agents/:agentId/memory`。

---

## 接口列表

### 记忆管理接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取记忆列表 | GET | `/` | 获取 Agent 的记忆列表 |
| 搜索记忆 | GET | `/search` | 混合搜索记忆 |
| 语义搜索 | GET | `/semantic-search` | 向量语义搜索记忆 |
| 获取记忆统计 | GET | `/stats` | 获取记忆统计信息 |
| 存储记忆 | POST | `/` | 存储新记忆 |
| 删除记忆 | DELETE | `/:memoryId` | 删除指定记忆 |
| 整合记忆 | POST | `/consolidate` | 整合和压缩记忆 |

### 会话记忆接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取会话历史 | GET | `/sessions/:sessionId/history` | 获取会话历史 |
| 总结会话 | POST | `/sessions/:sessionId/summarize` | 总结会话内容 |
| 清空会话记忆 | DELETE | `/sessions/:sessionId` | 清空会话记忆 |

### 知识文档接口

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取知识文档 | GET | `/knowledge` | 获取知识文档列表 |
| 添加知识文档 | POST | `/knowledge` | 添加知识文档 |
| 搜索知识 | GET | `/knowledge/search` | 搜索知识文档 |
| 获取知识统计 | GET | `/knowledge/stats` | 获取知识统计 |
| 获取文档详情 | GET | `/knowledge/:documentId` | 获取知识文档详情 |
| 删除知识文档 | DELETE | `/knowledge/:documentId` | 删除知识文档 |
| 获取文档片段 | GET | `/knowledge/:documentId/chunks` | 获取文档片段 |

---

## 数据结构

### MemoryType - 记忆类型

| 值 | 说明 |
|----|------|
| `EPISODIC` | 情景记忆（对话、事件） |
| `SEMANTIC` | 语义记忆（事实、知识） |
| `PROCEDURAL` | 程序记忆（技能、流程） |

### MemorySource - 记忆来源

| 值 | 说明 |
|----|------|
| `USER` | 用户输入 |
| `SYSTEM` | 系统生成 |
| `OBSERVATION` | 观察到的信息 |

### KnowledgeDocumentStatus - 知识文档状态

| 值 | 说明 |
|----|------|
| `PENDING` | 等待处理 |
| `INDEXING` | 索引中 |
| `READY` | 已就绪 |
| `FAILED` | 失败 |

---

## 记忆管理接口

### 获取记忆列表

获取 Agent 的记忆列表，支持按类型、来源、会话筛选。

**请求：**

```http
GET /api/v1/agents/:agentId/memory?type=EPISODIC&amp;source=USER&amp;limit=20&amp;offset=0
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | string | 否 | - | 记忆类型：EPISODIC, SEMANTIC, PROCEDURAL |
| source | string | 否 | - | 记忆来源：USER, SYSTEM, OBSERVATION |
| sessionId | string | 否 | - | 会话ID筛选 |
| limit | number | 否 | 20 | 返回数量限制，最大100 |
| offset | number | 否 | 0 | 偏移量 |

**响应示例：**

```json
[
  {
    "id": "memory-001",
    "agentId": "agent-uuid",
    "userId": "user-001",
    "type": "EPISODIC",
    "content": "用户询问了关于Python编程的问题",
    "source": "USER",
    "sessionId": "session-uuid",
    "relevance": 0.95,
    "embeddingId": "embedding-uuid",
    "timestamp": "2024-01-15T10:00:00Z",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

---

### 搜索记忆

混合搜索记忆（结合关键词和语义搜索）。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/search?q=Python编程&amp;type=EPISODIC&amp;limit=10&amp;threshold=0.7
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| q | string | 是 | - | 搜索关键词 |
| type | string | 否 | - | 记忆类型筛选 |
| limit | number | 否 | 10 | 返回数量限制，最大100 |
| threshold | number | 否 | 0.7 | 相似度阈值 |

**响应示例：**

```json
[
  {
    "id": "memory-001",
    "content": "用户询问了关于Python编程的问题",
    "type": "EPISODIC",
    "relevance": 0.98,
    "timestamp": "2024-01-15T10:00:00Z"
  }
]
```

---

### 语义搜索

使用向量语义搜索记忆。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/semantic-search?q=Python编程&amp;limit=10
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| q | string | 是 | - | 搜索查询 |
| limit | number | 否 | 10 | 返回数量限制，最大100 |

**响应示例：**

```json
[
  {
    "id": "memory-001",
    "content": "用户询问了关于Python编程的问题",
    "type": "EPISODIC",
    "similarity": 0.98,
    "timestamp": "2024-01-15T10:00:00Z"
  }
]
```

---

### 获取记忆统计

获取 Agent 的记忆统计信息。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/stats
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**响应示例：**

```json
{
  "agentId": "agent-uuid",
  "totalMemories": 1250,
  "byType": {
    "EPISODIC": 800,
    "SEMANTIC": 300,
    "PROCEDURAL": 150
  },
  "bySource": {
    "USER": 600,
    "SYSTEM": 400,
    "OBSERVATION": 250
  },
  "last24hMemories": 42,
  "totalChunks": 12500,
  "embeddingModel": "text-embedding-ada-002",
  "knowledgeDocuments": 15,
  "storageBytes": 1048576
}
```

---

### 存储记忆

存储一条新记忆。

**请求：**

```http
POST /api/v1/agents/:agentId/memory
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json

{
  "content": "用户喜欢编程技术，特别是Python和JavaScript",
  "type": "EPISODIC",
  "source": "USER",
  "sessionId": "session-uuid",
  "metadata": {
    "category": "user-preference"
  }
}
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 记忆内容 |
| type | string | 否 | 记忆类型：EPISODIC, SEMANTIC, PROCEDURAL，默认 EPISODIC |
| source | string | 否 | 记忆来源：USER, SYSTEM, OBSERVATION，默认 USER |
| sessionId | string | 否 | 会话ID |
| metadata | object | 否 | 元数据 |

**响应示例：**

```json
{
  "id": "memory-uuid",
  "agentId": "agent-uuid",
  "content": "用户喜欢编程技术",
  "type": "EPISODIC",
  "source": "USER",
  "relevance": 1.0,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 删除记忆

删除指定记忆。

**请求：**

```http
DELETE /api/v1/agents/:agentId/memory/:memoryId
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |
| memoryId | string | 是 | 记忆ID |

**响应示例：**

```json
{
  "success": true
}
```

**错误响应：**

- 404: 记忆不存在

---

### 整合记忆

整合和压缩 Agent 的记忆。

**请求：**

```http
POST /api/v1/agents/:agentId/memory/consolidate
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**响应示例：**

```json
{
  "agentId": "agent-uuid",
  "beforeCount": 1250,
  "afterCount": 1000,
  "consolidatedCount": 250,
  "newSemanticMemories": 42,
  "status": "completed"
}
```

---

## 会话记忆接口

### 获取会话历史

获取指定会话的历史记忆。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/sessions/:sessionId/history?maxTokens=8000
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |
| sessionId | string | 是 | 会话ID |

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| maxTokens | number | 否 | 8000 | 最大Token数，最大32000 |

**响应示例：**

```json
[
  {
    "role": "user",
    "content": "你好，帮我写一个Python函数",
    "timestamp": "2024-01-15T10:00:00Z"
  },
  {
    "role": "assistant",
    "content": "好的，我来帮你...",
    "timestamp": "2024-01-15T10:00:05Z"
  }
]
```

---

### 总结会话

总结指定会话的内容。

**请求：**

```http
POST /api/v1/agents/:agentId/memory/sessions/:sessionId/summarize
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |
| sessionId | string | 是 | 会话ID |

**响应示例：**

```json
{
  "sessionId": "session-uuid",
  "summary": "本次对话主要讨论了Python编程问题，包括快速排序算法的实现和优化。",
  "keyPoints": [
    "实现了快速排序算法",
    "讨论了算法优化",
    "提供了代码示例"
  ],
  "topics": ["Python", "算法", "快速排序"],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 清空会话记忆

清空指定会话的所有记忆。

**请求：**

```http
DELETE /api/v1/agents/:agentId/memory/sessions/:sessionId
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |
| sessionId | string | 是 | 会话ID |

**响应示例：**

```json
{
  "success": true,
  "clearedCount": 42
}
```

---

## 知识文档接口

### 获取知识文档

获取 Agent 的知识文档列表。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/knowledge
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**响应示例：**

```json
[
  {
    "id": "doc-uuid",
    "agentId": "agent-uuid",
    "title": "公司制度文档",
    "description": "公司内部管理制度文档",
    "sourcePath": "/docs/company-policy.pdf",
    "sourceType": "file",
    "chunkCount": 15,
    "status": "READY",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

---

### 添加知识文档

添加新的知识文档。

**请求：**

```http
POST /api/v1/agents/:agentId/memory/knowledge
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json

{
  "title": "公司制度文档",
  "description": "公司内部管理制度",
  "content": "公司的核心价值观：诚信、创新、协作...",
  "sourcePath": "/docs/company-policy.pdf",
  "sourceType": "file",
  "metadata": {
    "version": "1.0",
    "author": "HR"
  }
}
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 文档标题 |
| description | string | 否 | 文档描述 |
| content | string | 是 | 文档内容 |
| sourcePath | string | 否 | 源文件路径 |
| sourceType | string | 否 | 源文件类型：file, url, text |
| metadata | object | 否 | 元数据 |

**响应示例：**

```json
{
  "id": "doc-uuid",
  "agentId": "agent-uuid",
  "title": "公司制度文档",
  "content": "公司的核心价值观：诚信、创新、协作...",
  "status": "INDEXING",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 搜索知识

搜索知识文档。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/knowledge/search?q=请假&amp;limit=5&amp;threshold=0.7
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| q | string | 是 | - | 搜索查询 |
| limit | number | 否 | 5 | 返回数量限制，最大20 |
| threshold | number | 否 | 0.7 | 相似度阈值 |

**响应示例：**

```json
[
  {
    "id": "chunk-uuid",
    "documentId": "doc-uuid",
    "documentTitle": "公司制度文档",
    "content": "员工请假需要提前三天申请...",
    "similarity": 0.95,
    "chunkIndex": 5
  }
]
```

---

### 获取知识统计

获取 Agent 的知识文档统计信息。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/knowledge/stats
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |

**响应示例：**

```json
{
  "agentId": "agent-uuid",
  "totalDocuments": 15,
  "totalChunks": 250,
  "bySourceType": {
    "file": 10,
    "url": 3,
    "text": 2
  },
  "indexingDocuments": 12,
  "indexingChunks": 200,
  "failedDocuments": 3,
  "storageBytes": 5242880
}
```

---

### 获取知识文档详情

获取知识文档详情。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/knowledge/:documentId
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |
| documentId | string | 是 | 文档ID |

**响应示例：**

```json
{
  "id": "doc-uuid",
  "agentId": "agent-uuid",
  "title": "公司制度文档",
  "description": "公司内部管理制度",
  "content": "公司的核心价值观：诚信、创新、协作...",
  "sourcePath": "/docs/company-policy.pdf",
  "sourceType": "file",
  "chunkCount": 15,
  "status": "READY",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**错误响应：**

- 404: 文档不存在

---

### 删除知识文档

删除知识文档。

**请求：**

```http
DELETE /api/v1/agents/:agentId/memory/knowledge/:documentId
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |
| documentId | string | 是 | 文档ID |

**响应示例：**

```json
{
  "success": true
}
```

**错误响应：**

- 404: 文档不存在

---

### 获取文档片段

获取知识文档的片段。

**请求：**

```http
GET /api/v1/agents/:agentId/memory/knowledge/:documentId/chunks
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agentId | string | 是 | Agent ID |
| documentId | string | 是 | 文档ID |

**响应示例：**

```json
[
  {
    "id": "chunk-uuid",
    "documentId": "doc-uuid",
    "index": 0,
    "content": "第一章 公司简介...",
    "embeddingId": "embedding-uuid"
  }
]
```

**错误响应：**

- 404: 文档不存在

---

## 数据类型定义

```typescript
interface Memory {
  id: string;
  agentId: string;
  userId?: string;
  content: string;
  type: MemoryType;
  source: MemorySource;
  sessionId?: string;
  relevance?: number;
  embeddingId?: string;
  timestamp: Date;
  metadata?: any;
  createdAt: Date;
}

interface KnowledgeDocument {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  content: string;
  sourcePath?: string;
  sourceType?: string;
  chunkCount: number;
  status: KnowledgeDocumentStatus;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentChunk {
  id: string;
  documentId: string;
  index: number;
  content: string;
  embeddingId?: string;
}
```

---

## 相关链接

- [AI Agent API](./agents.md)
- [AI 机器人 API](./ai-bots.md)

