# OpenChat 第三轮修复记录：基础服务缓存一致性与低风险 Lint 收敛

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第三轮质量收敛

## 本轮目标

在保持 `npm run lint:types` 与 `npm run build` 持续通过的前提下，完成两类高收益收敛：

1. 修复 `src/common/base/*` 中已经确认的真实行为缺陷
2. 消化一批低风险、确定性的 lint error，继续压低全局 error 基线

## 已确认并修复的问题

### BUG-007 `OwnedEntityService` 写操作在缓存失效完成前提前返回

- 严重级别: High
- 状态: 已验证修复
- 位置:
  - `src/common/base/owned-entity.service.ts`
  - `src/common/base/owned-entity.service.spec.ts`
- 症状:
  - `create` / `update` / `delete` / `restore` / `transferOwnership` 在调用 `invalidateCache()` 后未 `await`
  - 调用方可能在数据库写入完成后立即读取到旧缓存，产生短暂不一致窗口
- 根因:
  - `OwnedEntityService` 的写路径与 `BaseEntityService` 的顺序约束不一致
  - 基础层服务未统一遵守“持久化成功 -> 事件发出 -> 缓存失效完成 -> 再向上返回”的一致性顺序
- 影响:
  - 高并发下，拥有者资源的更新、删除、恢复、转移后可能短时间暴露旧数据
  - 上层业务难以推断写后读语义，增加跨节点排障成本
- 修复方案:
  - 所有写路径统一改为 `await this.invalidateCache(...)`
  - 保持 `invalidateCache()` 内部对缓存删除失败的兜底日志，不把缓存系统瞬时异常放大为业务写失败
- 验证:
  - 新增回归测试 `src/common/base/owned-entity.service.spec.ts`
  - 先构造失败用例，证明旧实现会在缓存失效完成前提前 resolve
  - 修复后回归测试转绿

### BUG-008 基础层与低风险外围文件存在持续性的 dead-code/lint error 积压

- 严重级别: Medium
- 状态: 本轮部分收敛
- 位置:
  - `src/common/base/crud.service.ts`
  - `src/common/base/entity.service.ts`
  - `src/common/cache/cache-protection.service.ts`
  - `src/common/config/app.config.ts`
  - `src/common/config/snake-naming.strategy.ts`
  - `src/common/decorators/api.decorator.ts`
  - `src/common/decorators/audit.decorator.ts`
  - `test/app.e2e-spec.ts`
  - `test/sdkwork-im-sdk/assemble-sdk.spec.ts`
- 症状:
  - 未使用 import、未使用 catch 参数、未使用局部变量、无意义转义、无实际赋值的 e2e 变量长期存在
- 根因:
  - 历史代码在多轮迭代中堆积了样板残留和临时测试代码
  - 某些测试文件只“看起来像能跑”，但并未建立真实前置状态
- 影响:
  - 全局 lint error 持续偏高，掩盖真实问题
  - 测试可维护性下降，回归成本增加
- 修复方案:
  - 清理死代码和无效参数
  - 修复 `test/app.e2e-spec.ts` 中消息用例的注册/令牌前置，使其不再依赖未赋值变量
  - 修复 SDK 组装测试中的多处无意义转义

## 本轮代码改动

### 第一批: `src/common/base/*`

新增:

- `src/common/base/owned-entity.service.spec.ts`

修复:

- `src/common/base/owned-entity.service.ts`
  - 统一等待缓存失效完成后再返回
  - 清理未使用 import
- `src/common/base/crud.service.ts`
  - 清理未使用 DTO import
  - 清理未使用 catch 参数
- `src/common/base/entity.service.ts`
  - 清理未使用 catch 参数

### 第二批: 低风险 error 收敛

修复:

- `src/common/cache/cache-protection.service.ts`
  - 删除未使用的 `lockKey`
- `src/common/config/app.config.ts`
  - 删除未使用的校验装饰器导入
- `src/common/config/snake-naming.strategy.ts`
  - 将未使用参数显式改名为 `_firstPropertyName` / `_secondPropertyName`
