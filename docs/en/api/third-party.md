# Third-party Integration API

Third-party Integration API provides integration capabilities with external services.

## Overview

All Integration APIs require JWT authentication. Path prefix: `/im/api/v1/integrations`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| List Integrations | GET | `/integrations` | List all integrations |
| Get Integration | GET | `/integrations/:id` | Get integration details |
| Create Integration | POST | `/integrations` | Create integration |
| Update Integration | PUT | `/integrations/:id` | Update integration |
| Delete Integration | DELETE | `/integrations/:id` | Delete integration |
| Test Integration | POST | `/integrations/:id/test` | Test integration |

---

## Create Integration

Create a new third-party integration.

```http
POST /im/api/v1/integrations
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Slack Integration",
  "type": "slack",
  "config": {
    "webhookUrl": "https://hooks.slack.com/services/xxx",
    "channel": "#notifications"
  }
}
```

### Response

```json
{
  "id": "integration-uuid",
  "name": "Slack Integration",
  "type": "slack",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Related Links

- [AI Agents API](./agents.md)
- [Bot Platform API](./bots.md)
