# Group System

## Group Model

```typescript
interface Group {
  id: string;           // Unique group identifier
  name: string;         // Group name
  description?: string; // Group description
  avatar?: string;      // Group avatar
  ownerId: string;      // Owner ID
  memberCount: number;  // Member count
  createdAt: Date;      // Creation time
}
```

## Member Roles

- **owner** - Group owner
- **admin** - Administrator
- **member** - Regular member

## Group Types

- **Regular Group** - Up to 2,000 members
- **Large Group** - Up to 10,000 members
- **Live Group** - Unlimited members, admin-only messages

## Related APIs

- [Group Management API](/en/api/groups.md)
