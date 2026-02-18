# Conversation Management API

Conversation Management API provides functionality for creating, querying, updating, and deleting conversations.

## Overview

All Conversation Management APIs require JWT authentication. Path prefix: `/im/api/v1/conversations`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Create Conversation | POST | `/conversations` | Create a new conversation |
| Get Conversation | GET | `/conversations/:id` | Get conversation details |
| Get Conversation List | GET | `/conversations` | Get user's conversations |
| Update Conversation | PUT | `/conversations/:id` | Update conversation info |
| Delete Conversation | DELETE | `/conversations/:id` | Delete a conversation |
| Pin Conversation | PUT | `/conversations/:id/pin` | Pin/unpin conversation |
| Mute Conversation | PUT | `/conversations/:id/mute` | Mute/unmute conversation |
| Mark as Read | PUT | `/conversations/:id/read` | Clear unread count |
| Get Unread Total | GET | `/conversations/unread-total/:userId` | Get total unread count |

---

## Create Conversation

Create a new conversation.

```http
POST /im/api/v1/conversations
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "type": "single",
  "userId": "user-001",
  "targetId": "user-002"
}
```

### Response

```json
{
  "id": "conv-uuid",
  "type": "single",
  "userId": "user-001",
  "targetId": "user-002",
  "targetName": "John Doe",
  "targetAvatar": "https://example.com/avatar.jpg",
  "unreadCount": 0,
  "isPinned": false,
  "isMuted": false,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Get Conversation List

Get user's conversation list.

```http
GET /im/api/v1/conversations?userId=user-001&type=single&limit=50&offset=0
Authorization: Bearer <access-token>
```

### Response

```json
[
  {
    "id": "conv-001",
    "type": "single",
    "userId": "user-001",
    "targetId": "user-002",
    "targetName": "John Doe",
    "targetAvatar": "https://example.com/avatar.jpg",
    "lastMessage": {
      "id": "msg-001",
      "type": "text",
      "content": { "text": "Hello!" },
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "unreadCount": 5,
    "isPinned": true,
    "isMuted": false,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
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

// Get conversation list
const conversations = await client.im.conversations.getList({
  limit: 20,
  offset: 0
});

// Pin conversation
await client.im.conversations.pin('conversation-id');

// Mute conversation
await client.im.conversations.mute('conversation-id');

// Delete conversation
await client.im.conversations.delete('conversation-id');

// Clear messages
await client.im.conversations.clearMessages('conversation-id');
```

---

## Related Links

- [Message Management API](./messages.md)
- [Contact Management API](./contacts.md)
- [Group Management API](./groups.md)
