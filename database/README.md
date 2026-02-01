# OpenChat Server 数据库文档

本文档说明 OpenChat Server 的数据库架构和初始化方法。

## 数据库信息

- **数据库类型**: PostgreSQL
- **版本要求**: PostgreSQL 12+
- **字符集**: UTF-8

## 目录结构

```
database/
├── migrations/         # 数据库迁移文件
│   └── 001_add_fulltext_search.sql  # 全文搜索功能迁移
├── README.md           # 数据库文档
├── indexes-optimization.sql  # 索引优化脚本
├── schema.sql          # 数据库架构定义
└── seed.sql            # 测试数据初始化脚本
```

## 数据库架构

### 表清单

| 表名 | 说明 | 主要功能 |
|------|------|----------|
| `chat_users` | 用户表 | 存储用户基本信息 |
| `chat_friends` | 好友关系表 | 管理用户间好友关系 |
| `chat_friend_requests` | 好友请求表 | 处理好友申请流程 |
| `chat_groups` | 群组表 | 存储群组信息 |
| `chat_group_members` | 群组成员表 | 管理群组成员关系 |
| `chat_group_invitations` | 群组邀请表 | 处理群组邀请流程 |
| `chat_contacts` | 联系人表 | 统一联系人视图 |
| `chat_conversations` | 会话表 | 管理用户会话列表 |
| `chat_messages` | 消息表 | 存储聊天消息 |
| `chat_ai_bots` | AI Bot 表 | 管理 AI 机器人配置 |
| `chat_bot_messages` | Bot 消息表 | 记录 AI 对话历史 |
| `chat_rtc_channels` | RTC 渠道表 | 配置音视频服务商 |
| `chat_rtc_rooms` | RTC 房间表 | 管理音视频通话房间 |
| `chat_third_party_contacts` | 第三方联系人表 | 存储外部平台联系人 |
| `chat_third_party_messages` | 第三方消息表 | 存储外部平台消息 |

### 核心字段说明

#### 通用字段

所有表都包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGSERIAL | 主键，自增ID |
| `uuid` | VARCHAR(36) | 唯一标识符，对外暴露 |
| `createdAt` | TIMESTAMP | 创建时间 |
| `updatedAt` | TIMESTAMP | 更新时间（自动更新） |

#### 用户表 (chat_users)

| 字段 | 类型 | 说明 |
|------|------|------|
| `username` | VARCHAR(50) | 用户名，唯一 |
| `nickname` | VARCHAR(100) | 昵称 |
| `password` | VARCHAR(100) | 密码（加密存储） |
| `avatar` | JSONB | 头像（支持URL或结构化资源） |
| `status` | VARCHAR(20) | 在线状态 |
| `resources` | JSONB | 其他媒体资源 |
| `lastLoginAt` | TIMESTAMP | 最后登录时间 |
| `lastLoginIp` | VARCHAR(45) | 最后登录IP |
| `isDeleted` | BOOLEAN | 是否已删除（软删除） |
| `deletedAt` | TIMESTAMP | 删除时间 |

#### 消息表 (chat_messages)

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | VARCHAR(20) | 消息类型：text/image/audio/video/file/card/custom/system |
| `content` | JSONB | 消息内容（结构化） |
| `fromUserId` | VARCHAR(36) | 发送者UUID |
| `toUserId` | VARCHAR(36) | 接收者UUID（单聊） |
| `groupId` | VARCHAR(36) | 群组UUID（群聊） |
| `status` | VARCHAR(20) | 消息状态：sending/sent/delivered/read/failed |
| `clientSeq` | BIGINT | 客户端序列号，用于消息去重 |

## 使用方法

### 1. 创建数据库

```bash
# 使用 psql 命令行
createdb openchat

# 或使用 SQL
CREATE DATABASE openchat WITH ENCODING = 'UTF8';
```

### 2. 执行 DDL 脚本

```bash
# 进入数据库
psql -d openchat

# 执行 schema.sql
\i schema.sql

# 或使用命令行
psql -d openchat -f schema.sql
```

