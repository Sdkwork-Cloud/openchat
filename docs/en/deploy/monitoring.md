# Monitoring and Alerting

This page provides default observability assets for OpenChat WebSocket Presence ACL cache, including Prometheus alert rules and a Grafana dashboard.

## Asset List

| Type | File | Description |
|------|------|-------------|
| Prometheus rules | `etc/alerts.ws-presence-acl.yml` | Alerts for hit rate, capacity, and invalidation spikes |
| Prometheus config | `etc/prometheus.yml` | `rule_files` already includes the ACL rules file |
| Grafana dashboard | `etc/grafana/openchat-ws-presence-acl-dashboard.json` | Hit rate, miss QPS, invalidations by trigger, capacity usage |

## Prometheus Rule Integration

1. Ensure `rule_files` includes:

```yaml
rule_files:
  - /etc/prometheus/alerts.yml
  - /etc/prometheus/alerts.ws-presence-acl.yml
```

2. Reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

3. Validate in Prometheus UI:

```bash
http://localhost:9090/rules
```

## Grafana Dashboard Import

1. Open `Dashboards -> Import` in Grafana.  
2. Choose `etc/grafana/openchat-ws-presence-acl-dashboard.json`.  
3. Bind your Prometheus datasource (`DS_PROMETHEUS` by default).

## Default Alerts

| Alert | Severity | Meaning |
|-------|----------|---------|
| `WsPresenceAclCacheHitRateLow` | warning | 10-minute hit rate below 70% with real traffic |
| `WsPresenceAclCacheCapacityHigh` | warning | Cache entries exceed 90% of max |
| `WsPresenceAclEventInvalidationSpike` | warning | Event-driven invalidations spike |
| `WsPresenceAclCacheMissQpsHigh` | critical | Sustained high miss QPS |

## Suggested Troubleshooting Flow

1. Hit rate drop + event invalidation spike: inspect batch friend/group relation changes.  
2. Hit rate drop + capacity alert: re-evaluate `MAX_PRESENCE_ACL_ALLOWED_CACHE_SIZE`.  
3. High miss QPS + rising DB load: inspect shared-group ACL SQL latency and index health.