- `src/common/decorators/api.decorator.ts`
  - 删除未使用的 `ApiResponse` 导入
- `src/common/decorators/audit.decorator.ts`
  - 删除未使用的 `Response` 导入与变量
- `test/app.e2e-spec.ts`
  - 为消息用例补齐注册前置，真实获得 `accessToken` 与 `userId`
- `test/sdkwork-im-sdk/assemble-sdk.spec.ts`
  - 清理 `no-useless-escape`

### 第三批: e2e 测试基础设施补强

修复:

- `package.json`
  - 补充 `supertest` 与 `@types/supertest` 开发依赖
- `package-lock.json`
  - 锁文件与新增依赖保持一致
- `test/jest-e2e.json`
  - 补齐 `^@/(.*)$` 到 `src/*` 的路径别名映射
- `test/app.e2e-spec.ts`
  - 改为显式的 `supertest` 默认导入与 `Response` 类型
- `src/modules/iot/xiaozhi/xiaozhi.service.ts`
- `src/modules/iot/xiaozhi/services/xiaozhi-connection.service.ts`
- `src/modules/iot/xiaozhi/xiaozhi.types.ts`
  - 统一 `ws` 默认导入方式，避免 e2e ts-jest 下退化成错误的 `WebSocket` 类型
  - 顺手清理触达文件中的 unused import error

## 验证结果

### 定向验证

- `npm test -- --runInBand --runTestsByPath src/common/base/owned-entity.service.spec.ts`
  - 结果: 先失败，修复后通过
- `npx eslint src/common/base --ext .ts`
  - 结果: `0 errors / 88 warnings`
- `npx eslint src/common/cache/cache-protection.service.ts src/common/config/app.config.ts src/common/config/snake-naming.strategy.ts src/common/decorators/api.decorator.ts src/common/decorators/audit.decorator.ts test/app.e2e-spec.ts test/sdkwork-im-sdk/assemble-sdk.spec.ts`
  - 结果: `0 errors / 18 warnings`

### 全量质量闸门

- `npm run lint:types`
  - 结果: 通过
- `npm run build`
  - 结果: 通过
- `npm test -- --runInBand --runTestsByPath src/common/base/owned-entity.service.spec.ts src/common/utils/error.util.spec.ts src/modules/agent/providers/llm-provider.factory.spec.ts src/common/schedulers/task-scheduler.service.spec.ts`
  - 结果: `14/14` 通过
- `npm run lint`
  - 结果: 未通过，但全局基线继续下降
- `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts`
  - 结果: 从“编译即失败”推进到“运行期超时”
  - 已确认并修复的基础设施缺口:
    - 缺少 `supertest` 依赖与类型
    - `jest-e2e.json` 缺少 `@/` 别名映射
    - `ws` 导入方式在 ts-jest 下类型不兼容
  - 当前剩余 blocker:
    - e2e 用例运行期超时，推断与本地依赖环境或应用启动链路有关，需要下一轮单独排查

## 基线变化

上一轮结束时基线:

- `npm run lint`: `309 errors / 2184 warnings`

本轮第一批（基础服务修复）后:

- `npm run lint`: `303 errors / 2184 warnings`

本轮第二批（低风险 error 收敛）后:

- `npm run lint`: `284 errors / 2184 warnings`

本轮第三批（e2e 基础设施补强与触达文件收口）后:

- `npm run lint`: `282 errors / 2184 warnings`

净变化:

- Lint error: `309 -> 282`，本轮净下降 `27`

## 结论

本轮不仅继续降低了全局 lint error，更重要的是补上了一个基础层时序一致性缺陷。`OwnedEntityService` 现在与 `BaseEntityService` 在“写后缓存失效”的顺序上保持一致，基础服务的语义更可靠。

当前仓库状态依然不能宣称“完成”：

- `npm run lint` 仍未通过
- `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts` 仍因运行期超时未完成闭环
- `src/modules/user/*` 仍是下一批最密集的 error 集中区
- warning 总量仍高，需要后续分批治理
