# TypeScript SDK

OpenChat TypeScript SDK 提供了完整的即时通讯客户端能力，支持 Web、React Native、小程序等多平台。

## 安装

```bash
npm install @openchat/sdk
# 或
yarn add @openchat/sdk
# 或
pnpm add @openchat/sdk
```

## 系统要求

| 环境 | 版本要求 |
|------|----------|
| Node.js | 16.x+ |
| TypeScript | 4.5+ |
| 浏览器 | Chrome 80+, Firefox 75+, Safari 14+, Edge 80+ |

## 快速开始

### 初始化客户端

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000',
  imConfig: {
    tcpAddr: 'localhost:5100',
    wsUrl: 'ws://localhost:5200'
  }
});

// 初始化并连接
await client.init();
```

### 完整配置示例

```typescript
import { OpenChatClient, LogLevel } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000',
  imConfig: {
    tcpAddr: 'localhost:5100',
    wsUrl: 'ws://localhost:5200'
  },
  options: {
    autoReconnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    messageCacheSize: 1000,
    logLevel: LogLevel.INFO
  }
});
```

---

## 认证模块

### 用户登录

```typescript
// 用户名密码登录
const { accessToken, refreshToken, user } = await client.auth.login({
  username: 'johndoe',
  password: 'password123'
});

// 存储 Token
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### Token 管理

```typescript
// 设置 Token
client.setToken(accessToken);

// 刷新 Token
const { accessToken: newToken } = await client.auth.refreshToken(refreshToken);

// 监听 Token 刷新
client.auth.onTokenRefresh((newToken) => {
  localStorage.setItem('accessToken', newToken);
});

// 登出
await client.auth.logout();
```

### 获取当前用户

```typescript
const user = await client.auth.getCurrentUser();
console.log('当前用户:', user);
```

---

## 消息模块

### 发送消息

```typescript
// 发送文本消息（单聊）
const textMessage = await client.message.send({
  type: 'text',
  content: {
    text: 'Hello, OpenChat!',
    mentions: ['user1', 'user2']  // 可选，@提及
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送图片消息
const imageMessage = await client.message.send({
  type: 'image',
  content: {
    url: 'https://example.com/image.jpg',
    format: 'JPEG',
    width: 1920,
    height: 1080,
    size: 512000,
    thumbnailUrl: 'https://example.com/thumb.jpg'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送语音消息
const audioMessage = await client.message.send({
  type: 'audio',
  content: {
    url: 'https://example.com/voice.mp3',
    format: 'MP3',
    duration: 30,
    size: 102400
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送视频消息
const videoMessage = await client.message.send({
  type: 'video',
  content: {
    url: 'https://example.com/video.mp4',
    format: 'MP4',
    duration: 120,
    width: 1920,
    height: 1080,
    size: 10240000,
    thumbnailUrl: 'https://example.com/thumb.jpg'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送音乐消息
const musicMessage = await client.message.send({
  type: 'music',
  content: {
    url: 'https://example.com/music.mp3',
    title: '歌曲名',
    artist: '艺术家',
    album: '专辑',
    duration: 180,
    coverUrl: 'https://example.com/cover.jpg'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送文件消息
const fileMessage = await client.message.send({
  type: 'file',
  content: {
    name: 'document.pdf',
    url: 'https://example.com/file.pdf',
    size: 1024000,
    mimeType: 'application/pdf'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送文档消息
const documentMessage = await client.message.send({
  type: 'document',
  content: {
    url: 'https://example.com/document.pdf',
    format: 'PDF',
    title: '文档标题',
    pageCount: 10,
    author: '作者'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送代码消息
const codeMessage = await client.message.send({
  type: 'code',
  content: {
    language: 'TYPESCRIPT',
    code: "const hello = 'world';",
    lineCount: 1
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送位置消息
const locationMessage = await client.message.send({
  type: 'location',
  content: {
    latitude: 39.9042,
    longitude: 116.4074,
    address: '北京市东城区',
    name: '天安门'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送名片消息
const cardMessage = await client.message.send({
  type: 'card',
  content: {
    userId: 'target-user-uuid',
    nickname: '用户昵称',
    avatar: 'https://example.com/avatar.jpg'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送自定义消息
const customMessage = await client.message.send({
  type: 'custom',
  content: {
    customType: 'order',
    data: {
      orderId: '12345',
      amount: 99.99
    }
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// 发送群消息
const groupMessage = await client.message.send({
  type: 'text',
  content: {
    text: '大家好！'
  },
  fromUserId: 'sender-uuid',
  groupId: 'group-uuid'
});

// 回复消息
const replyMessage = await client.message.send({
  type: 'text',
  content: {
    text: '我同意你的观点'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid',
  replyToId: 'original-message-id'
});

// 带去重的消息发送
const dedupMessage = await client.message.send({
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  type: 'text',
  content: {
    text: 'Hello'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid',
  clientSeq: 12345
});
```

