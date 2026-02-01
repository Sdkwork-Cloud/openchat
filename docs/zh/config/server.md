# 服务端配置

## 基本配置

```json
{
  "app": {
    "name": "OpenChat Server",
    "version": "1.0.0",
    "env": "production"
  },
  "server": {
    "host": "0.0.0.0",
    "port": 3000,
    "baseUrl": "http://localhost:3000"
  }
}
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `NODE_ENV` | 运行环境 | `production` |
| `LOG_LEVEL` | 日志级别 | `info` |
