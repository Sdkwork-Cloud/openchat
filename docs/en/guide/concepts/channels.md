# Channel Types

## Channel Model

```typescript
interface Channel {
  id: string;           // Channel ID
  type: ChannelType;    // Channel type
  name?: string;        // Channel name
}

type ChannelType = 1 | 2;
// 1: Personal channel
// 2: Group channel
```

## Channel Types

| Type Value | Type | Description |
|------------|------|-------------|
| 1 | Personal Channel | One-on-one private chat |
| 2 | Group Channel | Multi-member group chat |

## Channel ID Convention

- Personal Channel: Use the other user's ID
- Group Channel: Use the group ID

## Related APIs

- [Message Management API](/en/api/messages.md)
- [Group Management API](/en/api/groups.md)
