# 传统部署

## 环境要求

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

## 部署步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 构建
npm run build

# 4. 启动
npm start
```

## 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start dist/main.js --name openchat-server

# 查看状态
pm2 status
```