### 接收消息

```typescript
// 监听新消息
client.message.onMessage((message) => {
  console.log('收到新消息:', message);
  
  // 根据消息类型处理
  switch (message.type) {
    case 'text':
      console.log('文本消息:', message.content);
      break;
    case 'image':
      console.log('图片消息:', message.content.url);
      break;
    // ...
  }
});

// 监听消息状态变化
client.message.onStatusChange((messageId, status) => {
  console.log(`消息 ${messageId} 状态: ${status}`);
  // status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
});
```

### 获取历史消息

```typescript
// 获取会话消息
const messages = await client.message.getHistory({
  conversationId: 'conv-uuid',
  limit: 20
});

// 分页加载
const moreMessages = await client.message.getHistory({
  conversationId: 'conv-uuid',
  limit: 20,
  before: messages[0].id  // 获取更早的消息
});
```

### 消息操作

```typescript
// 标记已读
await client.message.markAsRead('conversation-id');

// 撤回消息（2分钟内）
await client.message.recall('message-id');

// 删除消息
await client.message.delete('message-id');

// 转发消息
await client.message.forward('message-id', [
  { id: 'user-uuid', type: 'single' },
  { id: 'group-uuid', type: 'group' }
]);
```

---

## 会话模块

### 获取会话列表

```typescript
const conversations = await client.conversation.getList({
  page: 1,
  limit: 20
});

conversations.forEach(conv => {
  console.log(`${conv.targetName}: ${conv.lastMessage?.content}`);
  console.log(`未读: ${conv.unreadCount}`);
});
```

### 会话操作

```typescript
// 置顶会话
await client.conversation.pin('conversation-id');

// 取消置顶
await client.conversation.unpin('conversation-id');

// 设置免打扰
await client.conversation.mute('conversation-id');

// 删除会话
await client.conversation.delete('conversation-id');

// 清空会话消息
await client.conversation.clearMessages('conversation-id');
```

---

## 用户模块

### 用户信息

```typescript
// 获取当前用户
const user = await client.user.getCurrentUser();

// 获取指定用户
const otherUser = await client.user.getById('user-uuid');

// 更新用户信息
await client.user.update({
  nickname: '新昵称',
  avatar: 'https://example.com/avatar.jpg',
  signature: '个性签名'
});

// 上传头像
const { avatar } = await client.user.uploadAvatar(file);
```

### 用户搜索

```typescript
const users = await client.user.search('keyword', {
  page: 1,
  limit: 20
});
```

### 在线状态

```typescript
// 设置在线状态
await client.user.setStatus('online');  // 'online' | 'offline' | 'busy' | 'away'

// 获取用户在线状态
const status = await client.user.getStatus('user-uuid');
```

---

## 好友模块

### 好友申请

```typescript
// 发送好友申请
await client.friend.sendRequest({
  userId: 'user-uuid',
  message: '你好，我想加你为好友'
});

// 获取好友申请列表
const requests = await client.friend.getRequests({
  type: 'received',  // 'received' | 'sent'
  status: 'pending'  // 'pending' | 'accepted' | 'rejected'
});

// 接受好友申请
await client.friend.handleRequest('request-id', {
  action: 'accept',
  remark: '备注名'
});

// 拒绝好友申请
await client.friend.handleRequest('request-id', {
  action: 'reject'
});
```

### 好友管理

```typescript
// 获取好友列表
const friends = await client.friend.getList();

// 设置好友备注
await client.friend.setRemark('friend-uuid', '新备注');

// 设置好友分组
await client.friend.setGroup('friend-uuid', 'group-uuid');

// 删除好友
await client.friend.delete('friend-uuid');
```

### 好友分组

```typescript
// 获取分组列表
const groups = await client.friend.getGroups();

// 创建分组
await client.friend.createGroup({ name: '同事' });

// 更新分组
await client.friend.updateGroup('group-uuid', { name: '新名称' });

// 删除分组
await client.friend.deleteGroup('group-uuid');
```

---

## 群组模块

### 创建群组

```typescript
const group = await client.group.create({
  name: '技术交流群',
  avatar: 'https://example.com/group.jpg',
  description: '技术爱好者交流群',
  memberIds: ['user1', 'user2']
});
```

### 群组信息

```typescript
// 获取群组信息
const group = await client.group.getById('group-uuid');

// 获取我的群组列表
const groups = await client.group.getMyGroups();

// 更新群组信息
await client.group.update('group-uuid', {
  name: '新群名',
  notice: '群公告内容'
});
```

