# Configuration Overview

OpenChat supports configuration via config files and environment variables. For runtime deployment, prefer environment-specific files over a single shared `.env`.

## Configuration Methods

### 1. Config File

Edit `etc/config.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "database": {
    "host": "localhost",
    "port": 5432
  }
}
```

### 2. Environment Variables

Via environment-specific files or system environment:

```env
NODE_ENV=development
PORT=7200
DB_HOST=localhost
DB_PORT=5432
```

## Configuration Priority

Environment Variables > Config File > Default Values

## Configuration Categories

| Category                                | Description                                |
| --------------------------------------- | ------------------------------------------ |
| [Server Configuration](./server.md)     | Basic service, database, Redis, JWT config |
| [Database Configuration](./database.md) | Connection pool, performance optimization  |
| [WuKongIM Configuration](./wukongim.md) | WukongIM integration config                |
| [RTC Configuration](./rtc.md)           | Audio/video call config                    |
| [AI Configuration](./ai.md)             | AI assistant, LLM config                   |

## Quick Configuration

### Development Environment

```bash
# Review the development profile
vim .env.development

# Use the development profile
docker compose --env-file .env.development --profile database --profile cache --profile im up -d
```

### Production Environment

```bash
# Review the production profile
vim .env.production
```

**Must Modify:**

| Config           | Description                        |
| ---------------- | ---------------------------------- |
| `JWT_SECRET`     | JWT secret, at least 32 characters |
| `DB_PASSWORD`    | Database password                  |
| `REDIS_PASSWORD` | Redis password                     |
| `EXTERNAL_IP`    | Server external IP                 |

## Related Links

- [Deployment Guide](../deploy/installation.md)
- [Docker Deployment](../deploy/docker.md)
- [Environment Variables Example](https://github.com/Sdkwork-Cloud/openchat/blob/main/.env.example)
