# Message System

## Message Model

```typescript
interface Message {
  id: string;           // Unique message identifier
  type: MessageType;    // Message type
  content: any;         // Message content
  from: string;         // Sender ID
  to: string;           // Receiver ID
  timestamp: number;    // Send timestamp
  status: MessageStatus; // Message status
}

type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file';
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
```

## Message Types

- **text** - Text message
- **image** - Image message
- **audio** - Voice message
- **video** - Video message
- **file** - File message

## Message Status

- **sending** - Sending
- **sent** - Sent
- **delivered** - Delivered
- **read** - Read

## Related APIs

- [Message Management API](/en/api/messages.md)