### 群成员管理

```typescript
// 获取群成员列表
const members = await client.group.getMembers('group-uuid');

// 添加群成员
await client.group.addMembers('group-uuid', ['user1', 'user2']);

// 移除群成员
await client.group.removeMember('group-uuid', 'user-uuid');

// 退出群组
await client.group.quit('group-uuid');

// 解散群组（仅群主）
await client.group.dismiss('group-uuid');
```

### 群组权限

```typescript
// 设置管理员
await client.group.setAdmin('group-uuid', 'user-uuid', true);

// 取消管理员
await client.group.setAdmin('group-uuid', 'user-uuid', false);

// 转让群主
await client.group.transferOwner('group-uuid', 'new-owner-uuid');

// 禁言成员
await client.group.muteMember('group-uuid', 'user-uuid', 3600); // 禁言1小时

// 解除禁言
await client.group.unmuteMember('group-uuid', 'user-uuid');

// 全员禁言
await client.group.muteAll('group-uuid', true);
```

---

## 实时音视频模块

### 创建房间

```typescript
// 创建 P2P 通话房间
const room = await client.rtc.createRoom({
  type: 'p2p',
  userId: 'callee-uuid'
});

// 创建群组通话房间
const groupRoom = await client.rtc.createRoom({
  type: 'group',
  groupId: 'group-uuid'
});
```

### 加入/离开房间

```typescript
// 加入房间
await client.rtc.joinRoom(room.id);

// 离开房间
await client.rtc.leaveRoom(room.id);
```

### 音视频控制

```typescript
// 开启/关闭摄像头
await client.rtc.enableCamera(true);
await client.rtc.enableCamera(false);

// 开启/关闭麦克风
await client.rtc.enableMicrophone(true);
await client.rtc.enableMicrophone(false);

// 切换前后摄像头
await client.rtc.switchCamera();

// 开启屏幕共享
await client.rtc.startScreenShare();

// 停止屏幕共享
await client.rtc.stopScreenShare();
```

### 事件监听

```typescript
// 用户加入
client.rtc.onParticipantJoined((participant) => {
  console.log('用户加入:', participant);
});

// 用户离开
client.rtc.onParticipantLeft((participant) => {
  console.log('用户离开:', participant);
});

// 用户开启/关闭摄像头
client.rtc.onCameraStateChanged((userId, enabled) => {
  console.log(`用户 ${userId} 摄像头: ${enabled ? '开启' : '关闭'}`);
});

// 用户开启/关闭麦克风
client.rtc.onMicrophoneStateChanged((userId, enabled) => {
  console.log(`用户 ${userId} 麦克风: ${enabled ? '开启' : '关闭'}`);
});
```

---

## AI Bot 模块

```typescript
// 获取 Bot 列表
const bots = await client.aiBot.getList();

// 向 Bot 发送消息
const response = await client.aiBot.sendMessage({
  botId: 'bot-uuid',
  message: '你好，请介绍一下自己'
});

// 监听 Bot 回复
client.aiBot.onMessage((message) => {
  console.log('Bot 回复:', message);
});
```

---

## 事件监听

### 连接状态

```typescript
client.onConnectionChange((status) => {
  console.log('连接状态:', status);
  // 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
});
```

### 错误处理

```typescript
client.onError((error) => {
  console.error('错误:', error.code, error.message);
  
  switch (error.code) {
    case 'NETWORK_ERROR':
      // 网络错误
      break;
    case 'UNAUTHORIZED':
      // 未授权，需要重新登录
      break;
    case 'TOKEN_EXPIRED':
      // Token 过期，需要刷新
      break;
    case 'RATE_LIMIT_EXCEEDED':
      // 请求频率超限
      break;
  }
});
```

### 其他事件

```typescript
// 被踢下线
client.onKicked((reason) => {
  console.log('被踢下线:', reason);
});

// 在其他设备登录
client.onMultiDeviceLogin((device) => {
  console.log('其他设备登录:', device);
});
```

---

## 配置选项

```typescript
interface OpenChatConfig {
  // 服务端地址（必填）
  serverUrl: string;
  
  // WukongIM 配置（必填）
  imConfig: {
    tcpAddr: string;    // TCP 地址
    wsUrl: string;      // WebSocket 地址
  };
  
  // 可选配置
  options?: {
    // 自动重连
    autoReconnect?: boolean;        // 默认 true
    reconnectAttempts?: number;     // 默认 5
    reconnectInterval?: number;     // 默认 3000ms
    
    // 心跳配置
    heartbeatInterval?: number;     // 默认 30000ms
    
    // 消息配置
    messageCacheSize?: number;      // 默认 1000
    
    // 日志级别
    logLevel?: 'debug' | 'info' | 'warn' | 'error';  // 默认 'info'
  };
}
```

