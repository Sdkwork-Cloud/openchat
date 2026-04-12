# OpenChat 下一轮执行计划 v7

日期: 2026-04-06
范围: `apps/openchat`
当前阶段: 静态基线归零，核心构建通过，`message / rtc` 定向单测通过

## 当前事实基线

已验证完成：

1. `npm run lint:types`
2. `npm run build`
3. `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
4. `npm run test -- --runTestsByPath src/modules/message/message.service.spec.ts src/modules/rtc/rtc.service.spec.ts --runInBand`

已知未完成项：

1. `extensions` 模块存在声明型配置未接线问题
2. `craw` 存在公开方法 `setupOwnerEmail()` 无实际效果
3. `wukongim` provider 存在 token 校验与订阅钩子占位实现
4. E2E 环境仍未形成可重复执行的稳定前置条件

## 下一轮优先级

### P0. 关闭“声明存在但运行时未实现”的契约缺口

目标文件：

- `src/extensions/extensions.module.ts`
- `src/modules/craw/services/craw-agent.service.ts`
- `src/modules/im-provider/providers/wukongim/wukongim.provider.ts`

执行步骤：

1. 审核每个公开配置项、公开方法、公开 provider 能力的调用入口。
2. 区分三类情况：
   - 应当立即实现并可验证
   - 应当降级为显式不支持
   - 应当从公开接口中移除或改为实验性能力
3. 为每一类产出最小可验证修复：
   - 真正接线
   - 明确异常
   - 明确文档和契约边界

退出标准：

1. 不再存在“配置写了但完全无效”的公开选项
2. 不再存在“方法公开但实际上什么也不做”的核心服务接口
3. 不再存在“安全相关能力名义存在、实际未实现”的 provider 接口

### P1. 打通 E2E 环境闭环

目标：

1. 明确 Docker 在当前环境下的可用性
2. 校准 `.env.test`、数据库用户、密码、初始化脚本
3. 形成可以重复执行的 E2E 启动和清理流程

执行步骤：

1. 复核 `test/`、`scripts/`、`database/` 与测试环境变量之间的依赖关系。
2. 验证测试数据库初始化脚本在 Windows / Linux shell 场景下是否等价可执行。
3. 若 Docker 不稳定，则补充降级路径或显式前置检测。

退出标准：

1. `npm run test:e2e` 具备明确的前置条件说明
2. 环境不满足时能够快速失败并提示缺失项
3. 环境满足时可稳定运行

### P2. 扩大真实行为回归覆盖面

候选范围：

- `agent memory`
- `extensions`
- `wukongim provider`
- `craw`

执行步骤：

1. 先为真实缺口补最小失败用例。
2. 再实现闭环修复。
3. 最后补类型、构建、静态和目标测试验证。

退出标准：

1. 每个本轮修复过的真实行为都有至少一个自动化回归用例
2. 不依赖“手工感觉正确”宣告完成

## 风险与约束

1. 当前工作区仍然存在大量非本轮改动，后续修复必须继续避免误回滚。
2. `wukongim` 和 `extensions` 可能牵涉外部依赖或控制面能力，必要时应先做契约收敛，再做实现。
3. E2E 是否可执行仍受 Docker 与数据库环境影响，未验证前不能宣称通过。

## 建议执行顺序

1. `extensions` 配置契约收敛
2. `wukongim` token 校验与订阅钩子真实性补齐
3. `craw setupOwnerEmail()` 收敛为真实现或显式失败
4. E2E 环境闸门与跨平台验证

## 成功定义

下一轮完成后，应当能明确回答以下问题且答案有代码或测试支撑：

1. 公开配置项是否真的影响运行时行为
2. 公开接口是否真的执行其声明语义
3. provider 安全边界是否存在伪实现
4. E2E 是否可在受支持环境中重复执行
