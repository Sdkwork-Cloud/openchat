# WuKongIM Configuration

## Basic Configuration

```json
{
  "im": {
    "provider": "wukongim",
    "enabled": true,
    "wukongim": {
      "apiUrl": "http://localhost:5001",
      "tcpAddr": "localhost:5100",
      "wsUrl": "ws://localhost:5200",
      "tokenAuth": false
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WUKONGIM_API_URL` | API URL | `http://localhost:5001` |
| `WUKONGIM_TCP_ADDR` | TCP Address | `localhost:5100` |
| `WUKONGIM_WS_URL` | WebSocket URL | `ws://localhost:5200` |

## Connection Endpoints

| Endpoint | Port | Protocol |
|----------|------|----------|
| API | 5001 | HTTP |
| TCP | 5100 | TCP |
| WebSocket | 5200 | WebSocket |
| Manager | 5300 | HTTP |

## Next Steps

- [Server Configuration](./server.md) - Server config
- [Database Configuration](./database.md) - Database config
