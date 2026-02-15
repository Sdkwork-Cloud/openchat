# Group Management

## Create Group

### POST /groups

Create a new group.

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Group name |
| description | string | No | Group description |
| members | array | No | Initial member ID list |

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "group-uuid",
    "name": "Dev Team",
    "ownerId": "user-uuid",
    "memberCount": 1
  }
}
```

## Get Group List

### GET /groups

Get the current user's group list.

## Get Group Details

### GET /groups/:id

Get group detailed information.

## Join Group

### POST /groups/:id/join

Join a group.

## Invite Members

### POST /groups/:id/invite

Invite members to join a group.

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userIds | array | Yes | User ID list |

## Next Steps

- [Friend Management](./friends.md) - Friend API
- [Message Management](./messages.md) - Message API
