# OpenChat 部署指南

本文档说明如何部署和运行 OpenChat。

## 目录结构

```
openchat/
├── bin/                    # 可执行脚本
│   ├── openchat     # Linux/Mac 启动脚本
│   └── openchat.bat # Windows 启动脚本
├── etc/                    # 配置文件
│   └── config.json         # 主配置文件
├── var/                    # 运行时数据
│   ├── logs/              # 日志文件
│   ├── run/               # PID 文件
│   └── data/              # 数据文件
├── scripts/               # 工具脚本
│   ├── install.sh         # Linux/Mac 安装脚本
│   ├── install.bat        # Windows 安装脚本
│   └── docker-deploy.sh   # Docker 部署脚本
├── database/              # 数据库脚本
│   ├── schema.sql         # DDL 脚本
│   ├── seed.sql           # 测试数据
│   └── README.md          # 数据库文档
├── k8s/                   # Kubernetes 配置
│   ├── base/              # 基础配置
│   └── overlays/          # 环境配置
├── Dockerfile             # Docker 镜像构建
├── docker-compose.yml     # 开发环境编排
├── docker-compose.prod.yml # 生产环境编排
└── DEPLOYMENT.md          # 本文件
```

## 部署方式

### 方式一：Docker 部署（推荐）

#### 快速开始

```bash
# 1. 构建并启动开发环境
./scripts/docker-deploy.sh build
./scripts/docker-deploy.sh up

# 2. 查看服务状态
docker compose ps

# 3. 查看日志
./scripts/docker-deploy.sh logs
```

#### Docker 部署脚本命令

| 命令 | 说明 |
|------|------|
| `build` | 构建 Docker 镜像 |
| `build:no-cache` | 构建镜像（不使用缓存） |
| `up` | 启动开发环境 |
| `down` | 停止开发环境 |
| `restart` | 重启开发环境 |
| `logs` | 查看实时日志 |
| `prod:up` | 启动生产环境 |
| `prod:down` | 停止生产环境 |
| `prod:deploy` | 部署生产环境（包含构建） |
| `push` | 推送镜像到仓库 |
| `pull` | 拉取最新镜像 |
| `clean` | 清理未使用的资源 |

#### 开发环境

```bash
# 启动所有服务（包含 PostgreSQL、Redis、悟空IM）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 完全清理（包含数据卷）
docker compose down -v
```

#### 生产环境

```bash
# 1. 配置环境变量
cp .env.example .env.prod
# 编辑 .env.prod 文件，设置生产环境参数

# 2. 部署生产环境
./scripts/docker-deploy.sh prod:deploy

# 或使用 docker compose 直接部署
docker compose -f docker-compose.prod.yml up -d

# 3. 查看生产环境状态
docker compose -f docker-compose.prod.yml ps
```

#### 手动构建镜像

```bash
# 构建镜像
docker build -t openchat/server:latest .

# 构建指定版本
docker build -t openchat/server:v1.0.0 .

# 运行容器
docker run -d \
  --name openchat \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=your-password \
  -v $(pwd)/etc/config.json:/app/etc/config.json:ro \
  -v $(pwd)/var/logs:/app/var/logs \
  openchat/server:latest
```

### 方式二：Kubernetes 部署

#### 使用 Kustomize 部署

```bash
# 1. 部署到开发环境
kubectl apply -k k8s/base

# 2. 部署到生产环境
kubectl apply -k k8s/overlays/production

# 3. 查看部署状态
kubectl get pods -n openchat
kubectl get svc -n openchat
kubectl get ingress -n openchat
```

#### 手动部署

```bash
# 创建命名空间
kubectl apply -f k8s/base/namespace.yaml

# 创建 ConfigMap 和 Secret
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml

# 部署应用
kubectl apply -f k8s/base/deployment.yaml
kubectl apply -f k8s/base/service.yaml

# 创建 Ingress（需要 Ingress Controller）
kubectl apply -f k8s/base/ingress.yaml
```

#### 查看日志和状态

