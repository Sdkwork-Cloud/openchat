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
| Authentication | `/api/auth` | Login, registration, token management |
| User Management | `/api/users` | User info, search, settings |
| Message Management | `/api/messages` | Send messages, history, recall |
| Conversation Management | `/api/conversations` | Conversation list, unread management |
| Group Management | `/api/groups` | Group creation, member management |
| Friend Management | `/api/friends` | Friend requests, groups |
| IM Integration | `/api/im` | WukongIM related endpoints |

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

- [Authentication API](./auth.md) - Login, registration, token refresh

### Users

- [User Management API](./users.md) - User info, search, settings

### Messages

- [Message Management API](./messages.md) - Send messages, history, recall
- [WukongIM Integration API](./wukongim.md) - IM message engine endpoints

### Social

- [Group Management API](./groups.md) - Group creation, member management
- [Friend Management API](./friends.md) - Friend requests, groups

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
