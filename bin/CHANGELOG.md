# OpenChat 启动脚本更新日志

## Version 1.1.0

### 新增功能
- ✅ 跨平台支持 (Windows/Linux/macOS)
- ✅ 模块化设计，便于维护扩展
- ✅ 路径自解析，从任何目录执行
- ✅ 端口自动检测和自增
- ✅ 服务生命周期管理
- ✅ 健康检查
- ✅ 日志管理
- ✅ CPU 使用率显示
- ✅ 进程运行时间显示
- ✅ Node.js 版本检查 (最低 v16)

### 修复的问题

#### Bash 脚本

##### port.sh
1. **端口检测逻辑修复** - 修复了 `nc`、`lsof`、`ss`、`netstat` 的返回值逻辑
2. **端口范围验证** - 添加端口号码范围验证 (1-65535)
3. **端口溢出保护** - 添加端口超过 65535 的安全检查
4. **检测方法优先级** - 优先使用 bash 内置 `/dev/tcp` (最快最可靠)
5. **max_attempts 边界检查** - 检查是否有足够的端口范围

##### process.sh
1. **Node.js 版本检查** - 添加版本检查，警告低于 v16 的版本
2. **PID 验证增强** - 验证 PID 是否为有效数字
3. **僵尸 PID 文件处理** - 自动清理过期的 PID 文件
4. **目录创建错误处理** - 添加权限错误提示
5. **CPU 使用率获取** - 新增 `get_cpu_usage` 函数
6. **进程运行时间** - 新增 `get_process_uptime` 函数
7. **跨平台内存格式** - 支持 Linux 和 macOS 的 ps 格式
8. **参数验证** - 所有函数添加 PID 参数验证

##### logger.sh
1. **颜色初始化重复** - 使用 `COLORS_INITIALIZED` 标记只初始化一次
2. **颜色变量导出** - 导出颜色变量供其他模块使用
3. **空值保护** - 日志函数使用 `${VAR:-}` 防止未定义变量

##### config.sh
1. **变量导出完整** - 导出所有必要的变量 (`APP_NAME`, `APP_VERSION`, `SCRIPT_DIR`, `CONFIG_FILE`, `DEFAULT_*`)

##### service.sh
1. **错误处理增强** - 添加更多错误检查和处理
2. **目录切换错误处理** - 所有 `cd` 命令检查是否成功
3. **进程停止验证** - 验证进程是否真的停止了
4. **日志检查增强** - 检查更多成功标志 ("Listening", "started successfully")
5. **PID 文件空值处理** - 处理 PID 文件为空的情况
6. **服务状态增强** - 显示 CPU 使用率和运行时间
7. **console 退出码** - 返回 node 进程的退出码

##### logs.sh
1. **日志清理改进** - 使用更可靠的 find 循环

##### help.sh
1. **变量依赖** - 依赖 config.sh 导出的 `APP_NAME` 和 `APP_VERSION`

#### PowerShell 脚本
1. **路径分隔符处理** - 使用跨平台的 `PathSep` 变量
2. **平台检测** - 自动检测 Windows/Linux/macOS
3. **窗口样式处理** - `-WindowStyle` 只在 Windows 上使用
4. **错误处理** - 添加 `try-catch` 块处理各种错误情况

### 文件结构

```
bin/
├── openchat              # Bash 主脚本（精简入口）
├── openchat.ps1          # PowerShell 主脚本（精简入口）
├── README.md             # 使用文档
├── CHANGELOG.md          # 更新日志
└── lib/
    ├── config.sh/ps1     # 配置模块
    ├── logger.sh/ps1     # 日志模块
    ├── port.sh/ps1       # 端口模块
    ├── process.sh/ps1    # 进程模块
    ├── service.sh/ps1    # 服务模块
    ├── logs.sh/ps1       # 日志管理模块
    ├── help.sh/ps1       # 帮助模块
    └── README.md         # 模块文档
```

### 兼容性

- **Bash**: 4.0+ (Linux, macOS, Git Bash, MSYS, Cygwin)
- **PowerShell**: 5.1+, 7+ (Windows, Linux, macOS)

### 测试建议

1. 从不同目录执行脚本
2. 测试端口被占用时的自动切换
3. 测试服务启动失败时的错误处理
4. 测试符号链接调用
5. 测试不同平台 (Windows/Linux/macOS)
6. 测试僵尸 PID 文件清理
7. 测试权限不足时的错误提示
