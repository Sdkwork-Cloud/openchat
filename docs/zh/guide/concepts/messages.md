# 消息系统

消息系统是 OpenChat 的核心功能，提供实时消息的发送、接收、存储和同步能力。

## 概述

OpenChat 消息系统支持多种消息类型，包括文本、图片、视频、语音、文件、位置、名片等，并提供消息状态追踪、已读回执、消息撤回、消息转发等功能。

## 消息模型

### 完整消息结构

```typescript
interface Message {
  id: string;                    // 消息唯一标识（服务器生成）
  uuid: string;                  // 消息UUID（客户端生成，用于去重）
  type: MessageType;             // 消息类型
  content: MessageContent;       // 消息内容（根据类型结构不同）
  fromUserId: string;            // 发送者用户ID
  toUserId?: string;             // 接收者用户ID（单聊）
  groupId?: string;              // 群组ID（群聊）
  replyToId?: string;            // 回复的消息ID
  forwardFromId?: string;        // 转发来源消息ID
  status: MessageStatus;         // 消息状态
  clientSeq?: number;            // 客户端序列号（用于消息去重）
  extra?: Record<string, any>;   // 扩展数据
  needReadReceipt?: boolean;     // 是否需要已读回执
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}
```

### 消息内容结构

```typescript
interface MessageContent {
  text?: TextContent;            // 文本内容
  image?: ImageMediaResource;    // 图片资源
  video?: VideoMediaResource;    // 视频资源
  audio?: AudioMediaResource;    // 语音资源
  music?: MusicMediaResource;    // 音乐资源
  file?: FileMediaResource;      // 文件资源
  document?: DocumentMediaResource; // 文档资源
  code?: CodeMediaResource;      // 代码资源
  location?: LocationContent;    // 位置内容
  card?: CardContent;            // 用户名片内容
  cardResource?: CardMediaResource; // 卡片资源（小程序、应用等）
  system?: SystemContent;        // 系统消息
  custom?: CustomContent;        // 自定义消息
}
```

---

## 消息类型

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| text | 文本消息 | 日常文字交流，支持@提及 |
| image | 图片消息 | 分享图片，支持缩略图 |
| audio | 语音消息 | 语音通话留言、语音消息 |
| video | 视频消息 | 分享视频片段 |
| file | 文件消息 | 传输任意类型文件 |
| music | 音乐消息 | 分享音乐，包含歌曲信息 |
| document | 文档消息 | 分享文档，包含元数据 |
| code | 代码消息 | 分享代码片段 |
| location | 位置消息 | 分享地理位置 |
| card | 名片/卡片消息 | 分享用户名片或各类卡片 |
| custom | 自定义消息 | 业务自定义消息类型 |
| system | 系统消息 | 系统通知、群组事件 |

> **注意：** `card` 类型消息支持两种内容格式：
> - `card` 字段：用于发送用户名片（CardContent）
> - `cardResource` 字段：用于发送小程序、应用、链接等各类卡片（CardMediaResource）

### 文本消息

```typescript
interface TextContent {
  text: string;           // 文本内容
  mentions?: string[];    // @提及的用户ID列表
}
```

**示例：**

```json
{
  "type": "text",
  "content": {
    "text": {
      "text": "Hello @user1，你好！",
      "mentions": ["user1"]
    }
  }
}
```

### 图片消息

```typescript
interface ImageMediaResource {
  url: string;            // 图片URL
  format?: ImageFormat;   // 图片格式：JPEG, PNG, GIF, WEBP 等
  width?: number;         // 图片宽度（像素）
  height?: number;        // 图片高度（像素）
  size?: number;          // 文件大小（字节）
  thumbnailUrl?: string;  // 缩略图URL
}
```

### 视频消息

```typescript
interface VideoMediaResource {
  url: string;            // 视频URL
  format?: VideoFormat;   // 视频格式：MP4, MOV, AVI 等
  duration?: number;      // 视频时长（秒）
  width?: number;         // 视频宽度（像素）
  height?: number;        // 视频高度（像素）
  size?: number;          // 文件大小（字节）
  thumbnailUrl?: string;  // 缩略图URL
  coverUrl?: string;      // 封面URL
}
```

