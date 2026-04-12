# OpenChat 第十一轮修复记录：existing-database schema/patch 回补闭环

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第十一轮执行闭环

## 本轮目标

在第十轮完成测试环境跨平台闭环之后，本轮按 `v9` 计划继续推进数据库一致性审计，重点核查：

1. `craw`
2. `message`
3. `conversation`
4. `rtc`

目标不是泛泛浏览实体定义，而是确认这几轮新增结构在以下三层是否闭环：

1. TypeORM entity
2. `database/schema.sql`
3. `database/patches/*.sql`

## 审计结论

### 1. `message` / `conversation` 当前未发现漂移

审计结果：

1. `chat_message_receipts`
   - entity 存在
   - schema 存在
   - `20260305_add_chat_message_receipts.sql` 存在
2. `chat_message_reactions`
   - entity 存在
   - schema 存在
   - `20260314_add_chat_message_reactions.sql` 存在
3. `chat_conversation_read_cursors`
   - entity 存在
   - schema 存在
   - `20260307_add_chat_conversation_read_cursors.sql` 存在

结论：

- 这两个模块本轮未发现新的 patch 缺口

### 2. `craw` / `rtc` 存在“schema 有表、patch 无建表”缺口

根因证据：

1. `database/schema.sql` 已包含完整的 `craw_*` 和 `chat_rtc_*` 表
2. `database/patches/` 中仅存在：
   - `20260406_add_craw_agent_owner_email.sql`
   - 没有 `craw` 首次建表 patch
   - 没有 `rtc` 首次建表 patch
3. 仓库推荐策略明确写着：
   - 新库执行 `schema.sql`
   - 既有库执行 `patches/*.sql`

因此，对既有数据库来说，这是实质性缺陷：

- 新模块表只存在于 baseline schema
- 旧库按 patch 升级时拿不到这些表
- 上层服务一旦访问这些模块，就会在运行期触发 “relation does not exist”

这不是“文档不够完善”的问题，而是数据库升级链路本身不完整。

## 本轮修复

### 1. 新增 patch 覆盖率回归测试

新增文件：

- `test/runtime/database-patch-coverage.spec.ts`

测试目的：

1. 直接读取 `database/patches/*.sql`
2. 断言补丁目录中必须包含下列表的建表语句：
   - `craw_agents`
   - `craw_submolts`
   - `craw_posts`
   - `craw_comments`
   - `craw_submolt_subscribers`
   - `craw_submolt_moderators`
   - `craw_follows`
   - `craw_votes`
   - `craw_dm_requests`
   - `craw_dm_conversations`
   - `craw_dm_messages`
   - `chat_rtc_channels`
   - `chat_rtc_rooms`
   - `chat_rtc_tokens`
   - `chat_rtc_video_records`
   - `chat_rtc_call_sessions`
   - `chat_rtc_call_participants`

在补丁落地前，这个测试稳定失败，证明问题可复现。

### 2. 新增 existing-database backfill patch

新增文件：

- `database/patches/20260405_backfill_craw_and_rtc_tables.sql`

修复策略：

1. 使用单个 backfill patch 补齐缺失的 `craw` 和 `rtc` 基础表
2. 全部采用 `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`
3. 同时补齐这些表对应的 `updated_at` trigger
4. patch 版本选择 `20260405`
   - 目的是让它在 `20260406_add_craw_agent_owner_email.sql` 之前执行
   - 避免旧库先跑到 `owner_email` patch 时，`craw_agents` 还不存在

覆盖范围：

1. 全套 `craw` 基础表与索引
2. 全套 `rtc` 基础表、约束、部分唯一索引与触发器

### 3. 保持数据库 CLI 兼容现有 patch 顺序

本轮没有改动 patch 执行器的排序规则，而是选择补一个更早版本号的 backfill patch。

原因：

1. 当前 patch 执行器要求 `YYYYMMDD` 且版本唯一
2. `20260406_add_craw_agent_owner_email.sql` 已经依赖 `craw_agents`
3. 与其重构 patch 版本体系，不如用更小的改动恢复正确执行顺序

## 本轮验证

### 定向测试

命令：

```bash
npm run test -- --runTestsByPath test/runtime/database-patch-coverage.spec.ts test/runtime/database-cli.spec.ts --runInBand
```

结果：

- 通过
- `3 passed, 3 total`

说明：

- 其中 `database-patch-coverage.spec.ts` 在补丁落地前已验证过失败
- 当前转绿，证明补丁目录已覆盖 `craw` / `rtc` 缺失建表链路

### 关联回归

命令：

```bash
npm run test -- --runTestsByPath test/runtime/openchat-cli.spec.ts test/runtime/run-with-env.spec.ts test/runtime/test-env-defaults.spec.ts test/runtime/test-environment-cli.spec.ts test/runtime/database-cli.spec.ts test/runtime/database-patch-coverage.spec.ts --runInBand
```

结果：

- 通过
- `17 passed, 17 total`

### 项目级验证

命令：

```bash
npm run lint:types
```

结果：

- 通过

### 当前 E2E 状态

命令：

```bash
npm run test:e2e -- --runInBand
```

结果：

- 失败
- 当前失败仍然是测试前置依赖未启动：
  - `connect ECONNREFUSED 127.0.0.1:55432`

说明：

1. 本轮新增的数据库 backfill patch 没有引入新的构建或测试回归
2. 当前 `test:e2e` 依旧停在环境层，而不是业务断言层
3. 这与第十轮确认的 Docker blocker 保持一致

命令：

```bash
npx eslint "{src,apps,libs,test}/**/*.ts" --quiet
```

结果：

- 通过

命令：

```bash
npm run build
```

结果：

- 通过

## 当前阶段结论

本轮把数据库层的一类高风险问题从“潜在生产炸点”推进到“已被 patch 链覆盖并有回归测试约束”：

1. `message` / `conversation`
   - 当前审计未发现新漂移
2. `craw` / `rtc`
   - 原先只存在 baseline schema，不存在既有库建表 patch
   - 当前已通过 backfill patch 闭环

这意味着：

- 新库走 `schema.sql`
- 旧库走 `patches/*.sql`

在这两个路径上，`craw` 和 `rtc` 不再分叉。

## 当前剩余 blocker

1. 宿主机 Docker 响应性仍未恢复
   - `npm run test:env:up` 仍可能超时
2. 因 Docker blocker 仍在，`npm run test:e2e` 还无法完成真实端到端全绿
3. 更广域的 schema/patch 审计仍可以继续扩展到其它模块，但本轮计划内的重点模块已完成
