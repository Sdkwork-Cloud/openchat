# 数据库配置

## PostgreSQL 配置

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

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_USER` | 数据库用户名 | `openchat` |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_NAME` | 数据库名称 | `openchat` |