### 语音消息

```typescript
interface AudioMediaResource {
  url: string;            // 音频URL
  format?: AudioFormat;   // 音频格式：MP3, AAC, WAV 等
  duration?: number;      // 音频时长（秒）
  size?: number;          // 文件大小（字节）
}
```

### 位置消息

```typescript
interface LocationContent {
  latitude: number;       // 纬度（-90 到 90）
  longitude: number;      // 经度（-180 到 180）
  address?: string;       // 地址描述
  name?: string;          // 地点名称
  thumbnailUrl?: string;  // 地图缩略图URL
}
```

### 名片消息

```typescript
interface CardContent {
  userId: string;         // 用户ID
  nickname?: string;      // 用户昵称
  avatar?: string;        // 用户头像URL
  signature?: string;     // 用户签名
}
```

### 卡片消息

用于发送各类卡片消息，支持小程序、应用、链接、文章、商品等。

```typescript
interface CardMediaResource {
  cardType: CardType;             // 卡片类型
  title: string;                  // 卡片标题
  description?: string;           // 卡片描述
  thumbnailUrl?: string;          // 卡片封面图片URL
  sourceName?: string;            // 卡片来源名称
  sourceIcon?: string;            // 卡片来源图标URL
  targetUrl?: string;             // 目标URL
  appId?: string;                 // 小程序appId
  appPath?: string;               // 小程序页面路径
  mainAction?: CardAction;        // 卡片主动作
  buttons?: CardButton[];         // 卡片按钮列表
  extraData?: Record<string, any>; // 卡片额外数据
  tag?: string;                   // 卡片标签
  status?: string;                // 卡片状态
}
```

**CardType 枚举值：**

| 类型 | 说明 |
|------|------|
| MINI_PROGRAM | 小程序卡片 |
| APP | 应用卡片 |
| LINK | 链接卡片 |
| ARTICLE | 文章卡片 |
| PRODUCT | 商品卡片 |
| ORDER | 订单卡片 |
| PAYMENT | 支付卡片 |
| INVITATION | 邀请卡片 |
| RED_PACKET | 红包卡片 |
| CUSTOM | 自定义卡片 |

**示例 - 小程序卡片：**

```json
{
  "type": "card",
  "content": {
    "cardResource": {
      "cardType": "MINI_PROGRAM",
      "title": "OpenChat小程序",
      "description": "一个现代化的即时通讯应用",
      "thumbnailUrl": "https://openchat.com/mini-cover.jpg",
      "appId": "wxabcdef1234567890",
      "appPath": "pages/index/index"
    }
  }
}
```

### 自定义消息

```typescript
interface CustomContent {
  customType: string;             // 自定义类型标识
  data?: Record<string, any>;     // 自定义数据
}
```

---

## 消息状态

| 状态 | 说明 | 触发时机 |
|------|------|----------|
| sending | 发送中 | 客户端开始发送消息 |
| sent | 已发送 | 服务器已接收消息 |
| delivered | 已送达 | 对方客户端已接收消息 |
| read | 已读 | 对方已阅读消息 |
| failed | 发送失败 | 消息发送过程中出错 |
| recalled | 已撤回 | 发送者撤回了消息 |

### 状态流转

```
sending → sent → delivered → read
    ↓
  failed
    
sent/recalled → recalled
```

---

## 消息流程

### 发送消息流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Server    │     │  WukongIM   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. 发送消息      │                   │
       │  (status=sending) │                   │
       │ ─────────────────>│                   │
       │                   │                   │
       │                   │  2. 存储消息      │
       │                   │ ─────────────────>│
       │                   │                   │
       │                   │  3. 推送给接收者  │
       │                   │ <─────────────────│
       │                   │                   │
       │  4. 返回结果      │                   │
       │  (status=sent)    │                   │
       │ <─────────────────│                   │
       │                   │                   │
