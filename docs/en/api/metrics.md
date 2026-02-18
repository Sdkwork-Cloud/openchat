# Metrics API

Metrics API provides system metrics monitoring capabilities.

## Overview

All Metrics APIs require JWT authentication. Path prefix: `/im/api/v1/metrics`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Get Metrics | GET | `/metrics` | Get system metrics |
| Get Message Metrics | GET | `/metrics/messages` | Get message metrics |
| Get User Metrics | GET | `/metrics/users` | Get user metrics |
| Get System Metrics | GET | `/metrics/system` | Get system metrics |

---

## Get Metrics

Get general system metrics.

```http
GET /im/api/v1/metrics
Authorization: Bearer <access-token>
```

### Response

```json
{
  "messages": {
    "total": 1000000,
    "today": 5000,
    "perMinute": 50
  },
  "users": {
    "total": 10000,
    "online": 500,
    "active": 2000
  },
  "groups": {
    "total": 500,
    "active": 300
  }
}
```

---

## SDK Usage

### TypeScript SDK

```typescript
import { OpenChatClient, DeviceFlag } from '@openchat/sdk';

const client = new OpenChatClient({
  server: { baseUrl: 'http://localhost:3000' },
  im: { wsUrl: 'ws://localhost:5200', deviceFlag: DeviceFlag.WEB },
  auth: { uid: 'user-uid', token: 'user-token' },
});

// Get metrics
const metrics = await client.api.metrics.getMetrics();

// Get message metrics
const messageMetrics = await client.api.metrics.getMessageMetrics();
```

---

## Related Links

- [Health Check API](./health.md)
