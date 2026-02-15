# Database Configuration

## PostgreSQL Configuration

```json
{
  "database": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "openchat",
    "password": "password",
    "database": "openchat",
    "synchronize": false,
    "logging": false
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USER` | Database user | `openchat` |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `openchat` |

## Connection Pool

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_POOL_SIZE` | Pool size | `10` |
| `DB_POOL_IDLE` | Idle timeout (ms) | `10000` |

## Performance Tuning

- Use connection pooling for production
- Set appropriate pool size based on load
- Enable SSL for production environments

## Next Steps

- [Server Configuration](./server.md) - Server config
- [WuKongIM Configuration](./wukongim.md) - IM service config