---

## 类型定义

### 用户类型

```typescript
interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  phone?: string;
  gender?: number;
  signature?: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  lastSeenAt?: string;
  createdAt: string;
}

type UserStatus = 'online' | 'offline' | 'busy' | 'away';
```

### 消息类型

```typescript
interface Message {
  id: string;
  uuid?: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  type: MessageType;
  content: MessageContent;
  status: MessageStatus;
  timestamp: number;
  replyToId?: string;
  forwardFromId?: string;
  clientSeq?: number;
  extra?: Record<string, any>;
  needReadReceipt?: boolean;
  createdAt: string;
}

type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'music' | 'document' | 'code' | 'location' | 'card' | 'custom' | 'system';
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'recalled';
```

### 发送消息参数

```typescript
interface SendMessageOptions {
  uuid?: string;                    // 消息UUID（客户端生成，用于去重）
  type: MessageType;                // 消息类型
  content: MessageContent;          // 消息内容
  fromUserId: string;               // 发送者用户ID
  toUserId?: string;                // 接收者用户ID（单聊时必填）
  groupId?: string;                 // 群组ID（群聊时必填）
  replyToId?: string;               // 回复的消息ID
  forwardFromId?: string;           // 转发来源消息ID
  clientSeq?: number;               // 客户端序列号（用于去重）
  extra?: Record<string, any>;      // 扩展数据
  needReadReceipt?: boolean;        // 是否需要已读回执，默认true
}
```

### 会话类型

```typescript
interface Conversation {
  id: string;
  type: 'single' | 'group';
  targetId: string;
  targetName: string;
  targetAvatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  updatedAt: string;
}
```

### 群组类型

```typescript
interface Group {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  joinType: 0 | 1 | 2;
  muteAll: boolean;
  notice?: string;
  myRole: 0 | 1 | 2;
  createdAt: string;
}
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| `NETWORK_ERROR` | 网络错误 |
| `UNAUTHORIZED` | 未授权 |
| `TOKEN_EXPIRED` | Token 过期 |
| `FORBIDDEN` | 权限不足 |
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | 参数验证失败 |
| `RATE_LIMIT_EXCEEDED` | 请求频率超限 |
| `USER_NOT_FOUND` | 用户不存在 |
| `GROUP_NOT_FOUND` | 群组不存在 |
| `NOT_GROUP_MEMBER` | 不是群组成员 |
| `ALREADY_FRIENDS` | 已经是好友 |
| `MESSAGE_RECALL_TIMEOUT` | 消息撤回超时 |

---

## 最佳实践

### 1. 单例模式

```typescript
// openchat.ts
import { OpenChatClient } from '@openchat/sdk';

export const client = new OpenChatClient({
  serverUrl: import.meta.env.VITE_SERVER_URL,
  imConfig: {
    tcpAddr: import.meta.env.VITE_IM_TCP,
    wsUrl: import.meta.env.VITE_IM_WS
  }
});

// 在其他文件中导入使用
import { client } from './openchat';
```

### 2. React 集成

```typescript
// hooks/useOpenChat.ts
import { useEffect, useState } from 'react';
import { client } from '../openchat';

export function useOpenChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    client.init().then(() => {
      setIsConnected(true);
      setUser(client.auth.getCurrentUser());
    });

    client.onConnectionChange(setIsConnected);

    return () => client.destroy();
  }, []);

  return { client, isConnected, user };
}
```

### 3. 消息状态管理

```typescript
// stores/messageStore.ts
import { create } from 'zustand';
import { client } from '../openchat';

interface MessageStore {
  messages: Map<string, Message[]>;
  addMessage: (conversationId: string, message: Message) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: new Map(),
  addMessage: (conversationId, message) => set((state) => {
    const messages = new Map(state.messages);
    const convMessages = messages.get(conversationId) || [];
    messages.set(conversationId, [...convMessages, message]);
    return { messages };
  })
}));

// 监听消息
client.message.onMessage((message) => {
  const conversationId = message.channelType === 1 
    ? [message.from, message.to].sort().join('_')
    : message.to;
  useMessageStore.getState().addMessage(conversationId, message);
});
```

---

## 示例项目

- [React Chat App](https://github.com/Sdkwork-Cloud/openchat-react-example)
- [React Native Chat App](https://github.com/Sdkwork-Cloud/openchat-rn-example)
- [Vue Chat App](https://github.com/Sdkwork-Cloud/openchat-vue-example)

---

## API 参考

完整的 API 文档请参考 [API 文档](/zh/api/)。
