# OpenChat 数据库说明

本目录维护 OpenChat 服务端的数据库基线、初始化数据和在线补丁。

## 1. 标准策略

当前项目采用“全新基线 + 在线补丁”模式：

- `schema.sql`：完整、可直接落库的标准结构
- `seed.sql`：幂等初始化数据（用于开发/测试）
- `indexes-optimization.sql`：可选索引优化
- `patches/*.sql`：存量环境在线补丁（按文件名升序执行）

## 2. 文件结构

```text
database/
├── schema.sql                 # 全量数据库结构（基线）
├── seed.sql                   # 幂等初始化数据
├── indexes-optimization.sql   # 可选索引优化脚本
├── patches/                   # 在线补丁
│   ├── 20260305_add_chat_message_receipts.sql
│   ├── 20260306_add_chat_messages_im_indexes.sql
│   └── 20260307_add_chat_conversation_read_cursors.sql
└── README.md
```

## 3. 表结构概览

`schema.sql` 当前包含 **51 张业务表**，核心分域如下：

- IM 核心：`chat_users`、`chat_friends`、`chat_contacts`、`chat_conversations`、`chat_messages`、`chat_message_receipts`、`chat_conversation_read_cursors`
- 群组：`chat_groups`、`chat_group_members`、`chat_group_invitations`
- RTC：`chat_rtc_channels`、`chat_rtc_rooms`、`chat_rtc_tokens`、`chat_rtc_video_records`、`chat_rtc_call_sessions`、`chat_rtc_call_participants`
- Bot / Agent：`chat_ai_bots`、`chat_bot_messages`、`platform_bots`、`platform_bot_commands`、`chat_agents`、`chat_agent_sessions`、`chat_agent_messages`、`chat_agent_tools`、`chat_agent_skills`、`chat_agent_executions`
- Agent Memory：`agent_memories`、`agent_memory_summaries`、`agent_knowledge_documents`、`agent_knowledge_chunks`、`agent_memory_vectors`
- Craw 社区：`craw_agents`、`craw_submolts`、`craw_posts`、`craw_comments`、`craw_follows`、`craw_votes`、`craw_dm_*`
- 朋友圈 Timeline：`chat_timeline_posts`、`chat_timeline_feed_items`、`chat_timeline_post_likes`
- 设备 / 第三方 / 审计：`devices`、`device_messages`、`chat_third_party_contacts`、`chat_third_party_messages`、`system_audit_logs`

## 4. 初始化方式

### 4.1 脚本初始化（推荐）

Linux / macOS:

```bash
./scripts/init-database.sh development
```

Windows PowerShell:

```powershell
.\scripts\init-database.ps1 -Environment development
```

### 4.2 手工初始化

```bash
psql -h <host> -U <user> -d <db_name> -f database/schema.sql
psql -h <host> -U <user> -d <db_name> -f database/seed.sql
```

## 5. 在线补丁（存量库）

Linux / macOS:

```bash
./scripts/apply-db-patches.sh production
```

Windows PowerShell:

```powershell
.\scripts\apply-db-patches.ps1 -Environment production
```

补丁执行记录表：`chat_schema_migrations`

关键特性：

- 按文件名版本号排序执行（`YYYYMMDD_name.sql`）
- 补丁摘要校验（SHA256）
- 已执行补丁自动跳过
- 记录不一致时阻断执行（防止错版 SQL）

## 6. 巡检 SQL

```sql
-- 统计业务表数量
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- 查看最近补丁执行记录
SELECT filename, version, checksum, applied_at
FROM chat_schema_migrations
ORDER BY applied_at DESC;

-- 检查消息检索能力（FTS）相关对象
SELECT to_regclass('public.chat_messages') AS chat_messages,
       to_regclass('public.idx_messages_search_vector') AS idx_messages_search_vector;
```

## 7. 生产建议

- 生产环境初始化一般只执行 `schema.sql`，跳过 `seed.sql`
- 每次发布前先执行补丁，再发版应用
- 发布前做数据库备份，避免不可逆风险
- 保持补丁文件不可变更（新增新补丁，不覆写历史补丁）
