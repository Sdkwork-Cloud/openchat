# 快速部署

本指南帮助您快速部署 OpenChat，适合首次体验和快速验证。

## 安装向导（推荐）

### Linux / macOS

```bash
# 下载并运行安装向导
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.sh | bash

# 或克隆后运行
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/setup-wizard.sh
```

### Windows

```powershell
# 下载并运行安装向导
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.bat" -OutFile "setup-wizard.bat"
.\setup-wizard.bat
```

## 安装向导功能

安装向导将引导您完成以下步骤：

1. **选择安装环境** - 开发/测试/生产
2. **选择安装模式** - Docker/独立部署/混合模式
3. **配置数据库** - 使用内置或外部 PostgreSQL
4. **配置缓存** - 使用内置或外部 Redis
5. **生成配置文件** - 自动创建 .env 文件
6. **启动服务** - 一键启动所有服务

## 一键脚本

如果您熟悉 Docker，可以直接使用一键脚本：

```bash
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 运行安装脚本
./scripts/install.sh

# 或使用快速安装
./scripts/quick-install.sh
```

## 验证安装

### 1. 检查服务状态

```bash
# 查看容器状态
docker compose ps

# 运行安装测试
./scripts/install-test.sh quick
```

### 2. 检查服务健康

```bash
# 健康检查
curl http://localhost:3000/health

# API 文档
open http://localhost:3000/api/docs
```

### 3. 查看日志

```bash
# 查看所有日志
docker compose logs -f

# 查看应用日志
docker compose logs -f app
```

## 访问服务

安装成功后，可以访问以下服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| OpenChat API | http://localhost:3000 | 主服务 API |
| API 文档 | http://localhost:3000/api/docs | Swagger 文档 |
| 健康检查 | http://localhost:3000/health | 服务健康状态 |
| WukongIM Demo | http://localhost:5172 | IM 演示页面 |
| WukongIM 管理 | http://localhost:5300/web | IM 管理后台 |
| Prometheus | http://localhost:9090 | 监控面板 |

## 运维工具

OpenChat 提供完整的运维工具：

```bash
# 系统预检查
./scripts/precheck.sh

# 完整测试
./scripts/install-test.sh full

# 错误诊断
./scripts/diagnose.sh

# 自动修复
./scripts/auto-fix.sh --all

# 日志分析
./scripts/log-analyzer.sh analyze

# 健康监控
./scripts/health-check.sh --monitor
```

## 常见问题

### 安装失败

```bash
# 检查安装状态
./scripts/install-manager.sh status

# 恢复安装
./scripts/install-manager.sh resume

# 重置安装
./scripts/install-manager.sh reset
```

### 服务无法启动

```bash
# 运行诊断
./scripts/diagnose.sh

# 自动修复
./scripts/auto-fix.sh --all
```

### 端口被占用

```bash
# 检查端口
lsof -i :3000

# 修改端口
PORT=3001 docker compose up -d
```

## 下一步

- [Docker 部署](./docker) - 详细 Docker 部署指南
- [配置说明](../config/) - 完整配置参数
- [API 文档](../api/) - API 使用说明
