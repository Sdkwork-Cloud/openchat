# SDK 文档

OpenChat 提供多语言 SDK，帮助开发者快速集成即时通讯功能。

## SDK 列表

| SDK | 平台 | 状态 | 说明 |
|-----|------|------|------|
| [TypeScript SDK](./typescript.md) | Web / Node.js | ✅ 稳定 | 支持 React、Vue、Angular 等框架 |
| [Java SDK](./java.md) | Android / JVM | 🚧 开发中 | 支持 Android 和 Java 后端 |
| [Go SDK](./go.md) | Go | 🚧 开发中 | 支持 Go 后端服务 |
| [Python SDK](./python.md) | Python | 🚧 开发中 | 支持 Python 后端和脚本 |

## 快速开始

### TypeScript SDK

```bash
npm install @openchat/sdk
```

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000',
  imConfig: {
    wsUrl: 'ws://localhost:5200'
  }
});

// 初始化
await client.init();

// 登录
await client.auth.login({
  username: 'user',
  password: 'password'
});

// 发送消息
await client.message.send({
  to: 'user-uuid',
  type: 'text',
  content: { text: 'Hello!' }
});
```

## 核心功能

### 消息功能

- 发送/接收消息
- 消息撤回
- 消息转发
- 已读回执
- 历史消息查询

### 用户功能

- 用户注册/登录
- 用户信息管理
- 在线状态
- 用户搜索

### 群组功能

- 创建/解散群组
- 群成员管理
- 群消息
- 群公告

### 好友功能

- 好友申请
- 好友列表
- 好友分组
- 黑名单

## 消息类型

SDK 支持多种消息类型：

| 类型 | 说明 |
|------|------|
| text | 文本消息 |
| image | 图片消息 |
| audio | 语音消息 |
| video | 视频消息 |
| file | 文件消息 |
| music | 音乐消息 |
| document | 文档消息 |
| code | 代码消息 |
| location | 位置消息 |
| card | 名片消息 |
| custom | 自定义消息 |

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌─────────────┬─────────────┬─────────────┬──────────────┐ │
│  │   React     │   Vue.js    │   Angular   │   Node.js    │ │
│  └──────┬──────┴──────┬──────┴──────┬──────┴───────┬───────┘ │
│         │             │             │              │         │
│         └─────────────┴─────────────┴──────────────┘         │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    OpenChat SDK                          ││
│  │  ┌──────────┬──────────┬──────────┬──────────┬────────┐ ││
│  │  │   Auth   │  Message │   User   │  Group   │ Friend │ ││
│  │  └──────────┴──────────┴──────────┴──────────┴────────┘ ││
│  │  ┌──────────┬──────────┬──────────┬──────────────────┐  ││
│  │  │   RTC    │  AI Bot  │  Event   │    Connection    │  ││
│  │  └──────────┴──────────┴──────────┴──────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Transport Layer                        ││
│  │         HTTP / WebSocket / TCP (WukongIM)                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 配置选项

```typescript
interface OpenChatConfig {
  serverUrl: string;           // 服务端地址
  imConfig: {
    tcpAddr?: string;          // TCP 地址（移动端）
    wsUrl: string;             // WebSocket 地址（Web端）
  };
  options?: {
    autoReconnect?: boolean;   // 自动重连
    reconnectAttempts?: number;// 重连次数
    reconnectInterval?: number;// 重连间隔
    heartbeatInterval?: number;// 心跳间隔
    messageCacheSize?: number; // 消息缓存大小
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

## 事件系统

```typescript
// 连接状态
client.onConnectionChange((status) => {
  console.log('连接状态:', status);
});

// 新消息
client.message.onMessage((message) => {
  console.log('收到消息:', message);
});

// 消息状态变化
client.message.onStatusChange((messageId, status) => {
  console.log('消息状态:', status);
});

// 错误处理
client.onError((error) => {
  console.error('错误:', error);
});
```

## 错误处理

```typescript
try {
  await client.message.send({
    to: 'user-uuid',
    type: 'text',
    content: { text: 'Hello' }
  });
} catch (error) {
  switch (error.code) {
    case 'NETWORK_ERROR':
      // 网络错误
      break;
    case 'UNAUTHORIZED':
      // 未授权
      break;
    case 'RATE_LIMIT_EXCEEDED':
      // 频率限制
      break;
  }
}
```

## 最佳实践

### 1. 单例模式

```typescript
// openchat.ts
import { OpenChatClient } from '@openchat/sdk';

export const client = new OpenChatClient({
  serverUrl: import.meta.env.VITE_SERVER_URL,
  imConfig: {
    wsUrl: import.meta.env.VITE_WS_URL
  }
});
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
    client.init().then(() => setIsConnected(true));
    return () => client.destroy();
  }, []);

  return { client, isConnected, user };
}
```

### 3. 状态管理

```typescript
// stores/messageStore.ts
import { create } from 'zustand';
import { client } from '../openchat';

export const useMessageStore = create((set) => ({
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  }))
}));

// 监听消息
client.message.onMessage((message) => {
  useMessageStore.getState().addMessage(message);
});
```

## 相关链接

- [API 文档](../api/) - 完整的 API 文档
- [部署指南](../deploy/) - 服务端部署
- [配置说明](../config/) - 服务端配置
