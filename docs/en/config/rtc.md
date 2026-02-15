# RTC Configuration

## Volcengine RTC

```json
{
  "rtc": {
    "enabled": true,
    "defaultProvider": "volcengine",
    "providers": {
      "volcengine": {
        "appId": "your-app-id",
        "appKey": "your-app-key",
        "appSecret": "your-app-secret"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VOLCENGINE_APP_ID` | Volcengine App ID |
| `VOLCENGINE_APP_KEY` | Volcengine App Key |
| `VOLCENGINE_APP_SECRET` | Volcengine App Secret |

## Supported Providers

| Provider | Features |
|----------|----------|
| Volcengine | Audio/Video calls, Live streaming |
| Tencent Cloud | Audio/Video calls, Live streaming |
| Agora | Audio/Video calls |

## Next Steps

- [Server Configuration](./server.md) - Server config
- [AI Configuration](./ai.md) - AI config
