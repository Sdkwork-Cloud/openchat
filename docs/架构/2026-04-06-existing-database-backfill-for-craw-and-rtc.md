# OpenChat 既有数据库 `craw` / `rtc` 回补 patch 设计

日期: 2026-04-06
范围: `apps/openchat`

## 背景

OpenChat 当前数据库策略分为两条路径：

1. 新数据库：
   - 执行 `database/schema.sql`
2. 既有数据库：
   - 执行 `database/patches/*.sql`

这要求任何新模块的表结构都必须同时满足：

1. baseline schema 可建新库
2. patch 目录可升级旧库

本轮审计发现 `craw` 与 `rtc` 只满足了第一条，不满足第二条。

## 问题定义

审计前的状态：

1. `database/schema.sql`
   - 包含完整 `craw_*` 表
   - 包含完整 `chat_rtc_*` 表
2. `database/patches/`
   - 没有 `craw` 首次建表 patch
   - 没有 `rtc` 首次建表 patch
   - 只有后续小补丁，如 `owner_email`

这会导致一个结构性分叉：

- 新库功能正常
- 老库按增量 patch 升级后却缺表

从运行时角度看，这类问题通常不会在 build 或 unit test 暴露，而会在首次访问模块时触发：

- `relation does not exist`
- 约束缺失
- `updated_at` 不自动更新

## 设计决策

### 1. 选择 backfill patch，而不是回退 schema

本轮没有回滚 schema，也没有改为让旧库重新跑 baseline。

原因：

1. 已发布数据库不适合用 baseline 重建
2. 现有系统已经明确采用“旧库走 patch”的运维约定
3. 正确修复方式应是补齐增量链路，而不是改变升级模型

### 2. 使用单个 backfill patch 覆盖整批缺失表

本轮选择新增一个集中式 patch：

- `20260405_backfill_craw_and_rtc_tables.sql`

而不是把 `craw` 和 `rtc` 再拆成多个更小 patch。

原因：

1. 根因是一类问题：模块首次建表未进入 patch 链
2. 修复目标是尽快让旧库升级路径恢复闭环
3. 过度拆分会继续消耗 patch 版本号，而当前版本体系只有按天唯一

### 3. patch 必须是幂等的

该 patch 使用：

1. `CREATE TABLE IF NOT EXISTS`
2. `CREATE INDEX IF NOT EXISTS`
3. `DROP TRIGGER IF EXISTS + CREATE TRIGGER`
4. `CREATE OR REPLACE FUNCTION update_updated_at_column()`

原因：

1. 同一 patch 可能面对不同历史状态的数据库
2. 有些库可能手工建过表，但缺索引或缺触发器
3. patch 不能假设所有既有库都处于同一中间态

### 4. patch 版本选在 `20260406 owner_email` 之前

本轮新 patch 的版本号定为 `20260405`，虽然实际编写日期是 2026-04-06。

原因：

1. `20260406_add_craw_agent_owner_email.sql` 依赖 `craw_agents` 已存在
2. 若 backfill patch 排在其后，旧库仍可能先撞上 `ALTER TABLE craw_agents` 失败
3. 当前 patch 执行器按文件版本排序，因此必须通过版本号确保依赖顺序正确

这不是理想状态，但在现有 patch 版本体系下，这是最小且正确的修复。

## 当前架构收益

完成 backfill 后，数据库升级路径重新统一：

1. 新库：
   - 走 baseline schema
2. 老库：
   - 走 patch 链

两条路径对 `craw` / `rtc` 的结构覆盖重新一致。

同时，本轮新增的 patch 覆盖测试把这个要求显式化了：

- 之后如果再新增模块表只写进 `schema.sql` 而忘记补 patch，测试会直接失败

## 暴露出的长期问题

本轮也暴露了一个更基础的设计限制：

- `chat_schema_migrations.version` 当前按 `YYYYMMDD` 唯一

这意味着：

1. 理论上每天只能安全增加一个 patch
2. 一旦同一天出现第二个 patch，就需要回填“更早版本”或改未来日期
3. 长期看会增加协作和排序风险

因此，虽然本轮已经通过 backfill patch 修复了当前问题，但 patch 版本体系本身仍值得在后续单独设计升级。
