# Configuration Overview

OpenChat supports configuration via config files and environment variables.

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

Via `.env` file or system environment:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
```

## Configuration Priority

Environment Variables > Config File > Default Values

## Configuration Categories

- [Server Configuration](./server)
- [Database Configuration](./database)
- [WuKongIM Configuration](./wukongim)
- [RTC Configuration](./rtc)
- [AI Configuration](./ai)
