# TypeScript SDK

OpenChat TypeScript SDK provides complete instant messaging client capabilities, supporting Web, React Native, and mini-programs.

## Installation

```bash
npm install @openchat/sdk
# or
yarn add @openchat/sdk
# or
pnpm add @openchat/sdk
```

## Requirements

| Environment | Version |
|-------------|---------|
| Node.js | 16.x+ |
| TypeScript | 4.5+ |
| Browser | Chrome 80+, Firefox 75+, Safari 14+, Edge 80+ |

## Quick Start

### Initialize Client

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000',
  imConfig: {
    tcpAddr: 'localhost:5100',
    wsUrl: 'ws://localhost:5200'
  }
});

// Initialize and connect
await client.init();
```

### Authentication

```typescript
// Login
const { accessToken, refreshToken, user } = await client.auth.login({
  username: 'johndoe',
  password: 'password123'
});

// Store Token
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Set Token
client.setToken(accessToken);

// Refresh Token
const { accessToken: newToken } = await client.auth.refreshToken(refreshToken);

// Logout
await client.auth.logout();
```

---

## Message Module

### Send Messages

```typescript
// Send text message (direct message)
const textMessage = await client.message.send({
  type: 'text',
  content: {
    text: 'Hello, OpenChat!',
    mentions: ['user1', 'user2']  // Optional, @mentions
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// Send image message
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

// Send video message
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

// Send audio message
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

// Send music message
const musicMessage = await client.message.send({
  type: 'music',
  content: {
    url: 'https://example.com/music.mp3',
    title: 'Song Title',
    artist: 'Artist',
    album: 'Album',
    duration: 180,
    coverUrl: 'https://example.com/cover.jpg'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// Send file message
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

// Send document message
const documentMessage = await client.message.send({
  type: 'document',
  content: {
    url: 'https://example.com/document.pdf',
    format: 'PDF',
    title: 'Document Title',
    pageCount: 10,
    author: 'Author'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// Send code message
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

// Send location message
const locationMessage = await client.message.send({
  type: 'location',
  content: {
    latitude: 39.9042,
    longitude: 116.4074,
    address: 'Beijing, China',
    name: 'Tiananmen Square'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// Send contact card message
const cardMessage = await client.message.send({
  type: 'card',
  content: {
    userId: 'target-user-uuid',
    nickname: 'User Nickname',
    avatar: 'https://example.com/avatar.jpg'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// Send custom message
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

// Send group message
const groupMessage = await client.message.send({
  type: 'text',
  content: {
    text: 'Hello everyone!'
  },
  fromUserId: 'sender-uuid',
  groupId: 'group-uuid'
});

// Reply to message
const replyMessage = await client.message.send({
  type: 'text',
  content: {
    text: 'I agree with you'
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid',
  replyToId: 'original-message-id'
});

// Send message with deduplication
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

### Receive Messages

```typescript
// Listen for new messages
client.message.onMessage((message) => {
  console.log('New message:', message);
  
  switch (message.type) {
    case 'text':
      console.log('Text:', message.content.text);
      break;
    case 'image':
      console.log('Image:', message.content.url);
      break;
  }
});

// Listen for message status changes
client.message.onStatusChange((messageId, status) => {
  console.log(`Message ${messageId} status: ${status}`);
});
```

### Event Deduplication and State Merge (Recommended)

In production, handle HTTP send responses and WS outbound events with one reducer:
- Deduplicate by `eventId` first (replay/reconnect/retry safety)
- For repeated updates of the same message, apply the max `stateVersion` only (no downgrade on out-of-order events)
- Equivalent reference logic is available in server repo: `src/modules/message/message-event-reducer.util.ts`.
- The reference utility also supports `applyMany` and `exportSnapshot`/`importSnapshot` for persistence and rehydration.
- Unified event envelope generation reference: `src/modules/message/message-event-envelope.util.ts`.
- End-to-end pipeline reference: `src/modules/message/message-event-pipeline.util.ts` (envelope + reducer + snapshot lifecycle).

```typescript
type MessageEvent = {
  eventId: string;
  eventType: string;
  occurredAt: number;
  stateVersion?: number;
  serverMessageId?: string;
  messageId?: string;
  clientMessageId?: string;
  status?: string;
  content?: unknown;
};

type MessageView = {
  messageId: string;
  stateVersion: number;
  status?: string;
  content?: unknown;
  updatedAt: number;
};

const DEFAULT_STATE_VERSION = -9999;

function resolveMessageKey(event: MessageEvent): string | undefined {
  return event.serverMessageId || event.messageId || event.clientMessageId;
}

class MessageEventReducer {
  private dedup = new Set<string>();
  private store = new Map<string, MessageView>();

  apply(event: MessageEvent): { applied: boolean; snapshot?: MessageView } {
    if (!event.eventId || this.dedup.has(event.eventId)) {
      return { applied: false };
    }
    this.dedup.add(event.eventId);

    const key = resolveMessageKey(event);
    if (!key) {
      return { applied: false };
    }

    const incomingVersion = Number.isFinite(event.stateVersion)
      ? (event.stateVersion as number)
      : DEFAULT_STATE_VERSION;
    const prev = this.store.get(key);
    const prevVersion = prev?.stateVersion ?? DEFAULT_STATE_VERSION;

    if (prev && incomingVersion < prevVersion) {
      return { applied: false, snapshot: prev };
    }

    const next: MessageView = {
      messageId: key,
      stateVersion: Math.max(prevVersion, incomingVersion),
      status: event.status ?? prev?.status,
      content: event.content ?? prev?.content,
      updatedAt: event.occurredAt || Date.now(),
    };
    this.store.set(key, next);
    return { applied: true, snapshot: next };
  }

  get(messageId: string): MessageView | undefined {
    return this.store.get(messageId);
  }
}

const reducer = new MessageEventReducer();

// 1) Handle HTTP send response (messageSent/messageFailed)
const sendResp = await client.message.send({
  type: 'text',
  content: { text: 'hello' },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid',
});
reducer.apply(sendResp as MessageEvent);

// 2) Handle WS events (newMessage/messageAcknowledged/...)
client.on('messageAcknowledged', (evt: MessageEvent) => {
  const { applied, snapshot } = reducer.apply(evt);
  if (applied && snapshot) {
    renderMessage(snapshot);
  }
});
```

### Message Operations

```typescript
// Mark as read
await client.message.markAsRead('conversation-id');

// Recall message (within 2 minutes)
await client.message.recall('message-id');

// Delete message
await client.message.delete('message-id');

// Forward message
await client.message.forward('message-id', [
  { id: 'user-uuid', type: 'single' },
  { id: 'group-uuid', type: 'group' }
]);
```

---

## User Module

```typescript
// Get current user
const user = await client.user.getCurrentUser();

// Get specific user
const otherUser = await client.user.getById('user-uuid');

// Update user info
await client.user.update({
  nickname: 'New Nickname',
  avatar: 'https://example.com/avatar.jpg',
  signature: 'New signature'
});

// Search users
const users = await client.user.search('keyword', { page: 1, limit: 20 });

// Set online status
await client.user.setStatus('online');  // 'online' | 'offline' | 'busy' | 'away'
```

---

## Friend Module

```typescript
// Send friend request
await client.friend.sendRequest({
  userId: 'user-uuid',
  message: 'Hello, I want to add you as a friend'
});

// Get friend requests
const requests = await client.friend.getRequests({ status: 'pending' });

// Accept friend request
await client.friend.handleRequest('request-id', {
  action: 'accept',
  remark: 'Friend alias'
});

// Get friend list
const friends = await client.friend.getList();

// Set friend remark
await client.friend.setRemark('friend-uuid', 'New remark');

// Delete friend
await client.friend.delete('friend-uuid');
```

---

## Group Module

```typescript
// Create group
const group = await client.group.create({
  name: 'Tech Discussion',
  memberIds: ['user1', 'user2']
});

// Get my groups
const groups = await client.group.getMyGroups();

// Get group info
const groupInfo = await client.group.getById('group-uuid');

// Add members
await client.group.addMembers('group-uuid', ['user1', 'user2']);

// Remove member
await client.group.removeMember('group-uuid', 'user-uuid');

// Leave group
await client.group.quit('group-uuid');
```

---

## RTC Module

### Initialize and Orchestrate Rooms

```typescript
import { RTCProviderType } from '@openchat/sdk/rtc';

// 1) Initialize local media provider (built-in: volcengine, extensible via provider registry)
await client.rtc.init({
  provider: RTCProviderType.VOLCENGINE,
  providerConfig: {
    appId: 'your-volcengine-app-id'
  }
});

// 2) Create room on server (multi-cloud routing handled by backend RTC module)
const room = await client.rtc.createRoom({
  type: 'group',
  participants: ['user-a', 'user-b'],
  provider: 'volcengine'
});

// 3) Generate RTC token
const token = await client.rtc.generateToken({
  roomId: room.id
});

// 4) Join media room
await client.rtc.joinRoom(room.id, {
  token: token.token,
  autoPublish: true,
  autoSubscribe: true
});
```

```typescript
// If provider is omitted, SDK calls /rtc/providers/capabilities
// and selects: recommendedPrimary -> defaultProvider (runtime-available providers only).
await client.rtc.init({
  providerConfigs: {
    volcengine: { appId: 'volc-app-id' },
    tencent: { appId: 'trtc-sdk-app-id', appKey: 'trtc-secret' },
    alibaba: { appId: 'ali-app-id', appKey: 'ali-app-key' },
    livekit: { appId: 'livekit-url', appKey: 'livekit-api-key' }
  }
});
```

Notes:
- `tencent` is a built-in adapter, but requires runtime `TRTC` to be loaded (for example, load `trtc-js-sdk` before initialization).
- `alibaba` is a built-in adapter, but requires runtime `AliRTC` or `AliRTCSdk` to be loaded.
- `livekit` is a built-in adapter, but requires runtime `LivekitClient` to be loaded (for example, load LiveKit browser SDK before initialization).

### Media Controls

```typescript
// Create and publish local stream
const localStream = await client.rtc.createLocalStream({ video: true, audio: true });
await client.rtc.publishStream(localStream.streamId);

// Camera/microphone toggles (aliases: enableCamera / enableMicrophone)
await client.rtc.enableVideo(true);
await client.rtc.enableAudio(true);
await client.rtc.enableCamera(false);
await client.rtc.enableMicrophone(false);

// Leave room
await client.rtc.leaveRoom();
```

### Provider Capability Discovery

```typescript
const capabilities = await client.rtc.getProviderCapabilities();
console.log(capabilities.defaultProvider, capabilities.activeProviders);
```

### Events

```typescript
import { RTCEvent } from '@openchat/sdk/rtc';

client.rtc.on(RTCEvent.USER_JOINED, (payload) => {
  console.log('User joined:', payload);
});

client.rtc.on(RTCEvent.USER_LEFT, (payload) => {
  console.log('User left:', payload);
});

client.rtc.on(RTCEvent.ROOM_STATE_CHANGED, (state) => {
  console.log('Room state:', state);
});
```

```typescript
import { RTCProviderFactory, RTCProviderType } from '@openchat/sdk/rtc';

// Register custom provider adapter to replace placeholder implementation
RTCProviderFactory.register(RTCProviderType.TENCENT, () => {
  return new MyTencentProviderAdapter();
});
```

---

## Configuration

```typescript
interface OpenChatConfig {
  serverUrl: string;
  imConfig: {
    tcpAddr: string;
    wsUrl: string;
  };
  options?: {
    autoReconnect?: boolean;        // default: true
    reconnectAttempts?: number;     // default: 5
    reconnectInterval?: number;     // default: 3000ms
    heartbeatInterval?: number;     // default: 30000ms
    messageCacheSize?: number;      // default: 1000
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

---

## Type Definitions

### User

```typescript
interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  phone?: string;
  signature?: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  lastSeenAt?: string;
  createdAt: string;
}
```

### Message

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

### Send Message Options

```typescript
interface SendMessageOptions {
  uuid?: string;                    // Message UUID (client-generated, for deduplication)
  type: MessageType;                // Message type
  content: MessageContent;          // Message content
  fromUserId: string;               // Sender user ID
  toUserId?: string;                // Receiver user ID (required for direct messages)
  groupId?: string;                 // Group ID (required for group messages)
  replyToId?: string;               // ID of the message being replied to
  forwardFromId?: string;           // ID of the original message being forwarded
  clientSeq?: number;               // Client sequence number (for deduplication)
  extra?: Record<string, any>;      // Extended data
  needReadReceipt?: boolean;        // Whether read receipt is needed, default true
}
```

### Conversation

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

---

## Best Practices

### React + Zustand Message State Template

Use one reducer path for both HTTP send responses and WS events.

```typescript
// stores/messageStore.ts
import { create } from 'zustand';
import { client } from '../openchat';

type MessageEvent = {
  eventId: string;
  eventType: string;
  occurredAt: number;
  stateVersion?: number;
  serverMessageId?: string;
  messageId?: string;
  clientMessageId?: string;
  status?: string;
  content?: unknown;
  fromUserId?: string;
  toUserId?: string;
  groupId?: string;
};

type MessageView = {
  messageId: string;
  conversationId: string;
  stateVersion: number;
  status?: string;
  content?: unknown;
  updatedAt: number;
};

interface MessageStore {
  eventDedup: Set<string>;
  messages: Map<string, MessageView>;
  conversationIndex: Map<string, string[]>;
  applyEvent: (event: MessageEvent) => { applied: boolean; message?: MessageView };
}

const DEFAULT_STATE_VERSION = -9999;

function resolveMessageKey(evt: MessageEvent): string | undefined {
  return evt.serverMessageId || evt.messageId || evt.clientMessageId;
}

function resolveConversationId(evt: MessageEvent): string {
  if (evt.groupId) return `group:${evt.groupId}`;
  const a = evt.fromUserId || '';
  const b = evt.toUserId || '';
  return `single:${[a, b].sort().join(':')}`;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  eventDedup: new Set(),
  messages: new Map(),
  conversationIndex: new Map(),
  applyEvent: (evt) => {
    if (!evt.eventId || get().eventDedup.has(evt.eventId)) {
      return { applied: false };
    }

    const messageId = resolveMessageKey(evt);
    if (!messageId) {
      return { applied: false };
    }

    const conversationId = resolveConversationId(evt);
    const incomingVersion = Number.isFinite(evt.stateVersion)
      ? (evt.stateVersion as number)
      : DEFAULT_STATE_VERSION;
    const prev = get().messages.get(messageId);
    const prevVersion = prev?.stateVersion ?? DEFAULT_STATE_VERSION;
    if (prev && incomingVersion < prevVersion) {
      return { applied: false, message: prev };
    }

    const next: MessageView = {
      messageId,
      conversationId,
      stateVersion: Math.max(prevVersion, incomingVersion),
      status: evt.status ?? prev?.status,
      content: evt.content ?? prev?.content,
      updatedAt: evt.occurredAt || Date.now(),
    };

    set((state) => {
      const nextDedup = new Set(state.eventDedup);
      nextDedup.add(evt.eventId);

      const nextMessages = new Map(state.messages);
      nextMessages.set(messageId, next);

      const nextIndex = new Map(state.conversationIndex);
      const ids = nextIndex.get(conversationId) || [];
      if (!ids.includes(messageId)) {
        nextIndex.set(conversationId, [...ids, messageId]);
      }

      return {
        eventDedup: nextDedup,
        messages: nextMessages,
        conversationIndex: nextIndex,
      };
    });

    return { applied: true, message: next };
  },
}));

export async function sendAndReduce(input: Record<string, unknown>) {
  const response = await client.message.send(input as any); // messageSent/messageFailed
  useMessageStore.getState().applyEvent(response as MessageEvent);
}

export function bindMessageEvents() {
  const apply = useMessageStore.getState().applyEvent;

  client.on('newMessage', (evt: MessageEvent) => apply(evt));
  client.on('newGroupMessage', (evt: MessageEvent) => apply(evt));
  client.on('messageAcknowledged', (evt: MessageEvent) => apply(evt));
  client.on('messageRetrying', (evt: MessageEvent) => apply(evt));
  client.on('messageFailed', (evt: MessageEvent) => apply(evt));
}
```

---

## Error Codes

| Error Code | Description |
|------------|-------------|
| `NETWORK_ERROR` | Network error |
| `UNAUTHORIZED` | Unauthorized |
| `TOKEN_EXPIRED` | Token expired |
| `FORBIDDEN` | Permission denied |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Validation failed |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `USER_NOT_FOUND` | User not found |
| `GROUP_NOT_FOUND` | Group not found |
| `NOT_GROUP_MEMBER` | Not a group member |

---

## Example Projects

- [React Chat App](https://github.com/Sdkwork-Cloud/openchat-react-example)
- [React Native Chat App](https://github.com/Sdkwork-Cloud/openchat-rn-example)
- [Vue Chat App](https://github.com/Sdkwork-Cloud/openchat-vue-example)

---

## API Reference

For complete API documentation, see [API Docs](/en/api/).
