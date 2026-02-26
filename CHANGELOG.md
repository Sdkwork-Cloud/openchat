# OpenChat Server 更新日志

## 2024-02-26 - 逻辑完善和健壮性增强

### 修复的核心逻辑问题

#### 1. 消息服务事务处理 (message.service.ts)
- **问题**: 事务提交后，如果 `commitTransactionalMark` 失败，会导致数据不一致
- **修复**: 添加错误处理，记录但不影响主流程
- **影响**: 单条消息处理和批量消息处理

#### 2. 数据库连接池配置 (app.module.ts)
- **问题**: 缺少连接池的详细配置
- **修复**: 添加 `extra` 参数配置连接池
  - `min`: 最小连接数
  - `max`: 最大连接数
  - `connectionTimeoutMillis`: 连接超时
  - `idleTimeoutMillis`: 空闲超时
  - `acquireTimeoutMillis`: 获取连接超时
  - `allowExitOnIdle`: 空闲时允许退出

#### 3. 环境变量配置 (.env.example)
- **问题**: 数据库连接池变量名和代码中不一致
- **修复**: 统一变量名
  - `DB_CONNECTION_TIMEOUT`: 连接超时
  - `DB_IDLE_TIMEOUT`: 空闲超时
  - `DB_ACQUIRE_TIMEOUT`: 获取连接超时

### 启动脚本改进

#### Bash 脚本 (bin/openchat)
- 模块化设计，功能拆分到 lib/ 目录
- 跨平台路径处理
- 端口自动检测和自增
- 完善的错误处理和日志

#### PowerShell 脚本 (bin/openchat.ps1)
- 模块化设计
- 跨平台支持 (Windows/Linux/macOS)
- 端口自动检测
- 完善的错误处理

### 新增模块文件

```
bin/lib/
├── config.sh/ps1      # 配置模块
├── logger.sh/ps1      # 日志模块
├── port.sh/ps1        # 端口管理
├── process.sh/ps1     # 进程管理
├── service.sh/ps1     # 服务控制
├── logs.sh/ps1        # 日志管理
├── help.sh/ps1        # 帮助信息
└── README.md          # 模块文档
```

### 健壮性增强

1. **错误处理**: 所有异步操作添加 try-catch
2. **事务安全**: 事务提交/回滚添加错误处理
3. **连接池**: 添加连接池配置防止连接泄漏
4. **端口检测**: 多方法检测端口可用性
5. **进程管理**: 完善的进程启动/停止/状态检查

### 兼容性

- **Bash**: 4.0+ (Linux, macOS, Git Bash, MSYS, Cygwin)
- **PowerShell**: 5.1+, 7+ (Windows, Linux, macOS)
- **Node.js**: 16+
- **数据库**: PostgreSQL 12+
- **Redis**: 6+