```

### 接收消息流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Server    │     │  WukongIM   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │  1. 新消息通知    │
       │                   │ <─────────────────│
       │                   │                   │
       │  2. WebSocket推送 │                   │
       │ <─────────────────│                   │
       │                   │                   │
       │  3. 确认接收      │                   │
       │ ─────────────────>│                   │
       │                   │                   │
       │                   │  4. 更新状态      │
       │                   │ ─────────────────>│
       │                   │  (delivered)      │
       │                   │                   │
```

---

## 消息功能

### 消息撤回

- 支持撤回已发送的消息
- 通常有时间限制（如2分钟内）
- 撤回后消息状态变为 `recalled`
- 接收方会收到撤回通知

### 消息转发

- 支持转发消息给其他用户或群组
- 转发时会保留原消息内容
- `forwardFromId` 字段记录原消息ID

### 消息回复

- 支持回复特定消息
- `replyToId` 字段记录被回复的消息ID
- 客户端可展示回复关系

### 消息已读回执

- 支持已读回执功能
- `needReadReceipt` 控制是否需要回执
- 消息状态更新为 `read` 时触发回执

### 消息去重

- 客户端生成 `uuid` 用于去重
- 支持 `clientSeq` 序列号去重
- 服务器检测重复消息并返回已有消息

---

## 会话管理

### 会话模型

```typescript
interface Conversation {
  id: string;              // 会话ID
  type: ConversationType;  // 会话类型
  targetId: string;        // 目标ID（用户ID或群组ID）
  targetName: string;      // 目标名称
  targetAvatar?: string;   // 目标头像
  lastMessage?: Message;   // 最后一条消息
  unreadCount: number;     // 未读消息数
  isPinned: boolean;       // 是否置顶
  isMuted: boolean;        // 是否免打扰
  updatedAt: Date;         // 更新时间
}

type ConversationType = 'single' | 'group';
```

### 会话操作

- **获取会话列表** - 获取所有会话
- **置顶会话** - 将重要会话置顶显示
- **免打扰** - 关闭会话消息通知
- **删除会话** - 删除会话及本地消息
- **清空消息** - 清空会话中的消息

---

## 消息存储

### 本地存储

- 消息本地缓存，支持离线查看
- 支持消息搜索
- 支持消息分页加载

### 服务器存储

- 消息持久化存储
- 支持消息漫游
- 支持多端同步

### 消息同步

```
┌─────────────┐     ┌─────────────┐
│   Client    │     │   Server    │
└─────────────┘     └─────────────┘
       │                   │
       │  1. 请求同步      │
       │  (lastMessageSeq) │
       │ ─────────────────>│
       │                   │
       │  2. 返回新消息    │
       │ <─────────────────│
       │                   │
       │  3. 本地存储      │
       │                   │
```

---

## 消息安全

### 传输安全

- 所有消息通过 HTTPS/WSS 加密传输
- WebSocket 连接需要 JWT 认证

### 内容安全

- 敏感词过滤
- 图片内容审核
- 文件类型校验

### 权限控制

- 只能查看自己参与的消息
- 群消息需要群成员身份
- 黑名单用户无法发送消息

---

## 最佳实践

### 消息发送

1. **生成消息UUID** - 客户端生成唯一UUID用于去重
2. **设置消息类型** - 根据内容选择合适的消息类型
3. **填充消息内容** - 按照消息类型填充对应的内容结构
4. **处理发送结果** - 根据返回结果更新本地消息状态

### 消息接收

1. **监听WebSocket** - 接收实时消息推送
2. **处理消息通知** - 显示通知或更新UI
3. **更新已读状态** - 用户查看后标记已读

### 消息展示

1. **消息气泡** - 根据消息类型展示不同样式
2. **消息状态** - 显示发送中、已发送、已读等状态
3. **时间戳** - 合理展示消息时间
4. **消息分组** - 按日期或发送者分组

---

## 相关 API

- [消息管理 API](/zh/api/messages.md) - 消息发送、查询、撤回等接口
- [WukongIM 集成 API](/zh/api/wukongim.md) - 实时消息推送接口

## 相关概念

- [用户系统](./users.md) - 用户模型和认证
- [群组系统](./groups.md) - 群组管理和群消息
- [频道系统](./channels.md) - 消息频道和订阅
