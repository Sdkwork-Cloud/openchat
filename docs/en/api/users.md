# User Management

## Get Current User

### GET /users/me

Get current logged-in user information.

**Request Headers:**

```
Authorization: Bearer <token>
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "user1",
    "nickname": "User 1",
    "avatar": "https://example.com/avatar.jpg",
    "status": "online"
  }
}
```

## Update User Info

### PUT /users/me

Update current user information.

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| nickname | string | No | Nickname |
| avatar | string | No | Avatar URL |

## Search Users

### GET /users/search

Search for users.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| keyword | string | Yes | Search keyword |

**Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "username": "user1",
      "nickname": "User 1"
    }
  ]
}
```

## Next Steps

- [Friend Management](./friends.md) - Friend API
- [Group Management](./groups.md) - Group API
