# 消息搜索 API

消息搜索 API 提供消息的全文搜索、高级搜索等功能。

## 概述

所有消息搜索 API 都需要 JWT 认证，路径前缀为 `/api/v1/message-search`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 搜索消息 | GET | `/message-search` | 搜索消息 |
| 搜索用户消息 | GET | `/message-search/user/:userId` | 搜索与指定用户的消息 |
| 搜索群组消息 | GET | `/message-search/group/:groupId` | 搜索群组消息 |
| 高级搜索 | POST | `/message-search/advanced` | 高级搜索消息 |
| 按类型搜索 | GET | `/message-search/type/:type` | 按消息类型搜索 |
| 搜索图片消息 | GET | `/message-search/images` | 搜索图片消息 |
| 搜索文件消息 | GET | `/message-search/files` | 搜索文件消息 |
| 搜索链接消息 | GET | `/message-search/links` | 搜索链接消息 |
| 获取搜索建议 | GET | `/message-search/suggestions` | 获取搜索建议 |
| 获取搜索历史 | GET | `/message-search/history` | 获取搜索历史 |
| 清除搜索历史 | DELETE | `/message-search/history` | 清除搜索历史 |

---

## 搜索消息

全文搜索消息内容。

```http
GET /api/v1/message-search?keyword=你好&userId=user-001&limit=20&offset=0
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 是 | - | 搜索关键词 |
| userId | string | 是 | - | 用户ID |
| type | string | 否 | - | 消息类型筛选 |
| startTime | string | 否 | - | 开始时间 |
| endTime | string | 否 | - | 结束时间 |
| limit | number | 否 | 20 | 返回数量限制 |
| offset | number | 否 | 0 | 偏移量 |

### 响应示例

```json
{
  "total": 15,
  "results": [
    {
      "id": "msg-001",
      "type": "text",
      "content": {
        "text": {
          "text": "你好，很高兴认识你！"
        }
      },
      "fromUserId": "user-002",
      "toUserId": "user-001",
      "conversationId": "conv-001",
      "targetName": "张三",
      "targetAvatar": "https://example.com/avatar.jpg",
      "highlight": "你好，很高兴认识你！",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "msg-002",
      "type": "text",
      "content": {
        "text": {
          "text": "你好，最近怎么样？"
        }
      },
      "fromUserId": "user-001",
      "toUserId": "user-002",
      "conversationId": "conv-001",
      "targetName": "张三",
      "targetAvatar": "https://example.com/avatar.jpg",
      "highlight": "你好，最近怎么样？",
      "createdAt": "2024-01-14T15:20:00Z"
    }
  ]
}
```

---

## 搜索用户消息

搜索与指定用户的消息记录。

```http
GET /api/v1/message-search/user/:userId?keyword=项目&targetUserId=user-002&limit=20
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 当前用户ID |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| targetUserId | string | 是 | 目标用户ID |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| limit | number | 否 | 返回数量限制 |
| offset | number | 否 | 偏移量 |

### 响应示例

```json
{
  "total": 8,
  "targetUser": {
    "id": "user-002",
    "nickname": "张三",
    "avatar": "https://example.com/avatar.jpg"
  },
  "results": [
    {
      "id": "msg-001",
      "type": "text",
      "content": {
        "text": {
          "text": "项目进度怎么样了？"
        }
      },
      "fromUserId": "user-002",
      "toUserId": "user-001",
      "highlight": "项目进度怎么样了？",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 搜索群组消息

搜索群组内的消息记录。

```http
GET /api/v1/message-search/group/:groupId?keyword=会议&userId=user-001&limit=20
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组ID |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| userId | string | 是 | 当前用户ID |
| fromUserId | string | 否 | 发送者ID筛选 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| limit | number | 否 | 返回数量限制 |
| offset | number | 否 | 偏移量 |

### 响应示例

