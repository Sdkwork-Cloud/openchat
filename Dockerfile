# ============================================
# OpenChat Server - Dockerfile
# 多阶段构建，优化镜像大小
# ============================================

# 阶段 1: 依赖安装
FROM node:18-alpine AS dependencies

WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 复制 package 文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 阶段 2: 构建
FROM node:18-alpine AS builder

WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY src ./src

# 构建应用
RUN npm run build

# 阶段 3: 生产镜像
FROM node:18-alpine AS production

# 设置标签
LABEL maintainer="OpenChat Team"
LABEL version="1.0.0"
LABEL description="OpenChat Server - 即时通讯服务端"

# 安装必要的系统依赖
RUN apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建应用用户（非 root 运行）
RUN addgroup -g 1001 -S openchat && \
    adduser -S openchat -u 1001 -G openchat

# 设置工作目录
WORKDIR /app

# 创建必要的目录
RUN mkdir -p /app/bin /app/etc /app/var/logs /app/var/run /app/var/data && \
    chown -R openchat:openchat /app

# 从 dependencies 阶段复制生产依赖
COPY --from=dependencies /app/node_modules ./node_modules

# 从 builder 阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 复制启动脚本
COPY bin/openchat ./bin/
RUN chmod +x ./bin/openchat

# 复制配置文件
COPY etc/config.json ./etc/

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV OPENCHAT_HOME=/app
ENV OPENCHAT_CONFIG=/app/etc/config.json
ENV OPENCHAT_LOG_DIR=/app/var/logs
ENV OPENCHAT_DATA_DIR=/app/var/data

# 切换到非 root 用户
USER openchat

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动命令
CMD ["node", "dist/main.js"]