```bash
# 查看 Pod 状态
kubectl get pods -n openchat

# 查看日志
kubectl logs -f deployment/openchat -n openchat

# 进入容器
kubectl exec -it deployment/openchat -n openchat -- /bin/sh

# 端口转发（本地调试）
kubectl port-forward svc/openchat 3000:3000 -n openchat
```

### 方式三：传统部署（二进制/源码）

#### 使用安装脚本（推荐）

**Linux / macOS:**

```bash
# 1. 克隆或解压项目
cd openchat

# 2. 运行安装脚本
sudo ./scripts/install.sh

# 3. 启动服务
sudo systemctl start openchat

# 4. 查看状态
sudo systemctl status openchat
```

**Windows:**

```powershell
# 1. 以管理员身份运行 PowerShell
# 2. 进入项目目录
cd openchat

# 3. 运行安装脚本
.\scripts\install.bat

# 4. 启动服务
.\bin\openchat.bat start
```

#### 手动部署

```bash
# 1. 安装依赖
npm install

# 2. 构建应用
npm run build

# 3. 配置数据库
createdb openchat
psql -d openchat -f database/schema.sql

# 4. 编辑配置文件
vim etc/config.json

# 5. 启动服务
./bin/openchat start
```

## 服务管理

### Docker 环境

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f

# 执行命令
docker compose exec app node -v
```

### Kubernetes 环境

```bash
# 查看 Pod
kubectl get pods -n openchat

# 查看服务
kubectl get svc -n openchat

# 扩缩容
kubectl scale deployment openchat --replicas=3 -n openchat

# 滚动更新
kubectl set image deployment/openchat openchat=openchat/server:v1.1.0 -n openchat

# 回滚
kubectl rollout undo deployment/openchat -n openchat
```

### 传统部署

#### 启动脚本命令

| 命令 | 说明 |
|------|------|
| `start` | 启动服务（后台模式） |
| `stop` | 停止服务 |
| `restart` | 重启服务 |
| `status` | 查看服务状态 |
| `console` | 前台运行（调试模式） |
| `health` | 健康检查 |
| `logs` | 查看实时日志 |
| `clean` | 清理旧日志 |

#### systemd (Linux)

```bash
# 启动服务
sudo systemctl start openchat

# 停止服务
sudo systemctl stop openchat

# 重启服务
sudo systemctl restart openchat

# 查看状态
sudo systemctl status openchat

# 设置开机自启
sudo systemctl enable openchat

# 查看日志
sudo journalctl -u openchat -f
```

## 环境变量

### Docker 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口 | `3000` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `DB_HOST` | 数据库主机 | `postgres` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_USERNAME` | 数据库用户名 | `openchat` |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_DATABASE` | 数据库名称 | `openchat` |
| `REDIS_HOST` | Redis 主机 | `redis` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | - |
| `JWT_SECRET` | JWT 密钥 | - |

### 传统部署环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口 | `3000` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `OPENCHAT_HOME` | 应用根目录 | - |
| `OPENCHAT_CONFIG` | 配置文件路径 | `etc/config.json` |
| `OPENCHAT_LOG_DIR` | 日志目录 | `var/logs` |
| `OPENCHAT_DATA_DIR` | 数据目录 | `var/data` |

## 配置文件说明

### 数据库配置

```json
{
  "database": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "openchat",
    "password": "your-password",
    "database": "openchat",
    "synchronize": false,
    "logging": false,
    "poolSize": 10
  }
}
```

### IM 配置（悟空IM）

```json
{
  "im": {
    "provider": "wukongim",
    "wukongim": {
      "apiUrl": "http://localhost:18080",
      "appKey": "your-app-key",
      "appSecret": "your-app-secret"
    }
  }
}
```

### RTC 配置

```json
{
  "rtc": {
    "enabled": true,
    "defaultProvider": "volcengine",
    "providers": {
      "volcengine": {
        "appId": "your-app-id",
        "appKey": "your-app-key",
        "appSecret": "your-app-secret",
        "region": "cn-north-1"
      }
    }
  }
}
```

## 监控与健康检查

### 健康检查端点

```bash
# HTTP 健康检查
curl http://localhost:3000/health