```json
{
  "total": 12,
  "group": {
    "id": "group-001",
    "name": "技术交流群",
    "avatar": "https://example.com/group-avatar.jpg"
  },
  "results": [
    {
      "id": "msg-001",
      "type": "text",
      "content": {
        "text": {
          "text": "明天下午3点有会议"
        }
      },
      "fromUserId": "user-003",
      "fromUserName": "李四",
      "fromUserAvatar": "https://example.com/avatar2.jpg",
      "highlight": "明天下午3点有会议",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 高级搜索

使用复杂条件进行高级搜索。

```http
POST /api/v1/message-search/advanced
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "userId": "user-001",
  "keyword": "项目",
  "filters": {
    "types": ["text", "file", "document"],
    "conversationIds": ["conv-001", "conv-002"],
    "fromUserIds": ["user-002", "user-003"],
    "timeRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "hasAttachment": true
  },
  "sort": {
    "field": "createdAt",
    "order": "desc"
  },
  "pagination": {
    "limit": 20,
    "offset": 0
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| keyword | string | 否 | 搜索关键词 |
| filters | object | 否 | 筛选条件 |
| filters.types | string[] | 否 | 消息类型列表 |
| filters.conversationIds | string[] | 否 | 会话ID列表 |
| filters.fromUserIds | string[] | 否 | 发送者ID列表 |
| filters.timeRange | object | 否 | 时间范围 |
| filters.hasAttachment | boolean | 否 | 是否有附件 |
| sort | object | 否 | 排序条件 |
| pagination | object | 否 | 分页条件 |

### 响应示例

```json
{
  "total": 25,
  "results": [
    {
      "id": "msg-001",
      "type": "file",
      "content": {
        "file": {
          "name": "项目需求文档.pdf",
          "url": "https://example.com/file.pdf"
        }
      },
      "fromUserId": "user-002",
      "conversationId": "conv-001",
      "targetName": "张三",
      "highlight": "项目需求文档.pdf",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 按类型搜索

按消息类型搜索消息。

```http
GET /api/v1/message-search/type/:type?userId=user-001&keyword=报告&limit=20
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 消息类型：text, image, video, audio, file, document, code, location, card |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| keyword | string | 否 | 搜索关键词 |
| limit | number | 否 | 返回数量限制 |
| offset | number | 否 | 偏移量 |

### 响应示例

```json
{
  "total": 5,
  "type": "file",
  "results": [
    {
      "id": "msg-001",
      "type": "file",
      "content": {
        "file": {
          "name": "季度报告.pdf",
          "url": "https://example.com/report.pdf",
          "size": 1048576
        }
      },
      "fromUserId": "user-002",
      "conversationId": "conv-001",
      "targetName": "张三",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 搜索图片消息

搜索图片类型的消息。

```http
GET /api/v1/message-search/images?userId=user-001&limit=20
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| conversationId | string | 否 | 会话ID筛选 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| limit | number | 否 | 返回数量限制 |
| offset | number | 否 | 偏移量 |

### 响应示例

```json
{
  "total": 30,
  "results": [
    {
      "id": "msg-001",
      "type": "image",
      "content": {
        "image": {
          "url": "https://example.com/image1.jpg",
          "thumbnailUrl": "https://example.com/thumb1.jpg",
          "width": 1920,
          "height": 1080
        }
      },
      "fromUserId": "user-002",
      "conversationId": "conv-001",
      "targetName": "张三",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 搜索文件消息

搜索文件类型的消息。

```http
GET /api/v1/message-search/files?userId=user-001&extension=pdf&limit=20
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| keyword | string | 否 | 文件名关键词 |
| extension | string | 否 | 文件扩展名筛选 |
| conversationId | string | 否 | 会话ID筛选 |
| limit | number | 否 | 返回数量限制 |
| offset | number | 否 | 偏移量 |

### 响应示例

```json
{
  "total": 15,
  "results": [
    {
      "id": "msg-001",
      "type": "file",
      "content": {
        "file": {
          "name": "项目文档.pdf",
          "url": "https://example.com/doc.pdf",
          "size": 2097152,
          "mimeType": "application/pdf"
        }
      },
      "fromUserId": "user-002",
      "conversationId": "conv-001",
      "targetName": "张三",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 搜索链接消息

搜索包含链接的消息。

```http
GET /api/v1/message-search/links?userId=user-001&domain=github.com&limit=20
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| keyword | string | 否 | 链接标题关键词 |
| domain | string | 否 | 域名筛选 |
| limit | number | 否 | 返回数量限制 |
| offset | number | 否 | 偏移量 |

### 响应示例

```json
{
  "total": 8,
  "results": [
    {
      "id": "msg-001",
      "type": "card",
      "content": {
        "cardResource": {
          "cardType": "LINK",
          "title": "OpenChat GitHub Repository",
          "url": "https://github.com/openchat/openchat",
          "thumbnailUrl": "https://github.com/og-image.png"
        }
      },
      "fromUserId": "user-002",
      "conversationId": "conv-001",
      "targetName": "张三",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 获取搜索建议

获取搜索关键词建议。

```http
GET /api/v1/message-search/suggestions?userId=user-001&prefix=项
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| prefix | string | 是 | 搜索前缀 |
| limit | number | 否 | 返回数量限制，默认10 |

### 响应示例

```json
{
  "suggestions": [
    {
      "text": "项目",
      "count": 25
    },
    {
      "text": "项目进度",
      "count": 12
    },
    {
      "text": "项目文档",
      "count": 8
    }
  ]
}
```

---

## 获取搜索历史

获取用户的搜索历史记录。

```http
GET /api/v1/message-search/history?userId=user-001&limit=20
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| limit | number | 否 | 返回数量限制 |

### 响应示例

```json
{
  "history": [
    {
      "id": "history-001",
      "keyword": "项目文档",
      "resultCount": 15,
      "searchedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "history-002",
      "keyword": "会议",
      "resultCount": 8,
      "searchedAt": "2024-01-14T15:20:00Z"
    }
  ]
}
```

---

## 清除搜索历史

清除用户的搜索历史记录。

```http
DELETE /api/v1/message-search/history?userId=user-001
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |

### 响应示例

```json
{
  "success": true,
  "deletedCount": 25
}
```

---

## 数据类型

```typescript
interface MessageSearchResult {
  id: string;                    // 消息ID
  type: string;                  // 消息类型
  content: any;                  // 消息内容
  fromUserId: string;            // 发送者ID
  fromUserName?: string;         // 发送者名称
  fromUserAvatar?: string;       // 发送者头像
  toUserId?: string;             // 接收者ID
  groupId?: string;              // 群组ID
  conversationId: string;        // 会话ID
  targetName: string;            // 目标名称
  targetAvatar?: string;         // 目标头像
  highlight: string;             // 高亮文本
  createdAt: Date;               // 创建时间
}

interface AdvancedSearchRequest {
  userId: string;                // 用户ID
  keyword?: string;              // 搜索关键词
  filters?: {
    types?: string[];            // 消息类型列表
    conversationIds?: string[];  // 会话ID列表
    fromUserIds?: string[];      // 发送者ID列表
    timeRange?: {                // 时间范围
      start: string;
      end: string;
    };
    hasAttachment?: boolean;     // 是否有附件
  };
  sort?: {                       // 排序条件
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: {                 // 分页条件
    limit: number;
    offset: number;
  };
}

interface SearchSuggestion {
  text: string;                  // 建议文本
  count: number;                 // 匹配数量
}

interface SearchHistory {
  id: string;                    // 历史记录ID
  keyword: string;               // 搜索关键词
  resultCount: number;           // 结果数量
  searchedAt: Date;              // 搜索时间
}
```

---

## 相关链接

- [消息管理 API](./messages.md)
- [会话管理 API](./conversations.md)
