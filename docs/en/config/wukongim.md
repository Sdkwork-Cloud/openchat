# 悟空IM 配置

## 基本配置

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

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `WUKONGIM_API_URL` | API 地址 | `http://localhost:5001` |
| `WUKONGIM_TCP_ADDR` | TCP 地址 | `localhost:5100` |
| `WUKONGIM_WS_URL` | WebSocket 地址 | `ws://localhost:5200` |
