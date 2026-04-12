# OpenChat 下一轮实施计划 V6

日期: 2026-04-06
阶段: 第八轮外围集群收口与 E2E 复试准备
当前全局基线: `95 errors / eslint --quiet`

## 本轮前置结论

截至当前阶段，已经完成以下闭环:

1. 流式导出真实缺陷已通过测试修复
2. `common/services` 已连续完成多批静态收口
3. `common/types`、`common/utils`、`common/websocket` 已达当前批次 `0 error`
4. `npm run lint:types` 与 `npm run build` 持续通过

## 本轮目标

继续优先选择低风险、高密度、可快速压降全局基线的外围集群，优先从 `extensions` 和少量入口层开始，再决定是否进入模块层。

## 批次顺序

### 批次 E: 扩展层与入口层

目标文件:

- `src/extensions/core/extension-config.validator.ts`
- `src/extensions/extensions.module.ts`
- `src/extensions/user-center/default-user-center.extension.ts`
- `src/extensions/user-center/remote-user-center.extension.ts`
- `src/gateways/ws.gateway.ts`
- `src/main.ts`

重点动作:

1. 清理未使用参数、未使用 import、无效局部变量
2. 不改变扩展生命周期语义
3. 对网关入口中的 `no-useless-assignment` 做最小修正

验证:

- `npx eslint <targets>`
- `npm run lint:types`
- `npm run build`

### 批次 F: Agent 与 Bot 平台外围模块

候选文件:

- `src/modules/agent/*`
- `src/modules/ai-bot/*`
- `src/modules/bot-platform/*`

目标:

- 继续收口未使用 import、未使用参数和低风险 `no-useless-assignment`

### 批次 G: Craw / Friend / Group / Message / RTC 边缘集群

候选文件:

- `src/modules/craw/*`
- `src/modules/friend/*`
- `src/modules/group/*`
- `src/modules/message/*`
- `src/modules/rtc/*`

说明:

- 这一批开始逐步接近真实业务逻辑，需要保持“先看根因，再修复”的纪律

### 批次 H: E2E 环境复试

前置条件:

1. Docker CLI 恢复稳定响应
2. 代码基线完成当前轮次验证
3. `.env.test` 与测试文档保持一致

动作:

1. 验证 `docker ps`
2. 验证 `docker version`
3. 如恢复正常，继续 `make test-env`
4. 执行 `npm run db:init:test`
5. 执行:
   - `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts --detectOpenHandles --verbose`

## 成功标准

1. `eslint --quiet` 全局 error 从 `95` 继续下降
2. `npm run lint:types` 持续通过
3. `npm run build` 持续通过
4. 至少完成批次 E，或在 Docker 恢复后完成一次新的 E2E 闭环尝试
