
# 监控指标 API

本页面提供 OpenChat 服务器监控指标相关的 API 文档。

## 接口列表

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/metrics` | Prometheus 指标端点 | 否 |

## 接口详情

### Prometheus 指标端点

获取 Prometheus 格式的监控指标。

**请求：**

```http
GET /metrics
```

**响应示例：**

```text
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/v1/messages",status="200"} 100
http_requests_total{method="POST",path="/api/v1/messages",status="201"} 50

# HELP http_request_duration_seconds Duration of HTTP requests
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 80
http_request_duration_seconds_bucket{le="0.5"} 140
http_request_duration_seconds_bucket{le="1"} 150
http_request_duration_seconds_sum 45.5
http_request_duration_seconds_count 150

# HELP nodejs_eventloop_lag_seconds Event loop lag
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0.005

# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 536870912

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 268435456

# HELP active_users Number of active users
# TYPE active_users gauge
active_users 1234

# HELP online_devices Number of online devices
# TYPE online_devices gauge
online_devices 5678
```

**响应格式：**

- Content-Type: `text/plain; charset=utf-8`
- 格式：Prometheus 文本格式

**常见指标说明：**

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `http_requests_total` | counter | HTTP 请求总数 |
| `http_request_duration_seconds` | histogram | HTTP 请求耗时分布 |
| `nodejs_eventloop_lag_seconds` | gauge | Node.js 事件循环延迟 |
| `nodejs_heap_size_total_bytes` | gauge | 堆内存总量 |
| `nodejs_heap_size_used_bytes` | gauge | 堆内存使用量 |
| `active_users` | gauge | 活跃用户数 |
| `online_devices` | gauge | 在线设备数 |

**使用说明：**

此端点可直接被 Prometheus 服务器采集。在 Prometheus 配置中添加：

```yaml
scrape_configs:
  - job_name: 'openchat'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
```

