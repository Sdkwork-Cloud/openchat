# Bot Platform API

Bot Platform API provides bot platform management capabilities for third-party bot integration.

## Overview

All Bot Platform APIs require JWT authentication. Path prefix: `/im/api/v1/bots`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Register Bot | POST | `/bots` | Register a new bot |
| Get Bot | GET | `/bots/:id` | Get bot details |
| List Bots | GET | `/bots` | List all bots |
| Update Bot | PUT | `/bots/:id` | Update bot info |
| Delete Bot | DELETE | `/bots/:id` | Delete a bot |
| Get Bot Webhook | GET | `/bots/:id/webhook` | Get webhook config |
| Set Bot Webhook | PUT | `/bots/:id/webhook` | Set webhook config |

---

## Register Bot

Register a new bot on the platform.

```http
POST /im/api/v1/bots
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "name": "My Bot",
  "description": "A third-party bot",
  "webhookUrl": "https://example.com/bot/webhook",
  "commands": ["/help", "/start", "/settings"]
}
```

### Response

```json
{
  "id": "bot-uuid",
  "name": "My Bot",
  "description": "A third-party bot",
  "webhookUrl": "https://example.com/bot/webhook",
  "token": "bot-token-xxx",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Related Links

- [AI Bots API](./ai-bots.md)
- [AI Agents API](./agents.md)
