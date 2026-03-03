# OpenChat 数据库初始化说明

本项目当前按“全新应用初始化”模式维护数据库：
- `schema.sql` 是全量、可直接落库的初始结构。
- `seed.sql` 是可重复执行（幂等）的初始化数据。
- 初始化流程默认仅执行 `schema + seed`，不依赖迁移脚本。

## 目录结构

```text
database/
├── schema.sql                 # 全量数据库结构
├── seed.sql                   # 幂等初始化数据
├── indexes-optimization.sql   # 可选索引优化脚本
```

## 关键能力（已内置在 schema.sql）

- IM 核心表：用户、好友、联系人、会话、消息、群组
- 消息全文检索：
  - `chat_messages.search_vector`
  - `GIN` 索引 `idx_messages_search_vector`
  - 自动维护触发器 `trigger_update_message_search_vector`
- Timeline 朋友圈：
  - `chat_timeline_posts`
  - `chat_timeline_feed_items`
  - `chat_timeline_post_likes`
  - `distribution_mode(push/pull/hybrid)` 支持混合分发

## 初始化方式

### 方式 1：脚本初始化（推荐）

Windows:

```powershell
.\scripts\init-database.ps1 -Environment dev
```

Linux/macOS:

```bash
./scripts/init-database.sh dev
```

### 方式 2：手动初始化

```bash
psql -h <host> -U <user> -d <db_name> -f database/schema.sql
psql -h <host> -U <user> -d <db_name> -f database/seed.sql
```

## 初始化测试账号

- 用户名：`admin` / `alice` / `bob` / `carol` / `dave`
- 初始密码：`OpenChat@123`

> `seed.sql` 内密码已为 bcrypt 哈希，可直接用于登录联调。

## 幂等说明

`seed.sql` 使用 `ON CONFLICT` 策略：
- 多次执行不会产生重复数据
- 已存在记录会按最新样例数据更新

## 生产建议

- 生产环境可跳过 `seed.sql`
- `indexes-optimization.sql` 视数据规模按需执行
- 若未来进入“在线演进”阶段，再恢复迁移驱动模式
