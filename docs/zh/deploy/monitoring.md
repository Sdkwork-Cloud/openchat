# 监控与告警

本页提供 OpenChat WebSocket Presence ACL 缓存的默认监控模板，包括 Prometheus 告警规则和 Grafana 仪表盘。

## 资产清单

| 类型 | 文件 | 说明 |
|------|------|------|
| Prometheus 规则 | `etc/alerts.ws-presence-acl.yml` | ACL 缓存命中率、容量、失效风暴告警 |
| Prometheus 配置 | `etc/prometheus.yml` | 已添加 `rule_files` 引用 |
| Grafana Dashboard | `etc/grafana/openchat-ws-presence-acl-dashboard.json` | 命中率、未命中 QPS、失效触发分布、容量利用率 |

## Prometheus 告警接入

1. 确认 Prometheus 配置包含以下规则文件：

```yaml
rule_files:
  - /etc/prometheus/alerts.yml
  - /etc/prometheus/alerts.ws-presence-acl.yml
```

2. 重新加载 Prometheus：

```bash
curl -X POST http://localhost:9090/-/reload
```

3. 在 Prometheus UI 校验规则：

```bash
http://localhost:9090/rules
```

## Grafana 仪表盘导入

1. 打开 Grafana `Dashboards -> Import`。  
2. 选择文件 `etc/grafana/openchat-ws-presence-acl-dashboard.json`。  
3. 绑定 Prometheus 数据源（默认变量名：`DS_PROMETHEUS`）。

## 默认告警项

| 告警名 | 级别 | 含义 |
|--------|------|------|
| `WsPresenceAclCacheHitRateLow` | warning | 10 分钟命中率低于 70% 且有实际访问流量 |
| `WsPresenceAclCacheCapacityHigh` | warning | 缓存条目超过上限 90% |
| `WsPresenceAclEventInvalidationSpike` | warning | 事件驱动失效速率过高 |
| `WsPresenceAclCacheMissQpsHigh` | critical | 未命中 QPS 持续高位 |

## 建议联动排查

1. 命中率下降 + 事件失效突增：优先检查好友/群关系批量变更任务。  
2. 命中率下降 + 容量告警：评估 `MAX_PRESENCE_ACL_ALLOWED_CACHE_SIZE` 是否偏小。  
3. 未命中 QPS 高 + DB 压力上升：检查同群 ACL 查询慢 SQL 与索引状态。
