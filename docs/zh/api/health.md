
# 健康检查 API

本页面提供 OpenChat 服务器健康检查相关的 API 文档。

## 接口列表

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/health` | 基础健康检查 | 否 |
| GET | `/health/detailed` | 详细健康检查 | 否 |
| GET | `/ready` | 就绪检查 | 否 |
| GET | `/live` | 存活检查 | 否 |

## 接口详情

### 基础健康检查

检查应用是否正常运行。

**请求：**

```http
GET /health
```

**响应示例：**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 健康状态：`ok` 或 `error` |
| timestamp | string | ISO 8601 格式的时间戳 |

---

### 详细健康检查

检查所有依赖服务的健康状态。

**请求：**

```http
GET /health/detailed
```

**响应示例：**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "ok",
      "responseTime": 5,
      "details": {
        "connected": true
      }
    },
    "redis": {
      "status": "ok",
      "responseTime": 2,
      "details": {
        "connected": true
      }
    },
    "queue": {
      "status": "ok",
      "enabled": true,
      "details": {
        "waiting": 0,
        "active": 0,
        "failed": 0
      }
    },
    "imProvider": {
      "status": "ok",
      "responseTime": 10,
      "details": {
        "initialized": true
      }
    }
  },
  "memory": {
    "used": 256,
    "total": 512,
    "percentage": 50,
    "rss": 768,
    "external": 32
  },
  "eventLoop": {
    "lag": 5,
    "status": "ok"
  }
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 整体健康状态：`healthy`、`degraded` 或 `unhealthy` |
| timestamp | string | ISO 8601 格式的时间戳 |
| version | string | 应用版本号 |
| uptime | number | 运行时间（秒） |
| services | object | 各服务健康状态 |
| services.database | object | 数据库服务状态 |
| services.redis | object | Redis 服务状态 |
| services.queue | object | 队列服务状态（可选） |
| services.imProvider | object | IM 服务状态（可选） |
| memory | object | 内存使用情况（MB） |
| eventLoop | object | 事件循环状态 |

---

### 就绪检查

检查应用是否已准备好接收流量（用于 Kubernetes 就绪探针）。

**请求：**

```http
GET /ready
```

**响应示例：**

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 就绪状态：`ready` 或 `not_ready` |
| checks | object | 各组件检查结果 |

---

### 存活检查

检查应用是否存活（用于 Kubernetes 存活探针）。

**请求：**

```http
GET /live
```

**响应示例：**

```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 存活状态：`alive` |
| timestamp | string | ISO 8601 格式的时间戳 |

