# AI Bots API

AI Bots API provides AI-powered bot management capabilities.

## Overview

All AI Bots APIs require JWT authentication. Path prefix: `/im/api/v1/ai-bots`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Create Bot | POST | `/ai-bots` | Create a new AI bot |
| Get Bot | GET | `/ai-bots/:id` | Get bot details |
| List Bots | GET | `/ai-bots` | List all bots |
| Update Bot | PUT | `/ai-bots/:id` | Update bot info |
| Delete Bot | DELETE | `/ai-bots/:id` | Delete a bot |
| Chat with Bot | POST | `/ai-bots/:id/chat` | Send message to bot |

---

## Create Bot

Create a new AI bot.

```http
POST /im/api/v1/ai-bots
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Assistant Bot",
  "description": "A helpful AI assistant",
  "model": "gpt-4",
  "systemPrompt": "You are a helpful assistant.",
  "temperature": 0.7
}
```

### Response

```json
{
  "id": "bot-uuid",
  "name": "Assistant Bot",
  "description": "A helpful AI assistant",
  "model": "gpt-4",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## SDK Usage

### TypeScript SDK

```typescript
import { OpenChatClient, DeviceFlag } from '@openchat/sdk';

const client = new OpenChatClient({
  server: { baseUrl: 'http://localhost:3000' },
  im: { wsUrl: 'ws://localhost:5200', deviceFlag: DeviceFlag.WEB },
  auth: { uid: 'user-uid', token: 'user-token' },
});

// Get AI bots list
const bots = await client.api.aiBots.getList();

// Get bot by ID
const bot = await client.api.aiBots.getById('bot-uuid');

// Create bot
const newBot = await client.api.aiBots.create({
  name: 'My Bot',
  model: 'gpt-4',
  systemPrompt: 'You are a helpful assistant.'
});
```

---

## Related Links

- [AI Agents API](./agents.md)
- [Bot Platform API](./bots.md)
