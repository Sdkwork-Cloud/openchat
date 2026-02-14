# Message Management API

The Message Management API provides functionality for sending, querying, recalling, and managing messages.

## Overview

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Send Message | POST | `/api/messages` | Send a message |
| Get Message List | GET | `/api/messages` | Get conversation messages |
| Get Conversation List | GET | `/api/conversations` | Get conversation list |
| Mark as Read | PUT | `/api/messages/read` | Mark messages as read |
| Recall Message | POST | `/api/messages/:id/recall` | Recall a message |
| Delete Message | DELETE | `/api/messages/:id` | Delete a message |
| Forward Message | POST | `/api/messages/:id/forward` | Forward a message |
| Search Messages | GET | `/api/messages/search` | Search messages |

---

## Send Message

Send a message to a specified user or group.

```http
POST /api/messages
Authorization: Bearer <access-token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "uuid": "string",              // Optional, message UUID (client-generated, for deduplication)
  "type": "text",                // Required, message type
  "content": {},                 // Required, message content (structure varies by type)
  "fromUserId": "string",        // Required, sender user ID
  "toUserId": "string",          // Optional, receiver user ID (required for direct messages)
  "groupId": "string",           // Optional, group ID (required for group messages)
  "replyToId": "string",         // Optional, ID of the message being replied to
  "forwardFromId": "string",     // Optional, ID of the original message being forwarded
  "clientSeq": 12345,            // Optional, client sequence number (for deduplication)
  "extra": {},                   // Optional, extended data
  "needReadReceipt": true        // Optional, whether read receipt is needed, default true
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uuid | string | No | Message UUID, client-generated, for deduplication |
| type | string | Yes | Message type, see Message Types below |
| content | object | Yes | Message content, structure varies by type |
| fromUserId | string | Yes | Sender user ID |
| toUserId | string | Conditional | Receiver user ID (required for direct messages) |
| groupId | string | Conditional | Group ID (required for group messages) |
| replyToId | string | No | ID of the message being replied to |
| forwardFromId | string | No | ID of the original message being forwarded |
| clientSeq | number | No | Client sequence number, for deduplication |
| extra | object | No | Extended data |
| needReadReceipt | boolean | No | Whether read receipt is needed, default true |

---

## Message Types

| Type | Description | Content Structure |
|------|-------------|-------------------|
| text | Text message | TextContent |
| image | Image message | ImageMediaResource |
| audio | Audio message | AudioMediaResource |
| video | Video message | VideoMediaResource |
| file | File message | FileMediaResource |
| music | Music message | MusicMediaResource |
| document | Document message | DocumentMediaResource |
| code | Code message | CodeMediaResource |
| location | Location message | LocationContent |
| card | Contact card | CardContent |
| custom | Custom message | CustomContent |
| system | System message | SystemContent |

---

## Message Content Structures

### TextContent - Text Content

```typescript
interface TextContent {
  text: string;           // Required, text content
  mentions?: string[];    // Optional, list of mentioned user IDs
}
```

**Example:**

```json
{
  "type": "text",
  "content": {
    "text": "Hello @user1, how are you?",
    "mentions": ["user1"]
  }
}
```

### ImageMediaResource - Image Resource

Inherits from MediaResource.

```typescript
interface ImageMediaResource {
  url: string;            // Required, image URL
  format?: ImageFormat;   // Optional, image format: JPEG, JPG, PNG, GIF, BMP, WEBP, SVG, TIFF, ICO, HEIC
  width?: number;         // Optional, width in pixels
  height?: number;        // Optional, height in pixels
  splitImages?: ImageMediaResource[]; // Optional, image split results
  aspectRatio?: string;   // Optional, aspect ratio
  colorMode?: string;     // Optional, color mode
  dpi?: number;           // Optional, DPI
  thumbnailUrl?: string;  // Optional, thumbnail URL
}
```

**Example:**

```json
{
  "type": "image",
  "content": {
    "url": "https://example.com/image.jpg",
    "format": "JPEG",
    "width": 1920,
    "height": 1080,
    "size": 512000,
    "thumbnailUrl": "https://example.com/thumb.jpg"
  }
}
```

### VideoMediaResource - Video Resource

Inherits from MediaResource.

```typescript
interface VideoMediaResource {
  url: string;            // Required, video URL
  format?: VideoFormat;   // Optional, video format: MP4, AVI, MOV, WMV, FLV, MKV, WEBM, MPEG, 3GP, TS
  duration?: number;      // Optional, duration in seconds
  width?: number;         // Optional, width in pixels
  height?: number;        // Optional, height in pixels
  size?: number;          // Optional, file size in bytes
  frameRate?: number;     // Optional, frame rate
  bitRate?: string;       // Optional, bit rate
  codec?: string;         // Optional, codec
  thumbnailUrl?: string;  // Optional, thumbnail URL
  coverUrl?: string;      // Optional, cover URL
}
```

**Example:**

```json
{
  "type": "video",
  "content": {
    "url": "https://example.com/video.mp4",
    "format": "MP4",
    "duration": 120,
    "width": 1920,
    "height": 1080,
    "size": 10240000,
    "thumbnailUrl": "https://example.com/thumb.jpg"
  }
}
```

### AudioMediaResource - Audio Resource

Inherits from MediaResource.

```typescript
interface AudioMediaResource {
  url: string;            // Required, audio URL
  format?: AudioFormat;   // Optional, audio format: WAV, MP3, AAC, FLAC, OGG, PCM, AIFF, AU, OPUS
  duration?: number;      // Optional, duration in seconds
  size?: number;          // Optional, file size in bytes
  bitRate?: string;       // Optional, bit rate
  sampleRate?: string;    // Optional, sample rate
  channels?: number;      // Optional, number of channels
  codec?: string;         // Optional, codec
}
```

**Example:**

```json
{
  "type": "audio",
  "content": {
    "url": "https://example.com/voice.mp3",
    "format": "MP3",
    "duration": 30,
    "size": 102400
  }
}
```

### MusicMediaResource - Music Resource

Inherits from MediaResource.

```typescript
interface MusicMediaResource {
  url: string;            // Required, music URL
  format?: AudioFormat;   // Optional, audio format
  duration?: number;      // Optional, duration in seconds
  size?: number;          // Optional, file size in bytes
  title?: string;         // Optional, title
  artist?: string;        // Optional, artist
  album?: string;         // Optional, album
  genre?: string;         // Optional, genre
  lyrics?: string;        // Optional, lyrics
  coverUrl?: string;      // Optional, cover URL
  year?: number;          // Optional, year
}
```

**Example:**

```json
{
  "type": "music",
  "content": {
    "url": "https://example.com/music.mp3",
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "duration": 180,
    "coverUrl": "https://example.com/cover.jpg"
  }
}
```

### FileMediaResource - File Resource

Inherits from MediaResource.

```typescript
interface FileMediaResource {
  name: string;           // Required, file name
  url: string;            // Required, file URL
  size?: number;          // Optional, file size in bytes, max 100MB
  mimeType?: string;      // Optional, MIME type
  hash?: string;          // Optional, file hash
  path?: string;          // Optional, file path
}
```

**Example:**

```json
{
  "type": "file",
  "content": {
    "name": "document.pdf",
    "url": "https://example.com/file.pdf",
    "size": 1024000,
    "mimeType": "application/pdf"
  }
}
```

### DocumentMediaResource - Document Resource

Inherits from MediaResource.

```typescript
interface DocumentMediaResource {
  url: string;               // Required, document URL
  format?: DocumentFormat;   // Optional, document format: PDF, DOC, DOCX, XLS, XLSX, TXT, RTF, MD, EPUB
  pageCount?: number;        // Optional, page count
  author?: string;           // Optional, author
  title?: string;            // Optional, title
  summary?: string;          // Optional, summary
  keywords?: string[];       // Optional, keywords
  contentText?: string;      // Optional, document content text
  coverUrl?: string;         // Optional, cover URL
  version?: string;          // Optional, version
}
```

**Example:**

```json
{
  "type": "document",
  "content": {
    "url": "https://example.com/document.pdf",
    "format": "PDF",
    "title": "Document Title",
    "pageCount": 10,
    "author": "Author Name"
  }
}
```

### CodeMediaResource - Code Resource

Inherits from MediaResource.

```typescript
interface CodeMediaResource {
  language?: CodeLanguage;   // Optional, code language: JAVA, PYTHON, JAVASCRIPT, TYPESCRIPT, CPP, C, CSHARP, GO, RUST, PHP, RUBY, SWIFT, KOTLIN, SQL, HTML, CSS, SHELL, JSON, XML, YAML, OTHER
  code?: string;             // Optional, code content
  lineCount?: number;        // Optional, line count
  comments?: string;         // Optional, comments
  dependencies?: string[];   // Optional, dependencies
  license?: string;          // Optional, license
  version?: string;          // Optional, version
  author?: string;           // Optional, author
}
```

**Example:**

```json
{
  "type": "code",
  "content": {
    "language": "TYPESCRIPT",
    "code": "const hello = 'world';",
    "lineCount": 1
  }
}
```

### LocationContent - Location Content

```typescript
interface LocationContent {
  latitude: number;       // Required, latitude
  longitude: number;      // Required, longitude
  address?: string;       // Optional, address description
  name?: string;          // Optional, place name
  thumbnailUrl?: string;  // Optional, thumbnail URL
}
```

**Example:**

```json
{
  "type": "location",
  "content": {
    "latitude": 39.9042,
    "longitude": 116.4074,
    "address": "Tiananmen Square, Beijing, China",
    "name": "Tiananmen Square"
  }
}
```

### CardContent - Contact Card Content

```typescript
interface CardContent {
  userId: string;         // Required, user ID
  nickname?: string;      // Optional, user nickname
  avatar?: string;        // Optional, user avatar URL
  signature?: string;     // Optional, user signature
}
```

**Example:**

```json
{
  "type": "card",
  "content": {
    "userId": "user-uuid",
    "nickname": "User Nickname",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

### CustomContent - Custom Content

```typescript
interface CustomContent {
  customType: string;             // Required, custom type identifier
  data?: Record<string, any>;     // Optional, custom data
}
```

**Example:**

```json
{
  "type": "custom",
  "content": {
    "customType": "order",
    "data": {
      "orderId": "12345",
      "amount": 99.99
    }
  }
}
```

### SystemContent - System Message

```typescript
interface SystemContent {
  type: string;                   // Required, system message type
  data?: Record<string, any>;     // Optional, system message data
}
```

**Example:**

```json
{
  "type": "system",
  "content": {
    "type": "group_member_joined",
    "data": {
      "userId": "user-uuid",
      "groupId": "group-uuid"
    }
  }
}
```

---

## MediaResource - Media Resource Base Class

All media resources inherit from MediaResource:

```typescript
interface MediaResource {
  id?: string;            // Optional, resource ID
  uuid?: string;          // Optional, resource UUID
  url?: string;           // Optional, resource URL
  bytes?: number[];       // Optional, resource byte data
  localFile?: object;     // Optional, local file
  base64?: string;        // Optional, resource Base64 encoding
  type?: MediaResourceType; // Optional, resource type: IMAGE, VIDEO, AUDIO, DOCUMENT, FILE, MUSIC, CHARACTER, MODEL_3D, PPT, CODE
  mimeType?: string;      // Optional, MIME type
  size?: number;          // Optional, file size in bytes
  name?: string;          // Optional, resource name
  extension?: string;     // Optional, file extension
  tags?: TagsContent;     // Optional, resource tags
  metadata?: Record<string, any>; // Optional, resource metadata
  prompt?: string;        // Optional, AI generation prompt
  createdAt?: string;     // Optional, creation time
  updatedAt?: string;     // Optional, update time
  creatorId?: string;     // Optional, creator ID
  description?: string;   // Optional, description
}
```

---

## Complete Request Examples

### Send Text Message (Direct Message)

```json
{
  "type": "text",
  "content": {
    "text": "Hello, OpenChat!",
    "mentions": ["user1", "user2"]
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid"
}
```

### Send Image Message

```json
{
  "type": "image",
  "content": {
    "url": "https://example.com/image.jpg",
    "format": "JPEG",
    "width": 1920,
    "height": 1080,
    "size": 512000,
    "thumbnailUrl": "https://example.com/thumb.jpg"
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid"
}
```

### Send Group Message

```json
{
  "type": "text",
  "content": {
    "text": "Hello everyone!"
  },
  "fromUserId": "sender-uuid",
  "groupId": "group-uuid"
}
```

### Reply to Message

```json
{
  "type": "text",
  "content": {
    "text": "I agree with your point"
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid",
  "replyToId": "original-message-id"
}
```

### Send Message with Deduplication

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "type": "text",
  "content": {
    "text": "Hello"
  },
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid",
  "clientSeq": 12345
}
```

---

## Response Example

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "fromUserId": "sender-uuid",
    "toUserId": "receiver-uuid",
    "type": "text",
    "content": {
      "text": "Hello, OpenChat!"
    },
    "status": "sent",
    "timestamp": 1705312800000,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Message Status

| Status | Description |
|--------|-------------|
| sending | Sending in progress |
| sent | Sent (received by server) |
| delivered | Delivered (received by recipient) |
| read | Read (viewed by recipient) |
| failed | Send failed |
| recalled | Recalled |

---

## Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `MESSAGE_NOT_FOUND` | 404 | Message not found |
| `NOT_MESSAGE_OWNER` | 403 | Not the message sender |
| `RECALL_TIMEOUT` | 400 | Recall time limit exceeded |
| `ALREADY_RECALLED` | 400 | Message already recalled |
| `CONTENT_TOO_LONG` | 400 | Message content too long |
| `USER_NOT_FOUND` | 404 | User not found |
| `GROUP_NOT_FOUND` | 404 | Group not found |
| `NOT_GROUP_MEMBER` | 403 | Not a group member |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `VALIDATION_ERROR` | 400 | Parameter validation failed |

---

## Usage Examples

### cURL

```bash
# Send text message
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": {"text": "Hello!"},
    "fromUserId": "sender-uuid",
    "toUserId": "receiver-uuid"
  }'
```

### TypeScript SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// Send text message
const message = await client.message.send({
  type: 'text',
  content: {
    text: 'Hello, OpenChat!',
    mentions: ['user1']
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});

// Send image message
const imageMessage = await client.message.send({
  type: 'image',
  content: {
    url: 'https://example.com/image.jpg',
    width: 1920,
    height: 1080
  },
  fromUserId: 'sender-uuid',
  toUserId: 'receiver-uuid'
});
```

---

## Related Links

- [WukongIM Integration API](./wukongim.md)
- [Group Management API](./groups.md)
- [SDK Documentation](../sdk/typescript.md)
