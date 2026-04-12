# OpenChat 下一轮实施计划 V2

日期: 2026-04-06
阶段: 第四轮静态质量收敛
当前全局基线: `282 errors / 2184 warnings`

## 本轮计划目标

在不回退当前质量闸门的前提下，继续压缩 lint error，优先处理高密度且与真实业务链路强相关的模块。

硬约束:

- `npm run lint:types` 必须持续通过
- `npm run build` 必须持续通过
- 每一批结束后必须重新跑 targeted eslint
- 涉及真实行为修复时，必须有先失败后通过的回归测试

## 批次顺序

### 批次 A: `src/modules/user/*`

优先原因:

- 当前是剩余 lint error 最集中的业务域之一
- 涉及鉴权、用户信息脱敏、同步、远程管理器等高频链路
- 已存在一个明确的 `preserve-caught-error` 质量缺口

重点动作:

- 清理未使用 import
- 把刻意丢弃字段的解构统一改为 `_password` 之类的显式命名
- 修复 `remote-user-manager.service.ts` 的 symptom error 未附带 `cause`
- 清理未使用参数，统一改名为 `_options`、`_batchSize`、`_userData`
- 修正明显无意义的局部变量和常量

验证:

- `npx eslint src/modules/user --ext .ts`
- `npm run lint:types`
- `npm run build`
- 对受影响的 user 定向单测进行补跑

### 批次 B: `src/common/decorators/*` 与 `src/common/cache/*`

优先原因:

- 本轮已经清掉一部分，但仍有散点 error
- 都属于跨模块公共层，修完能减少后续扩散

重点动作:

- 修复 `src/common/decorators/cache-control.decorator.ts` 的剩余 unused 变量
- 继续清理低风险 dead code
- 不在这一轮扩展 warning 治理范围

验证:

- `npx eslint src/common/decorators src/common/cache --ext .ts`
- `npm run lint:types`
- `npm run build`

### 批次 C: `test/*` 余量复查

优先原因:

- 当前主要 error 已经清掉，但需要确认没有新回归
- 测试层静态质量应继续保持清洁，避免再次出现“能看不能跑”的用例

重点动作:

- 检查剩余测试文件是否还有隐藏的未赋值变量、死断言、平台耦合脚本
- 对已经改过的 e2e 与 SDK 组装测试做再验证
- 单独排查 `test/app.e2e-spec.ts` 运行期超时问题，确认是基础设施依赖缺失、启动路径阻塞，还是测试数据准备不足

验证:

- `npx eslint test --ext .ts`
- 对受影响测试做定向执行

## 成功标准

- 全局 lint error 继续下降
- `src/modules/user/*` 的 error 数量显著收敛
- 不新增 build/types 回归
- `/docs/review/` 中追加本轮修复记录与基线变化

## 风险说明

- `user` 模块兼具鉴权和脱敏逻辑，虽然大部分修复是静态卫生问题，但仍需警惕行为漂移
- 某些 e2e 用例依赖本地环境与数据库初始化状态，必要时只做 targeted lint/build 验证并在文档中显式记录
