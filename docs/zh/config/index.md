# 配置概览

OpenChat 支持通过配置文件和环境变量进行配置。

## 配置方式

### 1. 配置文件

编辑 `etc/config.json` 文件：

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

### 2. 环境变量

通过 `.env` 文件或系统环境变量配置：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
```

## 配置优先级

环境变量 > 配置文件 > 默认值

## 配置分类

| 分类 | 说明 |
|------|------|
| [服务端配置](./server.md) | 基础服务、数据库、Redis、JWT 配置 |
| [数据库配置](./database.md) | 数据库连接池、性能优化配置 |
| [悟空IM 配置](./wukongim.md) | WukongIM 集成配置 |
| [RTC 配置](./rtc.md) | 音视频通话配置 |
| [AI 配置](./ai.md) | AI 助手、大模型配置 |

## 快速配置

### 开发环境

```bash
# 复制开发环境配置
cp .env.example .env

# 使用默认配置即可
docker compose -f docker-compose.quick.yml up -d
```

### 生产环境

```bash
# 复制生产环境配置
cp .env.example .env

# 编辑配置（必须修改以下配置）
vim .env
```

**必须修改的配置：**

| 配置项 | 说明 |
|--------|------|
| `JWT_SECRET` | JWT 密钥，至少 32 个字符 |
| `DB_PASSWORD` | 数据库密码 |
| `REDIS_PASSWORD` | Redis 密码 |
| `EXTERNAL_IP` | 服务器外网 IP |

## 相关链接

- [部署指南](../deploy/installation.md)
- [Docker 部署](../deploy/docker.md)
- [环境变量示例](https://github.com/Sdkwork-Cloud/openchat/blob/main/.env.example)
