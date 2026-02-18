# Real-time Audio/Video API

Real-time Audio/Video API provides WebRTC-based audio and video calling capabilities.

## Overview

All RTC APIs require JWT authentication. Path prefix: `/im/api/v1/rtc`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Create Room | POST | `/rtc/rooms` | Create a new RTC room |
| Get Room | GET | `/rtc/rooms/:id` | Get room details |
| Join Room | POST | `/rtc/rooms/:id/join` | Join a room |
| Leave Room | POST | `/rtc/rooms/:id/leave` | Leave a room |
| End Room | POST | `/rtc/rooms/:id/end` | End a room |
| Get Room Participants | GET | `/rtc/rooms/:id/participants` | Get room participants |

---

## Create Room

Create a new RTC room.

```http
POST /im/api/v1/rtc/rooms
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "type": "p2p",
  "callerId": "user-001",
  "calleeId": "user-002",
  "mediaType": "video"
}
```

### Response

```json
{
  "id": "room-uuid",
  "type": "p2p",
  "callerId": "user-001",
  "calleeId": "user-002",
  "mediaType": "video",
  "status": "waiting",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## SDK Usage

### TypeScript SDK

```typescript
import { OpenChatClient, DeviceFlag, RTCProviderType } from '@openchat/sdk';

const client = new OpenChatClient({
  server: { baseUrl: 'http://localhost:3000' },
  im: { wsUrl: 'ws://localhost:5200', deviceFlag: DeviceFlag.WEB },
  auth: { uid: 'user-uid', token: 'user-token' },
});

// Initialize RTC
await client.rtc.init({
  provider: RTCProviderType.VOLCENGINE,
  appId: 'your-app-id',
  appKey: 'your-app-key'
});

// Create room
const room = await client.rtc.createRoom({
  type: 'p2p',
  userId: 'callee-uuid'
});

// Join room
await client.rtc.joinRoom(room.id);

// Enable camera
await client.rtc.enableCamera(true);

// Enable microphone
await client.rtc.enableMicrophone(true);

// Leave room
await client.rtc.leaveRoom(room.id);
```

---

## Related Links

- [WukongIM Integration API](./wukongim.md)
- [Message Management API](./messages.md)
