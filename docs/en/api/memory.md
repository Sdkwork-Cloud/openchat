# Memory Management API

Memory Management API provides AI agent memory storage and retrieval capabilities.

## Overview

All Memory APIs require JWT authentication. Path prefix: `/im/api/v1/memory`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Store Memory | POST | `/memory` | Store a memory |
| Get Memory | GET | `/memory/:id` | Get memory details |
| List Memories | GET | `/memory` | List memories |
| Search Memories | GET | `/memory/search` | Semantic search |
| Delete Memory | DELETE | `/memory/:id` | Delete a memory |

---

## Store Memory

Store a new memory for an agent.

```http
POST /im/api/v1/memory
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "agentId": "agent-uuid",
  "content": "User prefers dark mode in applications",
  "metadata": {
    "category": "preference",
    "importance": "high"
  }
}
```

### Response

```json
{
  "id": "memory-uuid",
  "agentId": "agent-uuid",
  "content": "User prefers dark mode in applications",
  "embedding": [0.1, 0.2, ...],
  "metadata": {
    "category": "preference",
    "importance": "high"
  },
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

// Store memory
const memory = await client.api.memory.store({
  agentId: 'agent-uuid',
  content: 'User prefers dark mode',
  metadata: { category: 'preference' }
});

// Search memories
const results = await client.api.memory.search({
  agentId: 'agent-uuid',
  query: 'user preferences',
  limit: 10
});
```

---

## Related Links

- [AI Agents API](./agents.md)
- [AI Bots API](./ai-bots.md)
