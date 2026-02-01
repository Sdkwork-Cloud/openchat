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

- [服务端配置](./server)
- [数据库配置](./database)
- [悟空IM 配置](./wukongim)
- [RTC 配置](./rtc)
- [AI 配置](./ai)
