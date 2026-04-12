# OpenChat 下一轮实施计划 V3

日期: 2026-04-06
阶段: 第五轮静态质量与集成闭环收敛
当前全局基线: `262 errors / 2181 warnings`

## 本轮目标

在保持 `npm run lint:types` 与 `npm run build` 持续通过的前提下，继续处理剩余高价值问题，并把 E2E 从“快速失败”推进到“在标准测试环境中真实跑通”。

## 批次顺序

### 批次 A: `src/common/decorators/cache.decorator.ts`

优先原因:

- 当前全局 lint error 中仍有显式 `no-useless-assignment`
- 文件体量大、横切面强，残留 error 会持续污染全局基线

重点动作:

- 修复 `record` 的无效赋值
- 排查同文件是否还有低风险、确定性的 error 可一并收口
- 不扩大 warning 治理范围，只消除 error

验证:

- `npx eslint src/common/decorators/cache.decorator.ts --ext .ts`
- `npm run lint:types`
- `npm run build`

### 批次 B: `src/modules/third-party/*`

优先原因:

- 剩余 error 集中且修复成本低
- 与跨平台集成边界相关，越早收口越利于后续扩展

重点动作:

- 修复 `third-party-base.adapter.ts` 的未使用 `Injectable`
- 复查 `third-party` 目录中是否存在同类低风险 error

验证:

- `npx eslint src/modules/third-party --ext .ts`
- `npm run lint:types`
- `npm run build`

### 批次 C: 标准测试环境打通 E2E

优先原因:

- 当前 E2E 已经 fail-fast，但尚未全绿
- 阻塞已经明确收敛为测试数据库凭据 / 初始化状态问题

重点动作:

- 对照 `docs/zh/deploy/index.md` 与 `docs/zh/config/server.md` 校验本地 `.env.test` / 实际测试库
- 使用 `make test-env` 或等价方式启动测试依赖
- 使用 `npm run db:init:test` 初始化测试数据库
- 重新执行 `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts`
- 若数据库恢复可用后仍有下一个 blocker，再继续按同样方式切分定位

验证:

- `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts --detectOpenHandles --verbose`

## 成功标准

- 全局 lint error 继续下降
- `cache.decorator.ts` 与 `third-party` 批次 error 显著收敛
- `test/app.e2e-spec.ts` 不再因环境漂移导致模糊超时
- 若本地测试依赖可用，则 E2E 至少推进到新的业务层 blocker

## 风险说明

- `cache.decorator.ts` 文件较大，需避免一次性混入 warning 治理和结构性重构
- E2E 当前剩余问题已主要转为环境依赖，不宜再通过增加更多测试绕过逻辑掩盖真实启动条件
