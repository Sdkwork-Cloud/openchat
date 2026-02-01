# OpenChat Node.js SDK

Node.js SDK for OpenChat instant messaging service.

## Installation

```bash
npm install @openchat/nodejs-sdk
# or
yarn add @openchat/nodejs-sdk
```

## Usage

```typescript
import { OpenChat } from '@openchat/nodejs-sdk';

// Initialize SDK
const openChat = new OpenChat({
  baseUrl: 'https://api.openchat.com',
  apiKey: 'your-api-key',
});

// Login
async function login() {
  try {
    const authResponse = await openChat.auth.login({
      username: 'user@example.com',
      password: 'password',
    });
    console.log('Login success:', authResponse.user.username);
  } catch (error) {
    console.error('Login failed:', error);
  }
}

// Listen to messages
openChat.on('message_received', (message) => {
  console.log('New message:', message.content.text);
});

// Send message
async function sendMessage() {
  try {
    const message = await openChat.messages.sendTextMessage({
      toUserId: 'user-id',
      text: 'Hello!',
    });
    console.log('Message sent:', message.id);
  } catch (error) {
    console.error('Send failed:', error);
  }
}
```

## Features

- ✅ User authentication
- ✅ Real-time messaging (WebSocket)
- ✅ Friend management
- ✅ Group chat
- ✅ File upload/download
- ✅ TypeScript support
- ✅ EventEmitter API

## Architecture

```
src/
├── index.ts              # Main export
├── core/
│   ├── http-client.ts    # Axios wrapper
│   ├── websocket.ts      # WebSocket client
│   └── event-emitter.ts  # EventEmitter
├── modules/
│   ├── auth.ts
│   ├── user.ts
│   ├── friend.ts
│   ├── message.ts
│   ├── group.ts
│   ├── conversation.ts
│   └── contact.ts
├── types/
│   └── index.ts
└── utils/
    └── logger.ts
```
