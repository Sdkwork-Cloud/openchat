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

### 用户认证

```typescript
// 用户登录
const { token, user } = await client.auth.login({
  username: 'user@example.com',
  password: 'password'
});

// 设置 Token
client.setToken(token);

// 自动刷新 Token
client.auth.onTokenRefresh = (newToken) => {
  localStorage.setItem('token', newToken);
};
```

### 发送消息

```typescript
// 发送文本消息
const message = await client.message.send({
  to: 'user-id',
  type: 'text',
  content: 'Hello, OpenChat!'
});

// 发送图片消息
const message = await client.message.send({
  to: 'user-id',
  type: 'image',
  content: {
    url: 'https://example.com/image.jpg',
    width: 1920,
    height: 1080
  }
});
```

### 接收消息

```typescript
// 监听新消息
client.message.onMessage((message) => {
  console.log('收到新消息:', message);
});

// 监听消息状态变化
client.message.onStatusChange((messageId, status) => {
  console.log(`消息 ${messageId} 状态变为: ${status}`);
});
```

## 核心功能

### 用户管理

```typescript
// 获取当前用户信息
const user = await client.user.getCurrentUser();

// 更新用户信息
await client.user.update({
  nickname: '新昵称',
  avatar: 'https://example.com/avatar.jpg'
});

// 搜索用户
const users = await client.user.search('keyword');
```

### 好友管理

```typescript
// 获取好友列表
const friends = await client.friend.getList();

// 发送好友申请
await client.friend.sendRequest({
  toUserId: 'user-id',
  message: '你好，我想加你为好友'
});

// 处理好友申请
await client.friend.handleRequest({
  requestId: 'request-id',
  accept: true
});

// 删除好友
await client.friend.delete('friend-id');
```

### 群组管理

```typescript
// 创建群组
const group = await client.group.create({
  name: '开发团队',
  description: '技术交流群'
});

// 获取群组列表
const groups = await client.group.getList();

// 加入群组
await client.group.join('group-id');

// 邀请成员
await client.group.invite('group-id', ['user-id-1', 'user-id-2']);

// 发送群消息
await client.message.send({
  to: 'group-id',
  type: 'group',
  content: '大家好！'
});
```

### 消息管理

```typescript
// 获取会话列表
const conversations = await client.conversation.getList();

// 获取历史消息
const messages = await client.message.getHistory({
  conversationId: 'conv-id',
  limit: 20,
  before: lastMessageId
});

// 标记已读
await client.message.markAsRead('conversation-id');

// 撤回消息
await client.message.recall('message-id');
```

### 实时音视频

```typescript
// 创建房间
const room = await client.rtc.createRoom({
  type: 'p2p' // 或 'group'
});

// 加入房间
await client.rtc.joinRoom(room.id);

// 监听房间事件
client.rtc.onParticipantJoined((participant) => {
  console.log('用户加入:', participant);
});

// 离开房间
await client.rtc.leaveRoom(room.id);
```

### AI Bot

```typescript
// 获取 Bot 列表
const bots = await client.aiBot.getList();

// 向 Bot 发送消息
const response = await client.aiBot.sendMessage({
  botId: 'bot-id',
  message: '你好，请介绍一下自己'
});

// 监听 Bot 回复
client.aiBot.onMessage((message) => {
  console.log('Bot 回复:', message);
});
```

## 事件监听

```typescript
// 连接状态变化
client.onConnectionChange((status) => {
  console.log('连接状态:', status); // 'connected' | 'disconnected' | 'connecting'
});

// 错误处理
client.onError((error) => {
  console.error('客户端错误:', error);
});
```

## 配置选项

```typescript
interface OpenChatConfig {
  // 服务端地址
  serverUrl: string;
  
  // 悟空IM 配置
  imConfig: {
    tcpAddr: string;    // TCP 地址
    wsUrl: string;      // WebSocket 地址
  };
  
  // 可选配置
  options?: {
    // 自动重连
    autoReconnect?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    
    // 心跳配置
    heartbeatInterval?: number;
    
    // 消息配置
    messageCacheSize?: number;
    
    // 日志级别
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

## 类型定义

```typescript
// 用户
interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy';
}

// 消息
interface Message {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file';
  content: any;
  from: string;
  to: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

// 会话
interface Conversation {
  id: string;
  type: 'single' | 'group';
  targetId: string;
  targetName: string;
  lastMessage?: Message;
  unreadCount: number;
}

// 群组
interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  memberCount: number;
}
```

## 错误处理

```typescript
try {
  await client.message.send({
    to: 'user-id',
    type: 'text',
    content: 'Hello'
  });
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // 网络错误
  } else if (error.code === 'UNAUTHORIZED') {
    // 未授权，需要重新登录
  }
}
```

## 最佳实践

### 1. 初始化时机

建议在应用启动时初始化 SDK：

```typescript
// App.tsx
import { useEffect } from 'react';
import { client } from './openchat';

function App() {
  useEffect(() => {
    client.init().catch(console.error);
    
    return () => {
      client.destroy();
    };
  }, []);
  
  return <Router />;
}
```

### 2. 消息状态管理

使用状态管理库（如 Zustand、Redux）管理消息：

```typescript
import { create } from 'zustand';

const useMessageStore = create((set) => ({
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(m => 
      m.id === id ? { ...m, ...updates } : m
    )
  }))
}));

// 监听消息
client.message.onMessage((message) => {
  useMessageStore.getState().addMessage(message);
});
```

### 3. 离线消息处理

```typescript
// 应用启动时同步离线消息
async function syncOfflineMessages() {
  const conversations = await client.conversation.getList();
  
  for (const conversation of conversations) {
    const messages = await client.message.getHistory({
      conversationId: conversation.id,
      limit: 100
    });
    
    // 更新本地消息存储
    useMessageStore.getState().setMessages(conversation.id, messages);
  }
}
```

## 示例项目

- [React Chat App](https://github.com/openchat-team/openchat-react-example)
- [React Native Chat App](https://github.com/openchat-team/openchat-rn-example)
- [Vue Chat App](https://github.com/openchat-team/openchat-vue-example)

## API 参考

完整的 API 文档请参考 [API 文档](/api/)。
