# Health Check API

Health Check API provides system health monitoring capabilities.

## Overview

Health Check APIs do not require authentication. Path prefix: `/im/api/v1/health`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Basic Health | GET | `/health` | Basic health check |
| Detailed Health | GET | `/health/detailed` | Detailed health check |
| Liveness | GET | `/health/live` | Kubernetes liveness probe |
| Readiness | GET | `/health/ready` | Kubernetes readiness probe |

---

## Basic Health Check

Check if the service is running.

```http
GET /im/api/v1/health
```

### Response

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

## Detailed Health Check

Get detailed health status of all components.

```http
GET /im/api/v1/health/detailed
```

### Response

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "components": {
    "database": { "status": "ok", "latency": 5 },
    "redis": { "status": "ok", "latency": 2 },
    "wukongim": { "status": "ok", "latency": 10 }
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

// Basic health check
const health = await client.api.health.check();

// Detailed health check
const detailed = await client.api.health.detailedCheck();
```

---

## Related Links

- [Metrics API](./metrics.md)
