# API Documentation

OpenChat provides a complete RESTful API for building instant messaging applications.

## Overview

### Base Information

| Item | Value |
|------|-------|
| Base URL | `http://your-server:3000/api` |
| Protocol | HTTP/HTTPS |
| Data Format | JSON |
| Character Encoding | UTF-8 |
| Time Format | ISO 8601 (`2024-01-15T10:30:00Z`) |

### API Modules

| Module | Path Prefix | Description |
|--------|-------------|-------------|
| Authentication | `/api/v1/auth` | Login, registration, token management |
| User Management | `/api/v1/users` | User info, search, settings |
| Message Management | `/api/v1/messages` | Send messages, history, recall |
| Message Search | `/api/v1/message-search` | Full-text search, advanced search |
| Conversation Management | `/api/v1/conversations` | Conversation list, unread management |
| Group Management | `/api/v1/groups` | Group creation, member management |
| Friend Management | `/api/v1/friends` | Friend requests, groups |
| Contact Management | `/api/v1/contacts` | Contact management, groups |
| Real-time Audio/Video | `/api/v1/rtc` | Audio/video calls, signaling |
| AI Bots | `/api/v1/ai-bots` | AI bot management, message processing |
| AI Agents | `/api/v1/agents` | AI Agent management, tool calls |
| Bot Platform | `/api/v1/bots` | Multi-platform bot integration |
| Memory Management | `/api/v1/memory` | Conversation memory, knowledge base |
| IoT | `/iot` | IoT device management, message control |
| Health Check | `/health` | Service health status check |
| Metrics | `/metrics` | Prometheus monitoring metrics |
| Third-party Integration | `/third-party` | Multi-platform message integration |
| IM Integration | `/api/v1/im` | WukongIM related endpoints |

---

## Authentication

OpenChat uses JWT (JSON Web Token) for API authentication.

### Get Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

### Use Token

Add Authorization header to requests:

```http
Authorization: Bearer <your-access-token>
```

### Token Types

| Token Type | Validity | Purpose |
|------------|----------|---------|
| Access Token | 7 days | API request authentication |
| Refresh Token | 30 days | Refresh Access Token |

---

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 204 | Success (no content) |
| 400 | Bad request |
| 401 | Unauthorized (not logged in or invalid token) |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Resource conflict |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Common Error Codes

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Parameter validation failed |
| `UNAUTHORIZED` | Unauthorized |
| `FORBIDDEN` | Permission denied |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `INTERNAL_ERROR` | Internal server error |

---

## Rate Limits

| Type | Limit |
|------|-------|
| Default rate limit | 100 requests/minute |
| Login rate limit | 10 requests/minute |
| Message send limit | 60 messages/minute |
| File upload size | Max 50MB |

---

## API Documentation Navigation

### Authentication

| Documentation | Description |
|------|------|
| [Authentication API](./auth.md) | Login, registration, token refresh, password management |

### Users

| Documentation | Description |
|------|------|
| [User Management API](./users.md) | User info, search, settings |
| [Contact Management API](./contacts.md) | Contact management, groups, notes |

### Messages

| Documentation | Description |
|------|------|
| [Message Management API](./messages.md) | Send messages, history, recall, forward |
| [Message Search API](./message-search.md) | Full-text search, advanced search |
| [WukongIM Integration API](./wukongim.md) | IM message engine endpoints |

### Conversations

| Documentation | Description |
|------|------|
| [Conversation Management API](./conversations.md) | Conversation list, pin, mute, unread management |

### Social

| Documentation | Description |
|------|------|
| [Group Management API](./groups.md) | Group creation, member management, permission settings |
| [Friend Management API](./friends.md) | Friend requests, group management, blacklist |

### Real-time Communication

| Documentation | Description |
|------|------|
| [Real-time Audio/Video API](./rtc.md) | Audio/video calls, signaling exchange |

### AI Features

| Documentation | Description |
|------|------|
| [AI Bots API](./ai-bots.md) | AI bot management, message processing |
| [AI Agents API](./agents.md) | AI Agent management, tool calls, workflows |
| [Bot Platform API](./bots.md) | Multi-platform bot integration |
| [Memory Management API](./memory.md) | Conversation memory, vector storage, knowledge base |

### IoT Features

| Documentation | Description |
|------|------|
| [IoT API](./iot.md) | IoT device management, message control |

### Operations & Monitoring

| Documentation | Description |
|------|------|
| [Health Check API](./health.md) | Service health status check |
| [Metrics API](./metrics.md) | Prometheus monitoring metrics |

### Integrations

| Documentation | Description |
|------|------|
| [Third-party Integration API](./third-party.md) | WhatsApp, Telegram, WeChat and other platform integration |

---

## Quick Start

### 1. Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "nickname": "Test User"
  }'
```

### 2. Login to Get Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. Send Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "receiver-user-id",
    "type": "text",
    "content": {
      "text": "Hello, OpenChat!"
    }
  }'
```

---

## SDK Support

OpenChat provides multi-language SDKs to simplify API calls:

- [TypeScript SDK](../sdk/typescript.md)
- [Java SDK](../sdk/java.md)
- [Go SDK](../sdk/go.md)
- [Python SDK](../sdk/python.md)

### TypeScript SDK Example

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// Login
await client.auth.login({
  username: 'testuser',
  password: 'password123'
});

// Send message
await client.message.send({
  to: 'receiver-id',
  type: 'text',
  content: { text: 'Hello!' }
});

// Listen for messages
client.message.onMessage((message) => {
  console.log('Received message:', message);
});
```

---

## Online API Documentation

After starting the server, access Swagger UI for interactive API documentation:

```
http://localhost:3000/api/docs
```

Swagger UI provides:
- Complete API list
- Online testing
- Request/response examples
- Data model definitions

---

## Related Links

- [Quick Start Guide](../guide/quickstart.md)
- [SDK Documentation](../sdk/)
- [Deployment Guide](../deploy/)
