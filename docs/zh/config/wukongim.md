# WukongIM 配置

WukongIM 是 OpenChat 的核心消息引擎，负责消息的实时推送、离线存储和同步。

## 环境变量配置

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `WUKONGIM_API_URL` | HTTP API 地址 | `http://localhost:5001` | 是 |
| `WUKONGIM_TCP_ADDR` | TCP 连接地址 | `localhost:5100` | 是 |
| `WUKONGIM_WS_URL` | WebSocket 地址 | `ws://localhost:5200` | 是 |
| `WUKONGIM_MANAGER_URL` | 管理后台地址 | `http://localhost:5300` | 否 |

## Docker Compose 配置

```yaml
# docker-compose.yml
services:
  wukongim:
    image: registry.cn-shanghai.aliyuncs.com/wukongim/wukongim:latest
    container_name: openchat-wukongim
    environment:
      - WK_MODE=release
      - WK_EXTERNAL_IP=${EXTERNAL_IP}
    volumes:
      - wukongim_data:/home/wukongim
    ports:
      - "5001:5001"   # API
      - "5100:5100"   # TCP
      - "5200:5200"   # WebSocket
      - "5300:5300"   # Manager
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  wukongim_data:
```

## 环境变量示例

```bash
# .env
WUKONGIM_API_URL=http://wukongim:5001
WUKONGIM_TCP_ADDR=wukongim:5100
WUKONGIM_WS_URL=ws://wukongim:5200
WUKONGIM_MANAGER_URL=http://wukongim:5300
```

## 连接地址说明

### 端口用途

| 端口 | 协议 | 用途 | 客户端 |
|------|------|------|--------|
| 5001 | HTTP | API 接口 | 服务端调用 |
| 5100 | TCP | 长连接 | 移动端 |
| 5200 | WebSocket | 实时连接 | Web 端 |
| 5300 | HTTP | 管理后台 | 管理员 |

### 客户端配置

```typescript
// Web 客户端
const client = new OpenChatClient({
  serverUrl: 'http://your-server:3000',
  imConfig: {
    wsUrl: 'ws://your-server:5200'
  }
});

// 移动端客户端
const client = new OpenChatClient({
  serverUrl: 'http://your-server:3000',
  imConfig: {
    tcpAddr: 'your-server:5100',
    wsUrl: 'ws://your-server:5200'
  }
});
```

## 外部 IP 配置

如果服务器在 NAT 网络后面，需要配置外部 IP：

```bash
# .env
EXTERNAL_IP=your-public-ip
```

或在 Docker Compose 中：

```yaml
services:
  wukongim:
    environment:
      - WK_EXTERNAL_IP=123.45.67.89
```

## 消息存储配置

### 数据保留策略

```yaml
# wukongim 配置
message:
  retention:
    days: 30          # 消息保留天数
    max_count: 10000  # 单会话最大消息数
```

### 离线消息

```yaml
offline:
  enabled: true
  max_count: 1000     # 离线消息最大数量
  expire_days: 7      # 离线消息过期天数
```

## 集群配置

### 多节点部署

```yaml
# docker-compose.yml
services:
  wukongim-1:
    image: registry.cn-shanghai.aliyuncs.com/wukongim/wukongim:latest
    environment:
      - WK_CLUSTER_NODE_ID=1
      - WK_CLUSTER_NODES=wukongim-1:11110,wukongim-2:11110

  wukongim-2:
    image: registry.cn-shanghai.aliyuncs.com/wukongim/wukongim:latest
    environment:
      - WK_CLUSTER_NODE_ID=2
      - WK_CLUSTER_NODES=wukongim-1:11110,wukongim-2:11110
```

### 负载均衡

```nginx
# nginx.conf
upstream wukongim_tcp {
    server wukongim-1:5100;
    server wukongim-2:5100;
}

upstream wukongim_ws {
    server wukongim-1:5200;
    server wukongim-2:5200;
}
```

## 监控配置

### Prometheus 监控

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'wukongim'
    static_configs:
      - targets: ['wukongim:5300']
```

### 健康检查

```bash
# API 健康检查
curl http://localhost:5001/health

# 连接测试
telnet localhost 5100

# WebSocket 测试
wscat -c ws://localhost:5200
```

## 管理后台

### 访问管理后台

```
http://localhost:5300/web
```

### 管理功能

- 用户管理
- 消息查询
- 在线状态监控
- 系统配置
- 日志查看

## 安全配置

### Token 认证

```bash
# .env
WUKONGIM_TOKEN_AUTH=true
WUKONGIM_SECRET=your-secret-key
```

### 访问控制

```yaml
security:
  allowed_origins:
    - https://your-domain.com
  rate_limit:
    enabled: true
    requests_per_second: 100
```

## 故障排除

### 连接失败

```bash
# 检查服务状态
docker compose ps wukongim

# 检查端口
netstat -tlnp | grep -E '5001|5100|5200'

# 查看日志
docker compose logs wukongim
```

### 消息发送失败

```bash
# 检查 API 连接
curl http://localhost:5001/v1/messages

# 检查用户在线状态
curl http://localhost:5001/v1/users/online?uids=user1,user2
```

### 性能问题

```bash
# 查看连接数
curl http://localhost:5300/api/connections

# 查看内存使用
docker stats wukongim
```

## 相关链接

- [WukongIM 官方文档](https://githubim.com/)
- [WukongIM GitHub](https://github.com/WuKongIM/WuKongIM)
- [消息管理 API](../api/messages.md)
- [服务端配置](./server.md)
