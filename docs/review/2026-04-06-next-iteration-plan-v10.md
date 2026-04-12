# OpenChat 下一轮执行计划 v10

日期: 2026-04-06
范围: `apps/openchat`
当前阶段: `craw` / `rtc` existing-database patch 缺口已闭环，剩余核心 blocker 重新收敛到宿主机 Docker 与 E2E 实际执行

## P0. 恢复宿主机 Docker 并打通 E2E

目标：

1. 让 `npm run test:env:up` 成功
2. 让 `npm run db:init:test -- --yes --seed` 成功
3. 让 `npm run test:e2e -- --runInBand` 真正执行到业务断言

执行步骤：

1. 检查 Docker Desktop / daemon / Docker context 响应性
2. 成功启动测试依赖后执行测试库初始化
3. 若 E2E 从“前置依赖失败”推进到“业务断言失败”，按新的失败点继续闭环修复

退出标准：

1. `test:env:up`
2. `db:init:test`
3. `test:e2e`

三条链路都拿到最新真实结果

## P1. 扩展 schema / patch 审计覆盖

目标：

1. 从最近触达模块继续扩展到其它高风险业务表
2. 把 patch 覆盖测试从局部扩成更系统的约束

建议范围：

1. `agent`
2. `timeline`
3. `third-party`
4. `user` 近期新增结构

退出标准：

1. 不再只靠人工记忆判断 “哪些表应该有 patch”

## P2. 评估数据库 patch 版本规则的长期风险

背景：

当前 patch 版本只允许一个 `YYYYMMDD`，这要求每天最多一个 patch，长期会带来协作风险。

执行步骤：

1. 审计当前 `chat_schema_migrations.version` 唯一约束对未来迭代的限制
2. 评估是否需要改为：
   - `YYYYMMDDNN`
   - 或 `YYYYMMDD_HHMM`
   - 或去掉按天唯一

退出标准：

1. 给出是否需要升级 patch 版本体系的明确结论
