# React PC 端应用

OpenChat React PC 端是一个基于 React + TypeScript + Tailwind CSS 开发的桌面聊天应用，提供完整的即时通讯功能。

## 功能特性

- 💬 **即时通讯** - 支持单聊、群聊、消息撤回、已读回执
- 🔊 **音视频通话** - 集成 RTC，支持高清音视频通话
- 📎 **文件传输** - 支持图片、文件、语音消息
- 🎨 **主题切换** - 支持亮色/暗色主题
- 🔔 **消息通知** - 桌面消息通知提醒
- 🔍 **全局搜索** - 支持搜索消息、联系人、群组

## 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| React | UI 框架 | ^18.0 |
| TypeScript | 开发语言 | ^5.0 |
| Tailwind CSS | CSS 框架 | ^3.0 |
| Zustand | 状态管理 | ^4.4 |
| React Query | 数据获取 | ^5.0 |
| React Router | 路由管理 | ^6.0 |
| Socket.io | 实时通信 | ^4.7 |

## 项目结构

```
app/openchat-react-pc/
├── src/
│   ├── components/          # 组件目录
│   │   ├── Chat/           # 聊天相关组件
│   │   ├── Contact/        # 联系人组件
│   │   ├── Group/          # 群组组件
│   │   ├── Message/        # 消息组件
│   │   └── UI/             # 通用 UI 组件
│   ├── hooks/              # 自定义 Hooks
│   ├── stores/             # 状态管理
│   ├── services/           # API 服务
│   ├── utils/              # 工具函数
│   ├── types/              # TypeScript 类型
│   └── App.tsx             # 应用入口
├── public/                 # 静态资源
└── package.json
```

## 快速开始

### 安装依赖

```bash
cd app/openchat-react-pc
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
# API 地址
VITE_API_URL=http://localhost:3000

# 悟空IM 配置
VITE_IM_TCP_ADDR=localhost:5100
VITE_IM_WS_URL=ws://localhost:5200

# RTC 配置
VITE_RTC_PROVIDER=volcengine
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

## 核心组件

### ChatContainer

聊天容器组件，包含消息列表和输入框：

```tsx
import { ChatContainer } from '@/components/Chat';

function ChatPage() {
  return (
    <ChatContainer
      conversationId="conv-123"
      targetUser={targetUser}
    />
  );
}
```

### MessageList

消息列表组件：

```tsx
import { MessageList } from '@/components/Message';

function ChatPage() {
  return (
    <MessageList
      messages={messages}
      currentUser={currentUser}
      onLoadMore={handleLoadMore}
    />
  );
}
```

### MessageInput

消息输入组件：

```tsx
import { MessageInput } from '@/components/Message';

function ChatPage() {
  return (
    <MessageInput
      onSend={handleSend}
      onUpload={handleUpload}
    />
  );
}
```

## 状态管理

使用 Zustand 管理应用状态：

```typescript
// stores/userStore.ts
import { create } from 'zustand';

interface UserState {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: null }),
}));
```

## 自定义 Hooks

### useChat

聊天相关功能 Hook：

```typescript
import { useChat } from '@/hooks/useChat';

function ChatPage() {
  const {
    messages,
    sendMessage,
    recallMessage,
    loadMoreMessages,
  } = useChat(conversationId);
  
  // ...
}
```

### useRTC

音视频通话 Hook：

```typescript
import { useRTC } from '@/hooks/useRTC';

function CallButton() {
  const { startCall, endCall, isInCall } = useRTC();
  
  return (
    <button onClick={() => startCall(userId)}>
      {isInCall ? '结束通话' : '开始通话'}
    </button>
  );
}
```

## 主题定制

### 修改主题色

编辑 `tailwind.config.js`：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
      },
    },
  },
};
```

### 切换主题

```typescript
import { useTheme } from '@/hooks/useTheme';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

## 部署

### 静态部署

```bash
npm run build
# 将 dist 目录部署到 CDN 或静态服务器
```

### Docker 部署

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

## 常见问题

### 跨域问题

在开发环境中，配置 vite.config.ts：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### 消息通知

确保请求通知权限：

```typescript
if ('Notification' in window) {
  Notification.requestPermission();
}
```

## 更多资源

- [设计稿 (Figma)](https://figma.com/openchat-design)
- [组件文档 Storybook](https://storybook.openchat.dev)
