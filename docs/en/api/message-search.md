# Message Search API

Message Search API provides message search capabilities.

## Overview

All Message Search APIs require JWT authentication. Path prefix: `/im/api/v1/search`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Search Messages | GET | `/search/messages` | Search messages |
| Search by User | GET | `/search/messages/user/:userId` | Search user's messages |
| Search by Conversation | GET | `/search/messages/conversation/:convId` | Search in conversation |

---

## Search Messages

Search messages by keyword.

```http
GET /im/api/v1/search/messages?keyword=hello&userId=user-001&limit=20
Authorization: Bearer <access-token>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| keyword | string | Yes | Search keyword |
| userId | string | Yes | User ID |
| type | string | No | Message type filter |
| startTime | string | No | Start time |
| endTime | string | No | End time |
| limit | number | No | Result limit |

### Response

```json
{
  "total": 100,
  "results": [
    {
      "id": "msg-001",
      "type": "text",
      "content": { "text": "Hello, world!" },
      "fromUserId": "user-001",
      "conversationId": "conv-001",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
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

// Search messages
const results = await client.im.messages.searchMessages('keyword');

// Search with filters
const filtered = await client.api.messageSearch.search({
  keyword: 'hello',
  userId: 'user-001',
  type: 'text',
  limit: 20
});
```

---

## Related Links

- [Message Management API](./messages.md)
- [Conversation Management API](./conversations.md)
