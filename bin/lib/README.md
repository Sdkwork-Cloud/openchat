# OpenChat 脚本模块

## 模块说明

此目录包含 OpenChat 启动脚本的模块化组件，支持 PowerShell 和 Bash 两种版本。

## 文件结构

### PowerShell 模块 (.ps1)

```
lib/
├── config.ps1    # 配置和路径定义
├── logger.ps1    # 日志输出函数
├── port.ps1      # 端口管理功能
├── process.ps1   # 进程管理功能
├── service.ps1   # 服务控制功能
├── logs.ps1      # 日志管理功能
└── help.ps1      # 帮助信息
```

### Bash 模块 (.sh)

```
lib/
├── config.sh     # 配置和路径定义
├── logger.sh     # 日志输出函数
├── port.sh       # 端口管理功能
├── process.sh    # 进程管理功能
├── service.sh    # 服务控制功能
├── logs.sh       # 日志管理功能
└── help.sh       # 帮助信息
```

## 模块依赖关系

```
config (基础配置)
    ↑
logger (日志输出)
    ↑
port, process (工具模块)
    ↑
service, logs, help (功能模块)
```

## 扩展指南

### 添加新命令

1. 在 `service.sh` (Bash) 或 `service.ps1` (PowerShell) 中添加函数
2. 在 `help.sh` / `help.ps1` 中添加帮助信息
3. 在主脚本 `openchat` / `openchat.ps1` 中添加命令路由

### 添加新模块

1. 在 `lib/` 目录创建新模块文件，如 `backup.sh` / `backup.ps1`
2. 在主脚本的模块导入列表中添加新模块
3. 在主程序中添加对应的路由逻辑

## 注意事项

### Bash
- 所有模块使用 `source` 命令导入
- 共享变量使用 `export` 导出
- 函数命名使用小写字母和下划线

### PowerShell
- 所有模块使用 `. $PSScriptRoot\<module>.ps1` 方式导入
- 共享变量使用 `$script:` 作用域
- 函数命名使用 `Verb-Noun` 规范

## 调试

### Bash
```bash
# 测试单个模块
source lib/config.sh
source lib/logger.sh
init_colors
log_info "Test message"
```

### PowerShell
```powershell
# 测试单个模块
. .\lib\config.ps1
. .\lib\logger.ps1
Write-Info "Test message"
```
