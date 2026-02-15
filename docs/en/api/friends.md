# Friend Management

## Get Friend List

### GET /friends

Get the friend list.

**Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "friend-uuid",
      "userId": "user-uuid",
      "nickname": "Friend Nickname",
      "avatar": "https://example.com/avatar.jpg",
      "status": "online"
    }
  ]
}
```

## Send Friend Request

### POST /friends/requests

Send a friend request.

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| toUserId | string | Yes | Target user ID |
| message | string | No | Request message |

## Handle Friend Request

### PUT /friends/requests/:id

Accept or reject a friend request.

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| accept | boolean | Yes | Whether to accept |

## Delete Friend

### DELETE /friends/:id

Delete a friend.

## Next Steps

- [User Management](./users.md) - User API
- [Group Management](./groups.md) - Group API