# 预期响应
{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

### Docker 健康检查

Docker 镜像已配置健康检查：

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
```

### Kubernetes 健康检查

已配置 livenessProbe 和 readinessProbe：

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## 日志管理

### Docker 日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f app

# 查看最近 100 行
docker compose logs --tail=100 app
```

### Kubernetes 日志

```bash
# 查看 Pod 日志
kubectl logs -f deployment/openchat -n openchat

# 查看之前的日志
kubectl logs --previous deployment/openchat -n openchat

# 查看所有 Pod 日志
kubectl logs -f -l app=openchat -n openchat
```

### 传统部署日志

- **Linux / macOS**: `/opt/openchat/var/logs/`
- **Windows**: `C:\Program Files\OpenChat\var\logs\`

## 故障排查

### Docker 问题

```bash
# 查看容器状态
docker compose ps

# 查看容器日志
docker compose logs

# 进入容器调试
docker compose exec app /bin/sh

# 检查网络
docker network ls
docker network inspect openchat_default
```

### Kubernetes 问题

```bash
# 查看 Pod 事件
kubectl get events -n openchat

# 查看 Pod 详情
kubectl describe pod <pod-name> -n openchat

# 查看 Deployment 详情
kubectl describe deployment openchat -n openchat

# 查看 Service 详情
kubectl describe svc openchat -n openchat
```

### 数据库连接问题

```bash
# 测试数据库连接
docker compose exec postgres psql -U openchat -d openchat -c "SELECT 1;"

# 查看数据库日志
docker compose logs postgres
```

## 升级

### Docker 升级

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
./scripts/docker-deploy.sh build:no-cache

# 3. 重新部署
./scripts/docker-deploy.sh prod:deploy
```

### Kubernetes 升级

```bash
# 1. 更新镜像
kubectl set image deployment/openchat-server \
  openchat-server=openchat/server:v1.1.0 -n openchat

# 2. 查看滚动更新状态
kubectl rollout status deployment/openchat-server -n openchat

# 3. 如需回滚
kubectl rollout undo deployment/openchat-server -n openchat
```

### 传统部署升级

```bash
# 1. 备份数据
pg_dump openchat > backup.sql

# 2. 停止服务
./bin/openchat stop

# 3. 更新代码
git pull

# 4. 安装依赖并构建
npm install && npm run build

# 5. 执行数据库迁移
psql -d openchat -f database/migrate.sql

# 6. 启动服务
./bin/openchat start
```

## 安全建议

1. **修改默认密码**: 立即修改数据库密码、JWT Secret 和 Redis 密码
2. **使用 HTTPS**: 生产环境必须使用 HTTPS（配置 Ingress TLS）
3. **网络隔离**: 使用 Docker 网络或 Kubernetes NetworkPolicy 隔离服务
4. **密钥管理**: 生产环境使用 Kubernetes Secrets 或外部密钥管理服务
5. **定期备份**: 设置自动备份任务（数据库和配置文件）
6. **日志审计**: 定期检查日志文件，配置日志收集（如 ELK、Fluentd）
7. **镜像安全**: 定期更新基础镜像，扫描镜像漏洞
8. **资源限制**: 配置容器的 CPU 和内存限制

## 性能优化

### Docker 优化

```yaml
# docker-compose.prod.yml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

### Kubernetes 优化

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### 数据库优化

PostgreSQL 配置优化（docker-compose.prod.yml）：

```yaml
command:
  - "postgres"
  - "-c"
  - "max_connections=200"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=768MB"
```

## 支持

如有问题，请查看：

- 日志文件: `var/logs/stdout.log`
- 项目文档: `README.md`
- 数据库文档: `database/README.md`
- Docker 文档: `https://docs.docker.com/`
- Kubernetes 文档: `https://kubernetes.io/docs/`
