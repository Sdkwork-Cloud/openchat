# OpenChat 下一轮执行计划 v9

日期: 2026-04-06
范围: `apps/openchat`
当前阶段: 测试环境脚本与跨平台入口已闭环，剩余 blocker 已收敛到宿主机 Docker 响应性

## P0. 宿主机 Docker 恢复与 E2E 真绿

目标：

1. 让 `npm run test:env:up` 在当前主机真正完成
2. 完成 `npm run db:init:test -- --yes --seed`
3. 完成 `npm run test:e2e -- --runInBand`

执行步骤：

1. 在仓库外确认 Docker Desktop 或 Docker daemon 是否可正常响应
2. 执行 `docker version` / `docker context ls` / `docker compose version`
3. 若 Docker 恢复，重新执行：
   - `npm run test:env:up`
   - `npm run db:init:test -- --yes --seed`
   - `npm run test:e2e -- --runInBand`
4. 如果 `db:init:test` 仍失败，沿 `docker exec <test postgres container> psql` 路径继续收集错误

退出标准：

1. `test-env:up` 可重复执行
2. `test:e2e` 不再因前置依赖失败中断

## P1. 数据库 schema / patch 一致性审计

目标：

1. 对最近几轮新增字段、索引、表结构变更做 entity / schema / patch 三方对照
2. 把缺失补丁的问题从“潜在风险”收敛到“已验证一致”

执行步骤：

1. 以近期已改模块为起点：
   - `craw`
   - `message`
   - `conversation`
   - `rtc`
2. 对照 `database/schema.sql` 与 `database/patches/*.sql`
3. 为发现的问题补充 patch 与最小回归测试

退出标准：

1. 最近几轮触达模块不存在 schema / patch 漂移

## P2. 测试环境运维体验细化

目标：

1. 让 `test-env status` 输出更完整的 Docker 状态
2. 评估是否增加 `doctor` / `logs` 子命令

执行步骤：

1. 在 Docker 恢复后复核 `test-env status` 输出
2. 根据真实使用摩擦决定是否继续扩展子命令

退出标准：

1. 当前测试环境运维入口足够覆盖启动、停止、状态、初始化与失败诊断
