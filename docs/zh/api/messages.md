# 消息管理 API

消息管理 API 提供消息的发送、查询、撤回等功能。

## 概述

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 发送消息 | POST | `/api/messages` | 发送消息 |
| 获取消息列表 | GET | `/api/messages` | 获取会话消息列表 |
| 获取会话列表 | GET | `/api/conversations` | 获取会话列表 |
| 标记已读 | PUT | `/api/messages/read` | 标记消息已读 |
| 撤回消息 | POST | `/api/messages/:id/recall` | 撤回消息 |
| 删除消息 | DELETE | `/api/messages/:id` | 删除消息 |
| 转发消息 | POST | `/api/messages/:id/forward` | 转发消息 |
| 搜索消息 | GET | `/api/messages/search` | 搜索消息 |

---

## 发送消息

发送消息给指定用户或群组。

```http
POST /api/messages
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "uuid": "string",              // 可选，消息UUID（客户端生成，用于去重）
  "type": "text",                // 必填，消息类型
  "content": {},                 // 必填，消息内容（根据type不同结构不同）
  "fromUserId": "string",        // 必填，发送者用户ID
  "toUserId": "string",          // 可选，接收者用户ID（单聊时必填）
  "groupId": "string",           // 可选，群组ID（群聊时必填）
  "replyToId": "string",         // 可选，回复的消息ID
  "forwardFromId": "string",     // 可选，转发来源消息ID
  "clientSeq": 12345,            // 可选，客户端序列号（用于消息去重）
  "extra": {},                   // 可选，扩展数据
  "needReadReceipt": true        // 可选，是否需要已读回执，默认true
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| uuid | string | 否 | 消息UUID，客户端生成，用于去重 |
| type | string | 是 | 消息类型，见下方消息类型说明 |
| content | object | 是 | 消息内容，根据type不同结构不同 |
| fromUserId | string | 是 | 发送者用户ID |
| toUserId | string | 条件必填 | 接收者用户ID（单聊时必填） |
| groupId | string | 条件必填 | 群组ID（群聊时必填） |
| replyToId | string | 否 | 回复的消息ID |
| forwardFromId | string | 否 | 转发来源消息ID |
| clientSeq | number | 否 | 客户端序列号，用于消息去重 |
| extra | object | 否 | 扩展数据 |
| needReadReceipt | boolean | 否 | 是否需要已读回执，默认true |

---

## 消息类型

| 类型 | 说明 | content 结构 |
|------|------|--------------|
| text | 文本消息 | TextContent |
| image | 图片消息 | ImageMediaResource |
| audio | 语音消息 | AudioMediaResource |
| video | 视频消息 | VideoMediaResource |
| file | 文件消息 | FileMediaResource |
| music | 音乐消息 | MusicMediaResource |
| document | 文档消息 | DocumentMediaResource |
| code | 代码消息 | CodeMediaResource |
| location | 位置消息 | LocationContent |
| card | 名片消息 | CardContent |
| custom | 自定义消息 | CustomContent |
| system | 系统消息 | SystemContent |

---

## 消息内容结构

### TextContent - 文本内容

```typescript
interface TextContent {
  text: string;           // 必填，文本内容
  mentions?: string[];    // 可选，@提及的用户ID列表
}
```

**示例：**

```json
{
  "type": "text",
  "content": {
    "text": "Hello @user1，你好！",
    "mentions": ["user1"]
  }
}
```

### ImageMediaResource - 图片资源

继承自 MediaResource。

```typescript
interface ImageMediaResource {
  url: string;            // 必填，图片URL
  format?: ImageFormat;   // 可选，图片格式：JPEG, JPG, PNG, GIF, BMP, WEBP, SVG, TIFF, ICO, HEIC
  width?: number;         // 可选，图片宽度（像素）
  height?: number;        // 可选，图片高度（像素）
  splitImages?: ImageMediaResource[]; // 可选，图片分割结果
  aspectRatio?: string;   // 可选，宽高比
  colorMode?: string;     // 可选，颜色模式
  dpi?: number;           // 可选，DPI
  thumbnailUrl?: string;  // 可选，缩略图URL
}
```

**示例：**

```json
{
  "type": "image",
  "content": {
    "url": "https://example.com/image.jpg",
    "format": "JPEG",
    "width": 1920,
    "height": 1080,
    "size": 512000,
    "thumbnailUrl": "https://example.com/thumb.jpg"
  }
}
```

### VideoMediaResource - 视频资源

继承自 MediaResource。

```typescript
interface VideoMediaResource {
  url: string;            // 必填，视频URL
  format?: VideoFormat;   // 可选，视频格式：MP4, AVI, MOV, WMV, FLV, MKV, WEBM, MPEG, 3GP, TS
  duration?: number;      // 可选，视频时长（秒）
  width?: number;         // 可选，视频宽度（像素）
  height?: number;        // 可选，视频高度（像素）
  size?: number;          // 可选，文件大小（字节）
  frameRate?: number;     // 可选，帧率
  bitRate?: string;       // 可选，比特率
  codec?: string;         // 可选，编码格式
  thumbnailUrl?: string;  // 可选，缩略图URL
  coverUrl?: string;      // 可选，封面URL
}
```

**示例：**

```json
{
  "type": "video",
  "content": {
    "url": "https://example.com/video.mp4",
    "format": "MP4",
    "duration": 120,
    "width": 1920,
    "height": 1080,
    "size": 10240000,
    "thumbnailUrl": "https://example.com/thumb.jpg"
  }
}
```

### AudioMediaResource - 语音资源

继承自 MediaResource。

```typescript
interface AudioMediaResource {
  url: string;            // 必填，音频URL
  format?: AudioFormat;   // 可选，音频格式：WAV, MP3, AAC, FLAC, OGG, PCM, AIFF, AU, OPUS
  duration?: number;      // 可选，音频时长（秒）
  size?: number;          // 可选，文件大小（字节）
  bitRate?: string;       // 可选，比特率
  sampleRate?: string;    // 可选，采样率
  channels?: number;      // 可选，声道数
  codec?: string;         // 可选，编码格式
}
```

**示例：**

```json
{
  "type": "audio",
  "content": {
    "url": "https://example.com/voice.mp3",
    "format": "MP3",
    "duration": 30,
    "size": 102400
  }
}
```

### MusicMediaResource - 音乐资源

继承自 MediaResource。

```typescript
interface MusicMediaResource {
  url: string;            // 必填，音乐URL
  format?: AudioFormat;   // 可选，音频格式
  duration?: number;      // 可选，音乐时长（秒）
  size?: number;          // 可选，文件大小（字节）
  title?: string;         // 可选，音乐标题
  artist?: string;        // 可选，艺术家
  album?: string;         // 可选，专辑
  genre?: string;         // 可选，风格
  lyrics?: string;        // 可选，歌词
  coverUrl?: string;      // 可选，封面URL
  year?: number;          // 可选，年份
}
```

**示例：**

```json
{
  "type": "music",
  "content": {
    "url": "https://example.com/music.mp3",
    "title": "歌曲名",
    "artist": "艺术家",
    "album": "专辑",
    "duration": 180,
    "coverUrl": "https://example.com/cover.jpg"
  }
}
```

### FileMediaResource - 文件资源

继承自 MediaResource。

```typescript
interface FileMediaResource {
  name: string;           // 必填，文件名
  url: string;            // 必填，文件URL
  size?: number;          // 可选，文件大小（字节），最大100MB
  mimeType?: string;      // 可选，MIME类型
  hash?: string;          // 可选，文件哈希值
  path?: string;          // 可选，文件路径
}
```

**示例：**

```json
{
  "type": "file",
  "content": {
    "name": "document.pdf",
    "url": "https://example.com/file.pdf",
    "size": 1024000,
    "mimeType": "application/pdf"
  }
}
```

### DocumentMediaResource - 文档资源

继承自 MediaResource。

```typescript
interface DocumentMediaResource {
  url: string;               // 必填，文档URL
  format?: DocumentFormat;   // 可选，文档格式：PDF, DOC, DOCX, XLS, XLSX, TXT, RTF, MD, EPUB
  pageCount?: number;        // 可选，页数
  author?: string;           // 可选，作者
  title?: string;            // 可选，标题
  summary?: string;          // 可选，摘要
  keywords?: string[];       // 可选，关键词
  contentText?: string;      // 可选，文档内容文本
  coverUrl?: string;         // 可选，封面URL
  version?: string;          // 可选，版本
}
```

**示例：**

```json
{
  "type": "document",
  "content": {
    "url": "https://example.com/document.pdf",
    "format": "PDF",
    "title": "文档标题",
    "pageCount": 10,
    "author": "作者"
  }
}
```

### CodeMediaResource - 代码资源

继承自 MediaResource。

```typescript
interface CodeMediaResource {
  language?: CodeLanguage;   // 可选，代码语言：JAVA, PYTHON, JAVASCRIPT, TYPESCRIPT, CPP, C, CSHARP, GO, RUST, PHP, RUBY, SWIFT, KOTLIN, SQL, HTML, CSS, SHELL, JSON, XML, YAML, OTHER
  code?: string;             // 可选，代码内容
  lineCount?: number;        // 可选，行数
  comments?: string;         // 可选，注释
  dependencies?: string[];   // 可选，依赖
  license?: string;          // 可选，许可证
  version?: string;          // 可选，版本
  author?: string;           // 可选，作者
}
```

**示例：**

```json
{
  "type": "code",
  "content": {
    "language": "TYPESCRIPT",
    "code": "const hello = 'world';",
    "lineCount": 1
  }
}
```

### LocationContent - 位置内容

```typescript
interface LocationContent {
  latitude: number;       // 必填，纬度
  longitude: number;      // 必填，经度
  address?: string;       // 可选，地址描述
  name?: string;          // 可选，地点名称
  thumbnailUrl?: string;  // 可选，缩略图URL
}
```

**示例：**

```json
{
  "type": "location",
  "content": {
    "latitude": 39.9042,
    "longitude": 116.4074,
    "address": "北京市东城区天安门",
    "name": "天安门"
  }
}
```

### CardContent - 名片内容

```typescript
interface CardContent {
  userId: string;         // 必填，用户ID
  nickname?: string;      // 可选，用户昵称
  avatar?: string;        // 可选，用户头像URL
  signature?: string;     // 可选，用户签名
}
```

**示例：**

```json
{
  "type": "card",
  "content": {
    "userId": "user-uuid",
    "nickname": "用户昵称",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

### CustomContent - 自定义内容

```typescript
interface CustomContent {
  customType: string;             // 必填，自定义类型标识
  data?: Record<string, any>;     // 可选，自定义数据
}
```

**示例：**

```json
{
  "type": "custom",
  "content": {
    "customType": "order",
    "data": {
      "orderId": "12345",
      "amount": 99.99
    }
  }
}
```

### SystemContent - 系统消息

```typescript
interface SystemContent {
  type: string;                   // 必填，系统消息类型
  data?: Record<string, any>;     // 可选，系统消息数据
}
```

**示例：**

```json
{
  "type": "system",
  "content": {
    "type": "group_member_joined",
    "data": {
      "userId": "user-uuid",
      "groupId": "group-uuid"
    }
  }
}
```

---

## MediaResource - 媒体资源基类

所有媒体资源都继承自 MediaResource：

```typescript
interface MediaResource {
  id?: string;            // 可选，资源ID
  uuid?: string;          // 可选，资源UUID
  url?: string;           // 可选，资源URL
  bytes?: number[];       // 可选，资源字节数据
  localFile?: object;     // 可选，本地文件
  base64?: string;        // 可选，资源Base64编码
  type?: MediaResourceType; // 可选，资源类型：IMAGE, VIDEO, AUDIO, DOCUMENT, FILE, MUSIC, CHARACTER, MODEL_3D, PPT, CODE
  mimeType?: string;      // 可选，MIME类型
  size?: number;          // 可选，文件大小（字节）
  name?: string;          // 可选，资源名称
  extension?: string;     // 可选，扩展名
  tags?: TagsContent;     // 可选，资源标签
  metadata?: Record<string, any>; // 可选，资源元数据
  prompt?: string;        // 可选，AI生成提示词
  createdAt?: string;     // 可选，创建时间
  updatedAt?: string;     // 可选，更新时间
  creatorId?: string;     // 可选，创建者ID
  description?: string;   // 可选，描述
}
```

---

## 完整请求示例

### 发送文本消息（单聊）

```json
{
  "type": "text",
  "content": {
    "text": "Hello, OpenChat!",
    "mentions": ["user1", "user2"]
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid"
}
```

### 发送图片消息

```json
{
  "type": "image",
  "content": {
    "url": "https://example.com/image.jpg",
    "format": "JPEG",
    "width": 1920,
    "height": 1080,
    "size": 512000,
    "thumbnailUrl": "https://example.com/thumb.jpg"
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid"
}
```

### 发送群消息

```json
{
  "type": "text",
  "content": {
    "text": "大家好！"
  },
  "fromUserId": "sender-uuid",
  "groupId": "group-uuid"
}
```

### 回复消息

```json
{
  "type": "text",
  "content": {
    "text": "我同意你的观点"
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid",
  "replyToId": "original-message-id"
}
```

### 带去重的消息发送

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "type": "text",
  "content": {
    "text": "Hello"
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid",
  "clientSeq": 12345
}
```

---

## 响应示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "fromUserId": "sender-uuid",
    "toUserId": "receiver-uuid",
    "type": "text",
    "content": {
      "text": "Hello, OpenChat!"
    },
    "status": "sent",
    "timestamp": 1705312800000,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

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

## 使用示例

### cURL

```bash
# 发送文本消息
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": {"text": "Hello!"},
    "fromUserId": "sender-uuid",
    "toUserId": "receiver-uuid"
  }'
```

### TypeScript SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// 发送文本消息
const message = await client.message.send({
  type: 'text',
  content: {
    text: 'Hello, OpenChat!',
    mentions: ['user1']
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送图片消息
const imageMessage = await client.message.send({
  type: 'image',
  content: {
    url: 'https://example.com/image.jpg',
    width: 1920,
    height: 1080
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});
```

---

## 相关链接

- [WukongIM 集成 API](./wukongim.md)
- [群组管理 API](./groups.md)
- [SDK 文档](../sdk/typescript.md)
