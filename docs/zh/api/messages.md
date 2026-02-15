# 消息管理 API

消息管理 API 提供消息的发送、查询、撤回、转发等功能。

## 概述

所有消息管理 API 都需要 JWT 认证，路径前缀为 `/api/v1/messages`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 发送消息 | POST | `/messages` | 发送单条消息 |
| 批量发送消息 | POST | `/messages/batch` | 批量发送消息 |
| 获取消息详情 | GET | `/messages/:id` | 获取单条消息详情 |
| 获取用户消息列表 | GET | `/messages/user/:userId` | 获取与指定用户的消息列表 |
| 获取群组消息列表 | GET | `/messages/group/:groupId` | 获取指定群组的消息历史 |
| 更新消息状态 | PUT | `/messages/:id/status` | 更新消息状态 |
| 删除消息 | DELETE | `/messages/:id` | 删除消息 |
| 标记消息已读 | POST | `/messages/:userId/read` | 标记消息为已读 |
| 撤回消息 | POST | `/messages/:id/recall` | 撤回已发送的消息 |
| 转发消息 | POST | `/messages/:id/forward` | 转发消息给用户或群组 |
| 重试发送失败消息 | POST | `/messages/:id/retry` | 重试发送失败的消息 |

---

## 发送消息

发送消息给指定用户或群组。

