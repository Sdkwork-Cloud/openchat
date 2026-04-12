# OpenChat 下一轮执行计划 v8

日期: 2026-04-06
范围: `apps/openchat`
当前阶段: 公开契约缺口已完成一轮集中闭环

## 当前已验证基线

已验证通过：

1. `npm run lint:types`
2. `npm run build`
3. `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
4. `npm run test -- --runTestsByPath src/modules/wukongim/wukongim-token.service.spec.ts src/modules/wukongim/wukongim.service.spec.ts src/modules/im-provider/providers/wukongim/wukongim.provider.spec.ts src/modules/wukongim/wukongim.webhook.controller.spec.ts src/modules/craw/services/craw-agent.service.spec.ts src/extensions/user-center/user-center.proxy.spec.ts src/extensions/core/extension-health.service.spec.ts --runInBand`

## 下一轮优先级

### P0. 打通 E2E 环境闭环

目标：

1. 明确 Docker 是否在当前宿主可用
2. 明确测试数据库账号、密码、初始化脚本与 `.env.test` 是否一致
3. 形成可重复执行的 `test:e2e` 路径

执行步骤：

1. 复核 `test/`, `scripts/`, `database/`, `.env.test` 的依赖关系
2. 复核数据库初始化与 patch 脚本在 Windows / Linux 环境下的等价性
3. 若环境缺失，则增加前置检查与清晰错误提示
4. 环境满足后重新执行 `npm run test:e2e`

退出标准：

1. `npm run test:e2e` 可重复执行，或
2. 环境不满足时快速失败并明确告知缺失项

### P1. 补全数据库 patch 与 schema 一致性审计

背景：

本轮为 `craw_agents.owner_email` 新增了 schema 与 patch，需要顺手审计其余新近变更是否都满足：

1. entity
2. schema.sql
3. incremental patch

执行步骤：

1. 针对近期新增字段和表结构变更做交叉检查
2. 识别是否存在 entity 已改但 patch 未跟进的路径
3. 为发现的问题补 patch 和最小回归测试

退出标准：

1. 近期变更不存在 schema / patch 漂移

### P2. 扩大契约回归覆盖

候选范围：

1. `extensions` 模块 forRootAsync
2. `craw.controller` 的真实返回语义
3. `WukongIM` 与 webhook 的更完整消息事件字段映射

退出标准：

1. 当前已修复的运行时闭环都有自动化回归覆盖
2. 不依赖人工记忆判断“以前修过”

## 当前剩余风险

1. E2E 仍未验证，不能宣称系统端到端已经完全交付
2. WukongIM webhook 的消息字段映射基于当前工程约定，后续若上游 payload 结构变化，仍需补集成验证
3. `craw ownerEmail` 目前是存储闭环，不包含邮件发送或验证流程

## 建议执行顺序

1. E2E 环境前置检查与复现
2. 数据库 schema / patch 一致性审计
3. 契约回归测试扩面
