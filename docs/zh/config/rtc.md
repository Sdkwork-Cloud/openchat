# RTC 配置

## 火山引擎 RTC

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

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `VOLCENGINE_APP_ID` | 火山引擎 App ID |
| `VOLCENGINE_APP_KEY` | 火山引擎 App Key |
| `VOLCENGINE_APP_SECRET` | 火山引擎 App Secret |
