# AI Agents API

AI Agents API provides AI agent management capabilities for building intelligent assistants.

## Overview

All AI Agents APIs require JWT authentication. Path prefix: `/im/api/v1/agents`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Create Agent | POST | `/agents` | Create a new agent |
| Get Agent | GET | `/agents/:id` | Get agent details |
| List Agents | GET | `/agents` | List all agents |
| Update Agent | PUT | `/agents/:id` | Update agent info |
| Delete Agent | DELETE | `/agents/:id` | Delete an agent |
| Chat with Agent | POST | `/agents/:id/chat` | Send message to agent |
| Get Agent Tools | GET | `/agents/:id/tools` | Get agent tools |
| Add Agent Tool | POST | `/agents/:id/tools` | Add tool to agent |

---

## Create Agent

Create a new AI agent.

```http
POST /im/api/v1/agents
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Customer Service Agent",
  "description": "AI agent for customer support",
  "model": "gpt-4",
  "systemPrompt": "You are a helpful customer service agent.",
  "tools": ["search", "email", "calendar"]
}
```

### Response

```json
{
  "id": "agent-uuid",
  "name": "Customer Service Agent",
  "description": "AI agent for customer support",
  "model": "gpt-4",
  "status": "active",
  "tools": ["search", "email", "calendar"],
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

// Get agents list
const agents = await client.api.agents.getList();

// Get agent by ID
const agent = await client.api.agents.getById('agent-uuid');

// Create agent
const newAgent = await client.api.agents.create({
  name: 'My Agent',
  model: 'gpt-4',
  systemPrompt: 'You are a helpful assistant.',
  tools: ['search']
});
```

---

## Related Links

- [AI Bots API](./ai-bots.md)
- [Memory Management API](./memory.md)