### 3. 执行数据库迁移（可选）

```bash
# 执行迁移脚本
psql -d openchat -f migrations/001_add_fulltext_search.sql
```

### 4. 插入测试数据（可选）

```bash
# 执行 seed.sql
psql -d openchat -f seed.sql
```

### 5. 验证安装

```sql
-- 查看所有表
\dt

-- 查看表结构
\d chat_users

-- 查看数据
SELECT * FROM chat_users;
```

## 关于 Migrations 目录

`migrations/` 目录用于存储数据库迁移文件，这些文件包含数据库结构的变更脚本。

### 迁移文件命名规范

```
{版本号}_{描述}.sql
```

例如：
- `001_add_fulltext_search.sql` - 添加全文搜索功能

### 执行迁移

迁移文件应该按照版本号顺序执行，以确保数据库结构的变更顺序正确。

### 创建新迁移

当需要修改数据库结构时，应创建新的迁移文件，而不是直接修改 `schema.sql` 文件。这样可以：

1. 保持数据库结构变更的历史记录
2. 支持不同环境之间的数据库结构同步
3. 提供回滚机制（如果需要）

## 索引清单

所有表都建立了适当的索引以优化查询性能：

- **主键索引**: 所有表的 `id` 字段
- **唯一索引**: `uuid` 字段、业务唯一约束（如 username）
- **外键索引**: 关联字段（如 user_id, group_id）
- **查询索引**: 常用查询条件（如 status, type）
- **复合索引**: 联合查询条件（如 user_id + contact_id）

## 触发器

### 自动更新时间

所有表都配置了 `updated_at` 自动更新触发器：

```sql
-- 当记录更新时，自动设置 updated_at = CURRENT_TIMESTAMP
```

## 数据类型说明

### JSONB 字段

以下字段使用 PostgreSQL 的 JSONB 类型存储结构化数据：

- `avatar`: 头像资源（支持 URL 或 MediaResource 结构）
- `resources`: 媒体资源集合
- `content`: 消息内容
- `config`: 配置信息
- `extra_config`: 额外配置
- `extra_info`: 扩展信息

### 数组字段

- `tags`: 标签数组（TEXT[]）

## 扩展

数据库使用了以下 PostgreSQL 扩展：

- `uuid-ossp`: 用于生成 UUID

## 备份与恢复

### 备份

```bash
# 使用 pg_dump 备份
cd d:\sdkwork-opensource\openchat-server\database
pg_dump -Fc openchat > backup.dump

# 仅备份结构
pg_dump -s openchat > schema_backup.sql
```

### 恢复

```bash
# 恢复数据库
createdb openchat_new
pg_restore -d openchat_new backup.dump

# 或使用 SQL 文件
psql -d openchat_new -f schema_backup.sql
```

## 注意事项

1. **密码加密**: 用户密码需要加密后存储，示例中使用占位符
2. **UUID 生成**: 所有记录使用 UUID 作为对外标识，内部使用自增 ID
3. **时区处理**: 时间戳使用数据库默认时区，建议在应用层统一处理
4. **JSONB 查询**: 查询 JSONB 字段时使用 PostgreSQL 的 JSONB 操作符

## 示例查询

### 查询用户的好友列表

```sql
SELECT u.* 
FROM chat_users u
JOIN chat_friends f ON u.uuid = f.friend_id
WHERE f.user_id = '用户UUID' AND f.status = 'accepted';
```

### 查询用户的会话列表

```sql
SELECT * FROM chat_conversations
WHERE user_id = '用户UUID'
ORDER BY is_pinned DESC, last_message_time DESC;
```

### 查询群组消息

```sql
SELECT * FROM chat_messages
WHERE group_id = '群组UUID'
ORDER BY created_at DESC
LIMIT 20;
```

### 搜索消息

```sql
SELECT * FROM chat_messages
WHERE content->>'text' LIKE '%关键词%'
AND (from_user_id = '用户UUID' OR to_user_id = '用户UUID')
ORDER BY created_at DESC;
```
