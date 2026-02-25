# OpenChat 启动脚本

跨平台的 OpenChat 服务启动脚本，支持 Windows (PowerShell)、Linux 和 macOS (Bash)。

## 脚本说明

| 脚本 | 平台 | 说明 |
|------|------|------|
| `openchat` | Linux/macOS/Windows Git Bash | Bash 启动脚本（模块化） |
| `openchat.ps1` | Windows PowerShell / PowerShell Core | PowerShell 启动脚本（模块化） |

## 功能特性

- ✅ **跨平台支持** - Windows、Linux、macOS 全支持
- ✅ **模块化设计** - 功能拆分到独立模块，便于维护扩展
- ✅ **路径自解析** - 从任何目录执行都能正确工作
- ✅ **端口自动检测** - 如果端口被占用，自动查找可用端口
- ✅ **后台/前台模式** - 支持后台服务和前台调试模式
- ✅ **服务生命周期管理** - 启动、停止、重启、状态查看
- ✅ **健康检查** - 检查服务运行状态
- ✅ **日志管理** - 查看实时日志、清理旧日志
- ✅ **平台检测** - 自动检测操作系统类型

## 使用方法

### Windows (PowerShell)

```powershell
# 显示帮助
.\bin\openchat.ps1 help

# 启动服务（后台模式）
.\bin\openchat.ps1 start

# 指定端口启动
.\bin\openchat.ps1 start -Port 8080

# 开发模式启动
.\bin\openchat.ps1 start -Environment development

# 停止服务
.\bin\openchat.ps1 stop

# 重启服务
.\bin\openchat.ps1 restart

# 查看状态
.\bin\openchat.ps1 status

# 前台运行（调试用）
.\bin\openchat.ps1 console

# 健康检查
.\bin\openchat.ps1 health

# 查看日志
.\bin\openchat.ps1 logs

# 清理旧日志
.\bin\openchat.ps1 clean
```

### Linux/macOS (Bash)

```bash
# 显示帮助
./bin/openchat help

# 启动服务（后台模式）
./bin/openchat start

# 指定端口启动
PORT=8080 ./bin/openchat start

# 开发模式启动
NODE_ENV=development ./bin/openchat console

# 停止服务
./bin/openchat stop

# 重启服务
./bin/openchat restart

# 查看状态
./bin/openchat status

# 前台运行（调试用）
./bin/openchat console

# 健康检查
./bin/openchat health

# 查看日志
./bin/openchat logs

# 清理旧日志
./bin/openchat clean
```

## 从任何目录执行

脚本支持从任何目录执行：

```bash
# 从项目根目录
./bin/openchat status

# 从其他目录
/home/user$ /opt/openchat/bin/openchat status
/home/user$ D:\openchat\bin\openchat.ps1 status
```

脚本会自动解析安装路径。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口 | `7200` |
| `HOST` | 监听地址 | `0.0.0.0` |

## 端口自动检测

启动时会自动检测端口是否可用：

```
# 如果 7200 被占用
[WARN] Port 7200 is in use, using port 7201

# 服务成功启动在 7201
[INFO] Access URL: http://0.0.0.0:7201
```

## 平台支持详情

### Windows
- PowerShell 5.1+
- PowerShell 7+ (PowerShell Core)
- Windows Terminal
- Git Bash (使用 Bash 脚本)

### Linux
- Ubuntu/Debian
- CentOS/RHEL/Fedora
- Alpine Linux
- 其他支持 Bash 的发行版

### macOS
- macOS 10.14+
- 支持 Intel 和 Apple Silicon (M1/M2)

## 模块化结构

脚本采用模块化设计，功能拆分到独立文件中：

```
bin/
├── openchat              # Bash 主脚本（精简入口）
├── openchat.ps1          # PowerShell 主脚本（精简入口）
├── README.md             # 使用文档
└── lib/                  # 模块化组件
    ├── config.sh/ps1     # 配置定义
    ├── logger.sh/ps1     # 日志输出
    ├── port.sh/ps1       # 端口管理
    ├── process.sh/ps1    # 进程管理
    ├── service.sh/ps1    # 服务控制
    ├── logs.sh/ps1       # 日志管理
    ├── help.sh/ps1       # 帮助信息
    └── README.md         # 模块说明
```

### 模块依赖关系

```
config (基础配置)
    ↑
logger (日志输出)
    ↑
port, process (工具模块)
    ↑
service, logs, help (功能模块)
```

## 扩展开发

### 添加新命令

1. 在 `lib/service.sh` (Bash) 或 `lib/service.ps1` (PowerShell) 中添加函数
2. 在 `lib/help.sh` / `lib/help.ps1` 中添加帮助信息
3. 在主脚本 `openchat` / `openchat.ps1` 中添加命令路由

示例：

```bash
# lib/service.sh
backup_data() {
    log_info "Backing up data..."
    # 实现备份逻辑
}

# openchat (主脚本)
backup)
    backup_data
    ;;
```

### 添加新模块

1. 在 `lib/` 目录创建新模块文件
2. 在主脚本的模块导入列表中添加
3. 在主程序中添加路由逻辑

详见 `lib/README.md`

## 目录结构

```
var/
├── logs/
│   └── stdout.log      # 标准输出日志
├── run/
│   └── openchat.pid    # 进程 PID 文件
└── data/               # 数据目录

error.log               # 错误日志（应用根目录）
```

## 健壮性检查

脚本包含以下健壮性检查：

1. **路径验证** - 检查 `dist/main.js` 存在，确保是有效的安装
2. **Node.js 检查** - 启动前验证 Node.js 是否安装
3. **构建检查** - 检查主程序文件是否存在
4. **进程验证** - PID 文件中的进程真实存在性检查
5. **端口冲突检测** - 多方法检测端口可用性（nc/lsof/ss/netstat/bash）
6. **目录自动创建** - 自动创建必要的日志和运行目录
7. **目录恢复** - 服务操作后恢复原始工作目录
8. **错误日志记录** - 详细的错误信息和日志输出
9. **符号链接支持** - Bash 脚本支持通过符号链接调用

## 故障排查

### 服务启动失败

1. 检查 Node.js 是否安装
2. 查看错误日志：`var/logs/stdout.log` 和 `error.log`
3. 检查端口是否被占用
4. 确认 `dist/main.js` 存在（需要运行 `pnpm build`）

### 端口被占用

脚本会自动检测并切换到下一个可用端口，无需手动处理。

### 权限问题 (Linux/macOS)

```bash
chmod +x bin/openchat
```

### 路径错误

如果从其他目录执行失败，请使用绝对路径：

```bash
/opt/openchat/bin/openchat status
```

## 许可证

MIT License
