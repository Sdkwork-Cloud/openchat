# React PC App

OpenChat React PC is a desktop chat application built with React + TypeScript + Tailwind CSS, providing complete instant messaging features.

## Features

- 💬 **Instant Messaging** - Private chat, group chat, message recall, read receipts
- 🔊 **Audio/Video Calls** - Integrated RTC for HD calls
- 📎 **File Transfer** - Images, files, voice messages
- 🎨 **Theme Switching** - Light/Dark theme support
- 🔔 **Notifications** - Desktop message notifications
- 🔍 **Global Search** - Search messages, contacts, groups

## Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | ^18.0 |
| TypeScript | Language | ^5.0 |
| Tailwind CSS | CSS Framework | ^3.0 |
| Zustand | State Management | ^4.4 |
| React Query | Data Fetching | ^5.0 |
| React Router | Routing | ^6.0 |
| Socket.io | Real-time | ^4.7 |

## Project Structure

```
app/openchat-react-pc/
├── src/
│   ├── components/          # Components
│   │   ├── Chat/           # Chat components
│   │   ├── Contact/        # Contact components
│   │   ├── Group/          # Group components
│   │   ├── Message/        # Message components
│   │   └── UI/             # Common UI components
│   ├── hooks/              # Custom Hooks
│   ├── stores/             # State management
│   ├── services/           # API services
│   ├── utils/              # Utilities
│   ├── types/              # TypeScript types
│   └── App.tsx             # App entry
├── public/                 # Static assets
└── package.json
```

## Quick Start

### Install Dependencies

```bash
cd app/openchat-react-pc
pnpm install
```

### Configure Environment

Create `.env.local` file:

```env
# API URL
VITE_API_URL=http://localhost:3000

# WuKongIM Config
VITE_IM_TCP_ADDR=localhost:5100
VITE_IM_WS_URL=ws://localhost:5200

# RTC Config
VITE_RTC_PROVIDER=volcengine
```

### Start Dev Server

```bash
pnpm dev
```

Visit http://localhost:5173

### Build for Production

```bash
pnpm build
```

## Core Components

### ChatContainer

Chat container component with message list and input:

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

Message list component:

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

Message input component:

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

## State Management

Using Zustand for state management:

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

## Custom Hooks

### useChat

Chat functionality hook:

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

Audio/video call hook:

```typescript
import { useRTC } from '@/hooks/useRTC';

function CallButton() {
  const { startCall, endCall, isInCall } = useRTC();
  
  return (
    <button onClick={() => startCall(userId)}>
      {isInCall ? 'End Call' : 'Start Call'}
    </button>
  );
}
```

## Theme Customization

### Modify Theme Color

Edit `tailwind.config.js`:

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

### Toggle Theme

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

## Deployment

### Static Deployment

```bash
pnpm build
# Deploy dist directory to CDN or static server
```

### Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

## Common Issues

### CORS Issues

Configure vite.config.ts in development:

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

### Notifications

Request notification permission:

```typescript
if ('Notification' in window) {
  Notification.requestPermission();
}
```

## More Resources

- [Design (Figma)](https://figma.com/openchat-design)
- [Components (Storybook)](https://storybook.openchat.dev)
