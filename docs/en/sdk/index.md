# SDK Documentation

OpenChat provides multi-language SDKs to help developers quickly integrate instant messaging functionality.

## SDK List

| SDK | Platform | Status | Description |
|-----|----------|--------|-------------|
| [TypeScript SDK](./typescript.md) | Web / Node.js | ✅ Stable | Supports React, Vue, Angular frameworks |
| [Java SDK](./java.md) | Android / JVM | 🚧 In Development | Supports Android and Java backend |
| [Go SDK](./go.md) | Go | 🚧 In Development | Supports Go backend services |
| [Python SDK](./python.md) | Python | 🚧 In Development | Supports Python backend and scripts |

## Quick Start

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

// Initialize
await client.init();

// Login
await client.auth.login({
  username: 'user',
  password: 'password'
});

// Send message
await client.message.send({
  to: 'user-uuid',
  type: 'text',
  content: { text: 'Hello!' }
});
```

## Core Features

### Messaging

- Send/receive messages
- Message recall
- Message forwarding
- Read receipts
- Message history

### User Management

- User registration/login
- Profile management
- Online status
- User search

### Group Management

- Create/dissolve groups
- Member management
- Group messages
- Group announcements

### Friend System

- Friend requests
- Friend list
- Friend groups
- Block list

## Message Types

The SDK supports multiple message types:

| Type | Description |
|------|-------------|
| text | Text message |
| image | Image message |
| audio | Audio message |
| video | Video message |
| file | File message |
| music | Music message |
| document | Document message |
| code | Code message |
| location | Location message |
| card | Contact card |
| custom | Custom message |

## Configuration

```typescript
interface OpenChatConfig {
  serverUrl: string;           // Server URL
  imConfig: {
    tcpAddr?: string;          // TCP address (mobile)
    wsUrl: string;             // WebSocket address (web)
  };
  options?: {
    autoReconnect?: boolean;   // Auto reconnect
    reconnectAttempts?: number;// Reconnect attempts
    reconnectInterval?: number;// Reconnect interval
    heartbeatInterval?: number;// Heartbeat interval
    messageCacheSize?: number; // Message cache size
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

## Event System

```typescript
// Connection status
client.onConnectionChange((status) => {
  console.log('Connection status:', status);
});

// New message
client.message.onMessage((message) => {
  console.log('Received message:', message);
});

// Message status change
client.message.onStatusChange((messageId, status) => {
  console.log('Message status:', status);
});

// Error handling
client.onError((error) => {
  console.error('Error:', error);
});
```

## Error Handling

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
      // Network error
      break;
    case 'UNAUTHORIZED':
      // Unauthorized
      break;
    case 'RATE_LIMIT_EXCEEDED':
      // Rate limit exceeded
      break;
  }
}
```

## Related Links

- [API Documentation](../api/) - Complete API documentation
- [Deployment Guide](../deploy/) - Server deployment
- [Configuration](../config/) - Server configuration
