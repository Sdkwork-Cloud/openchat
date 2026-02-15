# User System

## User Model

```typescript
interface User {
  id: string;           // Unique user identifier
  username: string;     // Username
  nickname: string;     // Display name
  avatar?: string;      // Avatar URL
  status: UserStatus;   // Online status
  createdAt: Date;      // Creation time
}

type UserStatus = 'online' | 'offline' | 'busy' | 'away';
```

## User Status

- **online** - Online
- **offline** - Offline
- **busy** - Busy
- **away** - Away

## User Relationships

- **Friend** - Mutual follow relationship
- **Stranger** - No relationship
- **Blacklist** - Blocked relationship

## Related APIs

- [User Management API](/en/api/users.md)
- [Friend Management API](/en/api/friends.md)