```http
POST /api/v1/messages
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| uuid | string | 否 | 消息UUID，客户端生成，用于去重 |
| type | string | 是 | 消息类型，见[消息类型](#消息类型) |
| content | object | 是 | 消息内容，根据type不同结构不同 |
| fromUserId | string | 是 | 发送者用户ID |
| toUserId | string | 条件必填 | 接收者用户ID（单聊时必填） |
| groupId | string | 条件必填 | 群组ID（群聊时必填） |
| replyToId | string | 否 | 回复的消息ID |
| forwardFromId | string | 否 | 转发来源消息ID |
| clientSeq | number | 否 | 客户端序列号，用于消息去重 |
| extra | object | 否 | 扩展数据 |
| needReadReceipt | boolean | 否 | 是否需要已读回执，默认true |

### 响应示例

```json
{
  "success": true,
  "message": {
    "id": "msg-uuid",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "type": "text",
    "content": {
      "text": {
        "text": "Hello, OpenChat!",
        "mentions": ["user1", "user2"]
      }
    },
    "fromUserId": "sender-uuid",
    "toUserId": "receiver-uuid",
    "status": "sent",
    "clientSeq": 12345,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 请求示例 - 所有消息类型

#### 文本消息（单聊）

```json
{
  "type": "text",
  "content": {
    "text": {
      "text": "你好，这是一条测试消息！",
      "mentions": []
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 文本消息（群聊带@提及）

```json
{
  "type": "text",
  "content": {
    "text": {
      "text": "@张三 @李四 请查看这个重要通知",
      "mentions": ["user-zhangsan", "user-lisi"]
    }
  },
  "fromUserId": "user-001",
  "groupId": "group-001"
}
```

#### 图片消息

```json
{
  "type": "image",
  "content": {
    "image": {
      "url": "https://cdn.example.com/images/photo-20240115.jpg",
      "format": "JPEG",
      "width": 1920,
      "height": 1080,
      "size": 524288,
      "mimeType": "image/jpeg",
      "thumbnailUrl": "https://cdn.example.com/images/photo-20240115-thumb.jpg"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### AI生成图片消息

```json
{
  "type": "image",
  "content": {
    "image": {
      "url": "https://cdn.example.com/ai-images/generated-001.png",
      "format": "PNG",
      "width": 1024,
      "height": 1024,
      "size": 2097152,
      "prompt": "一只可爱的橙色小猫，坐在窗台上看着窗外的雨景，动漫风格"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 视频消息

```json
{
  "type": "video",
  "content": {
    "video": {
      "url": "https://cdn.example.com/videos/demo-20240115.mp4",
      "format": "MP4",
      "duration": 125,
      "width": 1920,
      "height": 1080,
      "size": 15728640,
      "mimeType": "video/mp4",
      "thumbnailUrl": "https://cdn.example.com/videos/demo-20240115-thumb.jpg"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### AI生成视频消息

```json
{
  "type": "video",
  "content": {
    "video": {
      "url": "https://cdn.example.com/ai-videos/generated-001.mp4",
      "format": "MP4",
      "duration": 10,
      "width": 1920,
      "height": 1080,
      "size": 15728640,
      "prompt": "夕阳下的海边，海浪轻轻拍打沙滩，海鸥飞翔"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 语音消息

```json
{
  "type": "audio",
  "content": {
    "audio": {
      "url": "https://cdn.example.com/audio/voice-20240115.mp3",
      "format": "MP3",
      "duration": 15,
      "size": 24576,
      "mimeType": "audio/mpeg"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### AI生成语音消息

```json
{
  "type": "audio",
  "content": {
    "audio": {
      "url": "https://cdn.example.com/ai-audio/tts-001.mp3",
      "format": "MP3",
      "duration": 8,
      "size": 32768,
      "prompt": "欢迎使用OpenChat，这是一条AI生成的语音消息。"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 音乐消息

```json
{
  "type": "music",
  "content": {
    "music": {
      "url": "https://music.example.com/songs/song-001.mp3",
      "format": "MP3",
      "title": "夜曲",
      "artist": "周杰伦",
      "album": "十一月的萧邦",
      "genre": "流行",
      "duration": 256,
      "size": 4194304,
      "coverUrl": "https://music.example.com/covers/album-001.jpg"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### AI生成音乐消息

```json
{
  "type": "music",
  "content": {
    "music": {
      "url": "https://cdn.example.com/ai-music/generated-001.mp3",
      "format": "MP3",
      "title": "春日序曲",
      "artist": "AI Composer",
      "duration": 180,
      "size": 4194304,
      "prompt": "一首轻快的春日主题钢琴曲，充满希望和活力"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 文件消息

```json
{
  "type": "file",
  "content": {
    "file": {
      "name": "项目需求文档v2.0.pdf",
      "url": "https://cdn.example.com/files/requirements-v2.pdf",
      "size": 2097152,
      "mimeType": "application/pdf"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 文档消息

```json
{
  "type": "document",
  "content": {
    "document": {
      "url": "https://cdn.example.com/docs/api-design.pdf",
      "format": "PDF",
      "title": "OpenChat API设计文档",
      "author": "OpenChat团队",
      "pageCount": 45,
      "summary": "本文档详细描述了OpenChat的API设计规范..."
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 代码消息

```json
{
  "type": "code",
  "content": {
    "code": {
      "language": "TYPESCRIPT",
      "code": "interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nfunction createUser(data: Partial<User>): User {\n  return {\n    id: data.id || crypto.randomUUID(),\n    name: data.name || 'Anonymous',\n    email: data.email || ''\n  };\n}",
      "lineCount": 11
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 位置消息

```json
{
  "type": "location",
  "content": {
    "location": {
      "latitude": 39.9042,
      "longitude": 116.4074,
      "address": "北京市东城区东华门街道天安门",
      "name": "天安门",
      "thumbnailUrl": "https://maps.example.com/static/39.9042,116.4074.png"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 用户名片消息

```json
{
  "type": "card",
  "content": {
    "card": {
      "userId": "user-zhangsan",
      "nickname": "张三",
      "avatar": "https://cdn.example.com/avatars/zhangsan.jpg",
      "signature": "热爱生活，热爱编程"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 小程序卡片消息

```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "MINI_PROGRAM",
      "title": "OpenChat小程序",
      "description": "一个现代化的即时通讯应用",
      "thumbnailUrl": "https://openchat.com/mini-cover.jpg",
      "sourceName": "微信小程序",
      "appId": "wxabcdef1234567890",
      "appPath": "pages/index/index?id=123",
      "mainAction": {
        "type": "open_mini_program",
        "appId": "wxabcdef1234567890",
        "appPath": "pages/index/index?id=123"
      }
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 链接卡片消息

```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "LINK",
      "title": "OpenChat官方文档",
      "description": "OpenChat是一个开源的即时通讯解决方案...",
      "thumbnailUrl": "https://openchat.com/og-image.png",
      "sourceName": "openchat.com",
      "targetUrl": "https://openchat.com/docs",
      "mainAction": {
        "type": "open_url",
        "url": "https://openchat.com/docs"
      }
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 商品卡片消息

```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "PRODUCT",
      "title": "OpenChat Pro会员",
      "description": "解锁全部高级功能",
      "thumbnailUrl": "https://openchat.com/product.jpg",
      "sourceName": "OpenChat商城",
      "tag": "限时优惠",
      "extraData": {
        "price": 99.00,
        "originalPrice": 199.00,
        "currency": "CNY",
        "productId": "prod-001"
      },
      "buttons": [
        {
          "text": "立即购买",
          "action": { "type": "open_url", "url": "https://openchat.com/buy" },
          "style": "primary",
          "color": "#07C160"
        }
      ]
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 自定义消息

```json
{
  "type": "custom",
  "content": {
    "custom": {
      "customType": "food_order",
      "data": {
        "orderId": "FO20240115001",
        "restaurant": "麦当劳(中关村店)",
        "items": [
          { "name": "巨无霸套餐", "quantity": 1, "price": 38.00 }
        ],
        "totalAmount": 38.00,
        "status": "delivering"
      }
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

#### 回复消息

```json
{
  "type": "text",
  "content": {
    "text": {
      "text": "我同意你的观点，这个方案很好！"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002",
  "replyToId": "msg-original-001"
}
```

#### 带去重的消息发送

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "type": "text",
  "content": {
    "text": {
      "text": "这是一条重要消息"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002",
  "clientSeq": 12345,
  "needReadReceipt": true
}
```

---

## 批量发送消息

一次性发送多条消息。

```http
POST /api/v1/messages/batch
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "messages": [
    {
      "type": "text",
      "content": {
        "text": { "text": "第一条消息" }
      },
      "fromUserId": "sender-uuid",
      "toUserId": "receiver-1-uuid"
    },
    {
      "type": "image",
      "content": {
        "image": {
          "url": "https://example.com/image.jpg",
          "width": 1920,
          "height": 1080
        }
      },
      "fromUserId": "sender-uuid",
      "toUserId": "receiver-2-uuid"
    }
  ]
}
```

### 响应示例

```json
[
  {
    "success": true,
    "message": {
      "id": "msg-1",
      "type": "text",
      "status": "sent"
    }
  },
  {
    "success": true,
    "message": {
      "id": "msg-2",
      "type": "image",
      "status": "sent"
    }
  }
]
```

---

## 获取消息详情

根据消息ID获取单条消息的详细信息。

```http
GET /api/v1/messages/:id
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 消息ID |

### 响应示例

```json
{
  "id": "msg-uuid",
  "uuid": "client-uuid",
  "type": "text",
  "content": {
    "text": {
      "text": "Hello, OpenChat!",
      "mentions": ["user1"]
    }
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid",
  "status": "read",
  "clientSeq": 12345,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:01Z"
}
```

---

## 获取用户消息列表

获取与指定用户的消息历史记录。

```http
GET /api/v1/messages/user/:userId?limit=50&offset=0
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 对方用户ID |

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | number | 否 | 50 | 返回数量限制，最大100 |
| offset | number | 否 | 0 | 偏移量 |
| cursor | string | 否 | - | 游标（用于游标分页） |

### 响应示例

```json
[
  {
    "id": "msg-1",
    "type": "text",
    "content": { "text": { "text": "你好！" } },
    "fromUserId": "user-1",
    "toUserId": "user-2",
    "status": "read",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## 获取群组消息列表

获取指定群组的消息历史记录。

```http
GET /api/v1/messages/group/:groupId?limit=50&offset=0
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组ID |

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | number | 否 | 50 | 返回数量限制，最大100 |
| offset | number | 否 | 0 | 偏移量 |
| cursor | string | 否 | - | 游标（用于游标分页） |

### 响应示例

```json
[
  {
    "id": "msg-1",
    "type": "text",
    "content": {
      "text": {
        "text": "大家好！@user1",
        "mentions": ["user1"]
      }
    },
    "fromUserId": "user-1",
    "groupId": "group-1",
    "status": "sent",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## 更新消息状态

更新消息的状态（如已送达、已读等）。

```http
PUT /api/v1/messages/:id/status
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "status": "read"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 是 | 消息状态：sending, sent, delivered, read, failed, recalled |

### 响应示例

```json
true
```

---

## 删除消息

删除指定的消息。

```http
DELETE /api/v1/messages/:id
Authorization: Bearer <access-token>
```

### 响应示例

```json
true
```

---

## 标记消息已读

将与指定用户的消息标记为已读。

```http
POST /api/v1/messages/:userId/read
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "messageIds": ["msg-1", "msg-2", "msg-3"]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| messageIds | string[] | 是 | 要标记为已读的消息ID列表 |

### 响应示例

```json
true
```

---

## 撤回消息

撤回已发送的消息（通常有时间限制）。

```http
POST /api/v1/messages/:id/recall
Authorization: Bearer <access-token>
```

### 响应示例

成功：
```json
{
  "success": true
}
```

失败：
```json
{
  "success": false,
  "error": "消息已超过撤回时限"
}
```

---

## 转发消息

将消息转发给一个或多个用户或群组。

```http
POST /api/v1/messages/:id/forward
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "messageId": "original-message-id",
  "toUserIds": ["user-1", "user-2"],
  "toGroupIds": ["group-1"]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| messageId | string | 是 | 原消息ID（与路径参数一致） |
| toUserIds | string[] | 否 | 要转发到的用户ID列表 |
| toGroupIds | string[] | 否 | 要转发到的群组ID列表 |

### 响应示例

```json
[
  {
    "success": true,
    "message": {
      "id": "forwarded-msg-1",
      "type": "text",
      "forwardFromId": "original-message-id",
      "status": "sent"
    }
  }
]
```

---

## 重试发送失败消息

重试发送之前失败的消息。

```http
POST /api/v1/messages/:id/retry
Authorization: Bearer <access-token>
```

### 响应示例

```json
{
  "success": true,
  "message": {
    "id": "msg-id",
    "status": "sent"
  }
}
```

---

## 消息类型

| 类型 | 说明 | content 字段名 |
|------|------|----------------|
| text | 文本消息 | text |
| image | 图片消息 | image |
| audio | 语音消息 | audio |
| video | 视频消息 | video |
| file | 文件消息 | file |
| music | 音乐消息 | music |
| document | 文档消息 | document |
| code | 代码消息 | code |
| ppt | 演示文稿消息 | ppt |
| character | 数字人/角色消息 | character |
| model_3d | 3D模型消息 | model3d |
| location | 位置消息 | location |
| card | 名片/卡片消息 | card / cardResource |
| custom | 自定义消息 | custom |
| system | 系统消息 | system |

> **注意：** `card` 类型消息支持两种内容格式：
> - `card` 字段：用于发送用户名片（CardContent）
> - `cardResource` 字段：用于发送小程序、应用、链接等各类卡片（CardMediaResource）

---

## 消息状态

| 状态 | 说明 |
|------|------|
| sending | 发送中 |
| sent | 已发送（服务器已接收） |
| delivered | 已送达（对方已接收） |
| read | 已读（对方已阅读） |
| failed | 发送失败 |
| recalled | 已撤回 |

---

## 消息内容结构详解

### TextContent - 文本消息

用于发送文本消息，支持@提及功能。

**TypeScript 定义：**
```typescript
interface TextContent {
  text: string;           // 必填，文本内容
  mentions?: string[];    // 可选，@提及的用户ID列表
}
```

**请求示例 - 单聊文本消息：**
```json
{
  "type": "text",
  "content": {
    "text": {
      "text": "Hello, OpenChat!",
      "mentions": []
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - 群聊带@提及：**
```json
{
  "type": "text",
  "content": {
    "text": {
      "text": "@张三 请查看这个文档",
      "mentions": ["user-zhangsan"]
    }
  },
  "fromUserId": "user-001",
  "groupId": "group-001"
}
```

**请求示例 - 回复消息：**
```json
{
  "type": "text",
  "content": {
    "text": {
      "text": "我同意你的观点"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002",
  "replyToId": "msg-original-001"
}
```

---

### ImageMediaResource - 图片消息

用于发送图片消息，支持普通图片和AI生成图片。

**TypeScript 定义：**
```typescript
interface ImageMediaResource extends MediaResource {
  url: string;            // 必填，图片URL
  format?: ImageFormat;   // 可选，图片格式
  width?: number;         // 可选，图片宽度（像素）
  height?: number;        // 可选，图片高度（像素）
  size?: number;          // 可选，文件大小（字节）
  thumbnailUrl?: string;  // 可选，缩略图URL
  aspectRatio?: string;   // 可选，宽高比
  prompt?: string;        // 可选，AI生成提示词
}
```

**ImageFormat 枚举值：**
`JPEG`, `JPG`, `PNG`, `GIF`, `BMP`, `WEBP`, `SVG`, `TIFF`, `ICO`, `HEIC`

**请求示例 - 发送图片：**
```json
{
  "type": "image",
  "content": {
    "image": {
      "url": "https://cdn.example.com/images/photo-20240115.jpg",
      "format": "JPEG",
      "width": 1920,
      "height": 1080,
      "size": 524288,
      "mimeType": "image/jpeg",
      "thumbnailUrl": "https://cdn.example.com/images/photo-20240115-thumb.jpg",
      "aspectRatio": "16:9"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - AI生成图片：**
```json
{
  "type": "image",
  "content": {
    "image": {
      "url": "https://cdn.example.com/ai-images/generated-001.png",
      "format": "PNG",
      "width": 1024,
      "height": 1024,
      "size": 2097152,
      "prompt": "一只可爱的橙色小猫，坐在窗台上看着窗外的雨景，动漫风格，高清细节"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### VideoMediaResource - 视频消息

用于发送视频消息，支持普通视频和AI生成视频。

**TypeScript 定义：**
```typescript
interface VideoMediaResource extends MediaResource {
  url: string;            // 必填，视频URL
  format?: VideoFormat;   // 可选，视频格式
  duration?: number;      // 可选，视频时长（秒）
  width?: number;         // 可选，视频宽度（像素）
  height?: number;        // 可选，视频高度（像素）
  size?: number;          // 可选，文件大小（字节）
  thumbnailUrl?: string;  // 可选，缩略图URL
  coverUrl?: string;      // 可选，封面URL
  prompt?: string;        // 可选，AI生成提示词
}
```

**VideoFormat 枚举值：**
`MP4`, `AVI`, `MOV`, `WMV`, `FLV`, `MKV`, `WEBM`, `MPEG`, `3GP`, `TS`

**请求示例 - 发送视频：**
```json
{
  "type": "video",
  "content": {
    "video": {
      "url": "https://cdn.example.com/videos/demo-20240115.mp4",
      "format": "MP4",
      "duration": 125,
      "width": 1920,
      "height": 1080,
      "size": 15728640,
      "mimeType": "video/mp4",
      "thumbnailUrl": "https://cdn.example.com/videos/demo-20240115-thumb.jpg",
      "coverUrl": "https://cdn.example.com/videos/demo-20240115-cover.jpg"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - AI生成视频：**
```json
{
  "type": "video",
  "content": {
    "video": {
      "url": "https://cdn.example.com/ai-videos/generated-001.mp4",
      "format": "MP4",
      "duration": 10,
      "width": 1920,
      "height": 1080,
      "size": 15728640,
      "prompt": "夕阳下的海边，海浪轻轻拍打沙滩，海鸥在天空中飞翔"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### AudioMediaResource - 语音消息

用于发送语音消息，支持普通语音和AI生成语音（TTS）。

**TypeScript 定义：**
```typescript
interface AudioMediaResource extends MediaResource {
  url: string;            // 必填，音频URL
  format?: AudioFormat;   // 可选，音频格式
  duration?: number;      // 可选，音频时长（秒）
  size?: number;          // 可选，文件大小（字节）
  prompt?: string;        // 可选，AI生成提示词（TTS文本）
}
```

**AudioFormat 枚举值：**
`WAV`, `MP3`, `AAC`, `FLAC`, `OGG`, `PCM`, `AIFF`, `AU`, `OPUS`

**请求示例 - 发送语音：**
```json
{
  "type": "audio",
  "content": {
    "audio": {
      "url": "https://cdn.example.com/audio/voice-20240115.mp3",
      "format": "MP3",
      "duration": 15,
      "size": 24576,
      "mimeType": "audio/mpeg"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - AI生成语音（TTS）：**
```json
{
  "type": "audio",
  "content": {
    "audio": {
      "url": "https://cdn.example.com/ai-audio/tts-001.mp3",
      "format": "MP3",
      "duration": 8,
      "size": 32768,
      "prompt": "欢迎使用OpenChat，这是一条AI生成的语音消息。"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### MusicMediaResource - 音乐消息

用于发送音乐消息，包含音乐元数据，支持普通音乐和AI生成音乐。

**TypeScript 定义：**
```typescript
interface MusicMediaResource extends MediaResource {
  url: string;            // 必填，音乐URL
  format?: AudioFormat;   // 可选，音频格式
  duration?: number;      // 可选，音乐时长（秒）
  title?: string;         // 可选，音乐标题
  artist?: string;        // 可选，艺术家
  album?: string;         // 可选，专辑
  genre?: string;         // 可选，风格
  lyrics?: string;        // 可选，歌词
  coverUrl?: string;      // 可选，封面URL
  prompt?: string;        // 可选，AI生成提示词
}
```

**请求示例 - 分享音乐：**
```json
{
  "type": "music",
  "content": {
    "music": {
      "url": "https://music.example.com/songs/song-001.mp3",
      "format": "MP3",
      "title": "夜曲",
      "artist": "周杰伦",
      "album": "十一月的萧邦",
      "genre": "流行",
      "duration": 256,
      "size": 4194304,
      "coverUrl": "https://music.example.com/covers/album-001.jpg"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - AI生成音乐：**
```json
{
  "type": "music",
  "content": {
    "music": {
      "url": "https://cdn.example.com/ai-music/generated-001.mp3",
      "format": "MP3",
      "title": "春日序曲",
      "artist": "AI Composer",
      "duration": 180,
      "size": 4194304,
      "prompt": "一首轻快的春日主题钢琴曲，充满希望和活力的旋律"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### FileMediaResource - 文件消息

用于发送普通文件消息。

**TypeScript 定义：**
```typescript
interface FileMediaResource extends MediaResource {
  name: string;           // 必填，文件名
  url: string;            // 必填，文件URL
  size?: number;          // 可选，文件大小（字节），最大100MB
  mimeType?: string;      // 可选，MIME类型
}
```

**请求示例 - 发送文件：**
```json
{
  "type": "file",
  "content": {
    "file": {
      "name": "项目需求文档v2.0.pdf",
      "url": "https://cdn.example.com/files/requirements-v2.pdf",
      "size": 2097152,
      "mimeType": "application/pdf"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### DocumentMediaResource - 文档消息

用于发送文档消息，包含文档元数据。

**TypeScript 定义：**
```typescript
interface DocumentMediaResource extends MediaResource {
  url: string;               // 必填，文档URL
  format?: DocumentFormat;   // 可选，文档格式
  pageCount?: number;        // 可选，页数
  author?: string;           // 可选，作者
  title?: string;            // 可选，标题
  summary?: string;          // 可选，摘要
  coverUrl?: string;         // 可选，封面URL
}
```

**DocumentFormat 枚举值：**
`PDF`, `DOC`, `DOCX`, `XLS`, `XLSX`, `TXT`, `RTF`, `MD`, `EPUB`

**请求示例 - 发送文档：**
```json
{
  "type": "document",
  "content": {
    "document": {
      "url": "https://cdn.example.com/docs/api-design.pdf",
      "format": "PDF",
      "title": "OpenChat API设计文档",
      "author": "OpenChat团队",
      "pageCount": 45,
      "summary": "本文档详细描述了OpenChat的API设计规范...",
      "coverUrl": "https://cdn.example.com/docs/api-design-cover.png"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### CodeMediaResource - 代码消息

用于发送代码片段消息。

**TypeScript 定义：**
```typescript
interface CodeMediaResource extends MediaResource {
  language?: CodeLanguage;   // 可选，代码语言
  code?: string;             // 可选，代码内容
  lineCount?: number;        // 可选，行数
}
```

**CodeLanguage 枚举值：**
`JAVA`, `PYTHON`, `JAVASCRIPT`, `TYPESCRIPT`, `CPP`, `C`, `CSHARP`, `GO`, `RUST`, `PHP`, `RUBY`, `SWIFT`, `KOTLIN`, `SQL`, `HTML`, `CSS`, `SHELL`, `JSON`, `XML`, `YAML`, `OTHER`

**请求示例 - 分享代码：**
```json
{
  "type": "code",
  "content": {
    "code": {
      "language": "TYPESCRIPT",
      "code": "interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nfunction createUser(data: Partial<User>): User {\n  return {\n    id: data.id || crypto.randomUUID(),\n    name: data.name || 'Anonymous',\n    email: data.email || ''\n  };\n}",
      "lineCount": 11
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### PptMediaResource - 演示文稿消息

用于发送演示文稿消息，支持PPT、PPTX、KEY等格式。

**TypeScript 定义：**
```typescript
interface PptMediaResource extends MediaResource {
  format?: PptFormat;     // 可选，演示文稿格式
  slideCount?: number;       // 可选，幻灯片数量
  theme?: string;            // 可选，PPT主题
  author?: string;             // 可选，作者
  title?: string;             // 可选，标题
  notes?: string;            // 可选，备注
  slideThumbnails?: string[];   // 可选，幻灯片缩略图URL列表
}
```

**PptFormat 枚举值：**
`PPT`, `PPTX`, `KEY`, `ODP`

**请求示例 - 发送演示文稿：**
```json
{
  "type": "ppt",
  "content": {
    "ppt": {
      "url": "https://cdn.example.com/ppts/product-demo.pptx",
      "format": "PPTX",
      "title": "产品演示文稿",
      "author": "产品团队",
      "slideCount": 25,
      "theme": "企业蓝",
      "size": 5242880,
      "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### CharacterMediaResource - 数字人/角色消息

用于发送数字人或角色消息，支持2D/3D角色、虚拟形象等。

**TypeScript 定义：**
```typescript
interface CharacterMediaResource extends MediaResource {
  name?: string;             // 可选，角色名称
  characterType?: string;  // 可选，角色类型（2D_IMAGE, 2D_VIDEO, 3D_MODEL等）
  gender?: string;         // 可选，性别
  ageGroup?: string;     // 可选，年龄段
  avatarImage?: ImageMediaResource; // 可选，头像图片
  avatarVideo?: VideoMediaResource; // 可选，头像视频
  speakerId?: string;     // 可选，关联发音人ID
  appearanceParams?: Record<string, any>; // 可选，外观参数
  animationParams?: Record<string, any>; // 可选，动画参数
  actions?: string[];      // 可选，角色动作库
  expressions?: string[];    // 可选，角色表情库
  voiceFeatures?: Record<string, any>; // 可选，声音特征
}
```

**请求示例 - 发送数字人：**
```json
{
  "type": "character",
  "content": {
    "character": {
      "url": "https://cdn.example.com/characters/ai-assistant.png",
      "name": "小助手",
      "characterType": "2D_VIDEO",
      "gender": "female",
      "ageGroup": "young",
      "avatarImage": {
        "url": "https://cdn.example.com/characters/ai-assistant-avatar.jpg",
        "width": 512,
        "height": 512
      },
      "speakerId": "speaker-001",
      "appearanceParams": {
        "hairColor": "brown",
        "eyeColor": "black"
      }
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### Model3DMediaResource - 3D模型消息

用于发送3D模型消息，支持多种3D模型格式。

**TypeScript 定义：**
```typescript
interface Model3DMediaResource extends MediaResource {
  format?: Model3DFormat;   // 可选，3D模型格式
  vertexCount?: number;     // 可选，顶点数
  faceCount?: number;      // 可选，面数
  materialCount?: number;  // 可选，材质数
  boneCount?: number;      // 可选，骨骼数
  animationCount?: number;   // 可选，动画数
  boundingBox?: {         // 可选，边界盒尺寸
    width?: number;
    height?: number;
    depth?: number;
  };
  previewUrl?: string;      // 可选，预览图URL
  textureUrls?: string[];     // 可选，材质贴图URLs
}
```

**Model3DFormat 枚举值：**
`OBJ`, `FBX`, `GLTF`, `GLB`, `STL`, `PLY`, `3DS`, `DAE`, `USD`

**请求示例 - 发送3D模型：**
```json
{
  "type": "model_3d",
  "content": {
    "model3d": {
      "url": "https://cdn.example.com/3d-models/product-demo.glb",
      "format": "GLB",
      "title": "产品3D展示",
      "vertexCount": 15000,
      "faceCount": 28000,
      "previewUrl": "https://cdn.example.com/3d-models/product-preview.png",
      "textureUrls": [
        "https://cdn.example.com/3d-models/texture-1.jpg",
        "https://cdn.example.com/3d-models/texture-2.jpg"
      ],
      "size": 10485760
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### LocationContent - 位置消息

用于发送地理位置消息。

**TypeScript 定义：**
```typescript
interface LocationContent {
  latitude: number;       // 必填，纬度（-90 到 90）
  longitude: number;      // 必填，经度（-180 到 180）
  address?: string;       // 可选，地址描述
  name?: string;          // 可选，地点名称
  thumbnailUrl?: string;  // 可选，地图缩略图URL
}
```

**请求示例 - 分享位置：**
```json
{
  "type": "location",
  "content": {
    "location": {
      "latitude": 39.9042,
      "longitude": 116.4074,
      "address": "北京市东城区东华门街道天安门",
      "name": "天安门",
      "thumbnailUrl": "https://maps.example.com/static/39.9042,116.4074.png"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### CardContent - 用户名片消息

用于发送用户名片消息。

**TypeScript 定义：**
```typescript
interface CardContent {
  userId: string;         // 必填，用户ID
  nickname?: string;      // 可选，用户昵称
  avatar?: string;        // 可选，用户头像URL
  signature?: string;     // 可选，用户签名
}
```

**请求示例 - 分享用户名片：**
```json
{
  "type": "card",
  "content": {
    "card": {
      "userId": "user-zhangsan",
      "nickname": "张三",
      "avatar": "https://cdn.example.com/avatars/zhangsan.jpg",
      "signature": "热爱生活，热爱编程"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### CardMediaResource - 卡片消息

用于发送各类卡片消息，支持小程序、应用、链接、文章、商品等多种卡片类型。

**TypeScript 定义：**
```typescript
interface CardMediaResource extends MediaResource {
  cardType: CardType;             // 必填，卡片类型
  title: string;                  // 必填，卡片标题
  description?: string;           // 可选，卡片描述
  thumbnailUrl?: string;          // 可选，卡片封面图片URL
  sourceName?: string;            // 可选，卡片来源名称
  sourceIcon?: string;            // 可选，卡片来源图标URL
  targetUrl?: string;             // 可选，目标URL
  appId?: string;                 // 可选，小程序appId
  appPath?: string;               // 可选，小程序页面路径
  mainAction?: CardAction;        // 可选，卡片主动作
  buttons?: CardButton[];         // 可选，卡片按钮列表
  extraData?: Record<string, any>; // 可选，卡片额外数据
  tag?: string;                   // 可选，卡片标签
  status?: string;                // 可选，卡片状态
  expireTime?: string;            // 可选，过期时间
}

interface CardAction {
  type: string;                   // 必填，动作类型
  url?: string;                   // 可选，动作目标URL
  params?: Record<string, any>;   // 可选，动作参数
  appId?: string;                 // 可选，小程序appId
  appPath?: string;               // 可选，小程序路径
}

interface CardButton {
  text: string;                   // 必填，按钮文本
  action?: CardAction;            // 可选，按钮动作
  style?: string;                 // 可选，按钮样式
  color?: string;                 // 可选，按钮颜色
}
```

**CardType 枚举值：**

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| MINI_PROGRAM | 小程序卡片 | 微信小程序、支付宝小程序等 |
| APP | 应用卡片 | 分享APP、应用推荐 |
| LINK | 链接卡片 | 网页链接分享 |
| ARTICLE | 文章卡片 | 公众号文章、博客文章 |
| PRODUCT | 商品卡片 | 电商商品分享 |
| ORDER | 订单卡片 | 订单信息展示 |
| PAYMENT | 支付卡片 | 支付信息、收款码 |
| INVITATION | 邀请卡片 | 邀请注册、邀请入群 |
| RED_PACKET | 红包卡片 | 红包消息 |
| LOCATION | 位置卡片 | 位置分享（带更多信息） |
| CONTACT | 联系人卡片 | 联系人分享 |
| FILE_PREVIEW | 文件预览卡片 | 文件预览 |
| CUSTOM | 自定义卡片 | 业务自定义卡片 |

**请求示例 - 小程序卡片：**
```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "MINI_PROGRAM",
      "title": "OpenChat小程序",
      "description": "一个现代化的即时通讯应用，支持多种消息类型",
      "thumbnailUrl": "https://openchat.com/mini-cover.jpg",
      "sourceName": "微信小程序",
      "sourceIcon": "https://openchat.com/wechat-icon.png",
      "appId": "wxabcdef1234567890",
      "appPath": "pages/index/index?id=123",
      "mainAction": {
        "type": "open_mini_program",
        "appId": "wxabcdef1234567890",
        "appPath": "pages/index/index?id=123"
      }
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - 链接卡片：**
```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "LINK",
      "title": "OpenChat官方文档 - 快速开始",
      "description": "OpenChat是一个开源的即时通讯解决方案，提供完整的聊天功能，支持多种消息类型、群组管理、好友系统等功能...",
      "thumbnailUrl": "https://openchat.com/og-image.png",
      "sourceName": "openchat.com",
      "sourceIcon": "https://openchat.com/favicon.ico",
      "targetUrl": "https://openchat.com/docs/quick-start",
      "mainAction": {
        "type": "open_url",
        "url": "https://openchat.com/docs/quick-start"
      }
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - 商品卡片：**
```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "PRODUCT",
      "title": "OpenChat Pro会员 - 年度订阅",
      "description": "解锁全部高级功能，享受无限畅聊体验",
      "thumbnailUrl": "https://openchat.com/products/pro-membership.png",
      "sourceName": "OpenChat商城",
      "tag": "限时优惠",
      "extraData": {
        "price": 99.00,
        "originalPrice": 199.00,
        "currency": "CNY",
        "productId": "prod-pro-001",
        "stock": 1000
      },
      "mainAction": {
        "type": "open_url",
        "url": "https://openchat.com/shop/pro"
      },
      "buttons": [
        {
          "text": "立即购买",
          "action": { "type": "open_url", "url": "https://openchat.com/buy/pro" },
          "style": "primary",
          "color": "#07C160"
        },
        {
          "text": "加入购物车",
          "action": { "type": "add_to_cart", "params": { "productId": "prod-pro-001" } }
        }
      ]
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - 订单卡片：**
```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "ORDER",
      "title": "订单 #OC20240115001",
      "description": "OpenChat Pro会员 x 1",
      "thumbnailUrl": "https://openchat.com/icons/order.png",
      "sourceName": "OpenChat",
      "status": "待支付",
      "tag": "待支付",
      "expireTime": "2024-01-15T12:00:00Z",
      "extraData": {
        "orderId": "OC20240115001",
        "amount": 99.00,
        "currency": "CNY",
        "createTime": "2024-01-15T10:00:00Z",
        "items": [
          { "name": "OpenChat Pro会员", "quantity": 1, "price": 99.00 }
        ]
      },
      "buttons": [
        {
          "text": "立即支付",
          "action": { "type": "pay", "params": { "orderId": "OC20240115001" } },
          "style": "primary"
        },
        {
          "text": "取消订单",
          "action": { "type": "cancel_order", "params": { "orderId": "OC20240115001" } }
        }
      ]
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**请求示例 - 文章卡片：**
```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "ARTICLE",
      "title": "如何使用OpenChat构建实时聊天应用",
      "description": "本文将介绍如何使用OpenChat快速构建一个功能完整的实时聊天应用，包括消息发送、群组管理、好友系统等核心功能...",
      "thumbnailUrl": "https://openchat.com/blog/chat-app-cover.jpg",
      "sourceName": "OpenChat博客",
      "sourceIcon": "https://openchat.com/blog-icon.png",
      "extraData": {
        "author": "OpenChat团队",
        "publishTime": "2024-01-15",
        "readCount": 1234,
        "likeCount": 56
      },
      "mainAction": {
        "type": "open_url",
        "url": "https://openchat.com/blog/build-chat-app"
      }
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### CustomContent - 自定义消息

用于发送自定义类型消息，支持任意数据结构。

**TypeScript 定义：**
```typescript
interface CustomContent {
  customType: string;             // 必填，自定义类型标识
  data?: Record<string, any>;     // 可选，自定义数据
}
```

**请求示例 - 自定义订单消息：**
```json
{
  "type": "custom",
  "content": {
    "custom": {
      "customType": "food_order",
      "data": {
        "orderId": "FO20240115001",
        "restaurant": "麦当劳(中关村店)",
        "items": [
          { "name": "巨无霸套餐", "quantity": 1, "price": 38.00 },
          { "name": "麦辣鸡腿堡", "quantity": 2, "price": 42.00 }
        ],
        "totalAmount": 80.00,
        "status": "delivering",
        "estimatedTime": "30分钟"
      }
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

### SystemContent - 系统消息

用于发送系统通知消息。

**TypeScript 定义：**
```typescript
interface SystemContent {
  type: string;                   // 必填，系统消息类型
  data?: Record<string, any>;     // 可选，系统消息数据
}
```

**常见系统消息类型：**
- `group_created` - 群组创建
- `group_member_joined` - 成员加入
- `group_member_left` - 成员离开
- `group_member_kicked` - 成员被踢出
- `group_owner_changed` - 群主变更
- `friend_added` - 好友添加成功

**请求示例 - 群成员加入通知：**
```json
{
  "type": "system",
  "content": {
    "system": {
      "type": "group_member_joined",
      "data": {
        "userId": "user-zhangsan",
        "userName": "张三",
        "groupId": "group-001",
        "groupName": "技术交流群",
        "operatorId": "user-001",
        "operatorName": "管理员",
        "joinTime": "2024-01-15T10:30:00Z"
      }
    }
  },
  "groupId": "group-001"
}
```

---

## MediaResource 基类

所有媒体资源（image, video, audio, music, file, document, code, card）都继承自 MediaResource 基类：

```typescript
interface MediaResource {
  id?: string;              // 可选，资源ID
  uuid?: string;            // 可选，资源UUID
  url?: string;             // 可选，资源URL
  mimeType?: string;        // 可选，MIME类型
  size?: number;            // 可选，文件大小（字节）
  name?: string;            // 可选，资源名称
  extension?: string;       // 可选，扩展名
  metadata?: Record<string, any>; // 可选，资源元数据
  prompt?: string;          // 可选，AI生成提示词（用于AI生成的图片、视频、语音等）
  createdAt?: string;       // 可选，创建时间
  updatedAt?: string;       // 可选，更新时间
  description?: string;     // 可选，描述
}
```

**MediaResourceType 枚举值：**
`IMAGE`, `VIDEO`, `AUDIO`, `DOCUMENT`, `FILE`, `MUSIC`, `CHARACTER`, `MODEL_3D`, `PPT`, `CODE`, `CARD`

### prompt 字段说明

`prompt` 字段用于存储 AI 生成内容时的提示词，适用于以下场景：

| 资源类型 | 使用场景 |
|---------|---------|
| image | AI生成的图片，存储生成提示词 |
| video | AI生成的视频，存储生成提示词 |
| audio | AI生成的语音，存储文本内容 |
| music | AI生成的音乐，存储音乐描述 |

**示例 - AI生成图片消息：**
```json
{
  "type": "image",
  "content": {
    "image": {
      "url": "https://cdn.example.com/ai-generated/image-001.png",
      "format": "PNG",
      "width": 1024,
      "height": 1024,
      "size": 2097152,
      "prompt": "一只可爱的橙色小猫，坐在窗台上看着窗外的雨景，动漫风格，高清细节"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**示例 - AI生成视频消息：**
```json
{
  "type": "video",
  "content": {
    "video": {
      "url": "https://cdn.example.com/ai-generated/video-001.mp4",
      "format": "MP4",
      "duration": 10,
      "width": 1920,
      "height": 1080,
      "size": 15728640,
      "prompt": "夕阳下的海边，海浪轻轻拍打沙滩，海鸥在天空中飞翔"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**示例 - AI生成语音消息：**
```json
{
  "type": "audio",
  "content": {
    "audio": {
      "url": "https://cdn.example.com/ai-generated/voice-001.mp3",
      "format": "MP3",
      "duration": 8,
      "size": 32768,
      "prompt": "欢迎使用OpenChat，这是一条AI生成的语音消息。"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

**示例 - AI生成音乐消息：**
```json
{
  "type": "music",
  "content": {
    "music": {
      "url": "https://cdn.example.com/ai-generated/music-001.mp3",
      "format": "MP3",
      "title": "春日序曲",
      "artist": "AI Composer",
      "duration": 180,
      "size": 4194304,
      "prompt": "一首轻快的春日主题钢琴曲，充满希望和活力的旋律"
    }
  },
  "fromUserId": "user-001",
  "toUserId": "user-002"
}
```

---

## 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `MESSAGE_NOT_FOUND` | 404 | 消息不存在 |
| `NOT_MESSAGE_OWNER` | 403 | 不是消息发送者 |
| `RECALL_TIMEOUT` | 400 | 超过撤回时间限制 |
| `ALREADY_RECALLED` | 400 | 消息已撤回 |
| `CONTENT_TOO_LONG` | 400 | 消息内容过长 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `GROUP_NOT_FOUND` | 404 | 群组不存在 |
| `NOT_GROUP_MEMBER` | 403 | 不是群组成员 |
| `RATE_LIMIT_EXCEEDED` | 429 | 发送频率超限 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |

---

## 相关链接

- [WukongIM 集成 API](./wukongim.md)
- [群组管理 API](./groups.md)
- [用户管理 API](./users.md)
- [消息系统概念](../guide/concepts/messages.md)
