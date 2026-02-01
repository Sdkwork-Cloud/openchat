# API Overview

OpenChat provides a complete RESTful API for building instant messaging applications.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most APIs require authentication via Bearer Token:

```
Authorization: Bearer <token>
```

## API Modules

- [Authentication](./auth) - User registration, login, token management
- [User Management](./users) - User info, search, status
- [Message Management](./messages) - Send messages, history, read receipts
- [Group Management](./groups) - Create groups, members, settings
- [Friend Management](./friends) - Friend requests, friend list
- [WuKongIM](./wukongim) - IM service integration

## Response Format

All APIs return a unified response format:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |
