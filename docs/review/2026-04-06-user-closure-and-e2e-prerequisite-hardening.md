# OpenChat 第四轮修复记录：User 模块收口与 E2E 前置依赖硬化

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第四轮质量收敛

## 本轮目标

在保持 `npm run lint:types` 与 `npm run build` 持续通过的前提下，完成两类高价值修复：

1. 收敛 `src/modules/user/*` 与 `src/common/decorators/cache-control.decorator.ts` 的剩余 lint error
2. 对 `test/app.e2e-spec.ts` 的运行期超时做根因定位，并把失败模式从“长时间挂起”收敛为“快速、可执行的错误反馈”

## 已确认并修复的问题

### BUG-009 `RemoteUserManagerService.createUser()` 丢失上游异常链

- 严重级别: Medium
- 状态: 已修复并有回归测试
- 位置:
  - `src/modules/user/remote-user-manager.service.ts`
  - `src/modules/user/remote-user-manager.service.spec.ts`
- 症状:
  - 远端用户中心创建失败时，只抛出 `Failed to create user`
  - 原始错误没有挂到 `cause`，排障时无法追踪真实失败源
- 根因:
  - `catch` 分支重新构造了 symptom error，但没有保留 upstream error
- 修复方案:
  - 改为 `Object.assign(new Error('Failed to create user'), { cause: error })`
  - 先新增失败测试，证明旧实现丢失 `cause`，再修复实现
- 验证:
  - `npm test -- --runInBand --runTestsByPath src/modules/user/remote-user-manager.service.spec.ts`
  - 结果: 先失败，修复后通过

### BUG-010 User 模块存在一批集中 dead-code / unused lint error

- 严重级别: Medium
- 状态: 本轮已清零该批次 error
- 位置:
  - `src/modules/user/auth.controller.ts`
  - `src/modules/user/auth.service.ts`
  - `src/modules/user/controllers/user.controller.ts`
  - `src/modules/user/local-user-manager.service.ts`
  - `src/modules/user/user-sync.service.ts`
  - `src/modules/user/user.interface.ts`
  - `src/modules/user/verification-code.service.ts`
  - `src/modules/user/sanitize-user.util.ts`
- 症状:
  - 多处通过解构丢弃 `password` 触发未使用变量 error
  - 若干 import、局部变量与参数未使用
  - 测试环境配置与业务注释表达不一致
- 根因:
  - 历史代码多轮演进后，静态卫生问题在高频用户链路堆积
  - “脱敏逻辑写在调用点”导致同类问题反复出现
- 修复方案:
  - 增加 `sanitizeUser()` 公共工具，统一移除 `password`
  - 清理未使用 import / 参数 / 临时变量
  - 修正 `forgotPassword()` 中无意义的 `resetToken` 残留
- 验证:
  - `npx eslint src/modules/user --ext .ts`
  - 结果: `0 errors / 33 warnings`

### BUG-011 E2E 测试环境剖面漂移，导致启动链长时间重试并表现为超时

- 严重级别: High
- 状态: 已完成根因定位与失败模式修复，当前环境仍缺少可用测试数据库凭据
- 位置:
  - `test/setup.ts`
  - `test/app.e2e-spec.ts`
  - `src/common/config/typeorm.options.ts`
  - `src/common/config/typeorm.options.spec.ts`
- 症状:
  - `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts` 长时间无输出并最终超时
- 根因调查证据:
  - 独立探针脚本证明阻塞点发生在 `AppModule` 编译阶段
  - `TypeOrmModule` 在测试环境中使用错误凭据长时间重试
  - 原 `test/setup.ts` 使用 `postgres/postgres`，与仓库文档及 `typeorm.options.ts` 的测试默认值 `openchat/openchat_password` 不一致
  - `test/app.e2e-spec.ts` 为三个 suite 分别初始化整套 `AppModule`，放大了依赖初始化成本与失败等待时间
- 修复方案:
  - 把 `test/setup.ts` 调整到文档定义的测试剖面：
    - `DB_USERNAME=openchat`
    - `DB_PASSWORD=openchat_password`
    - `REDIS_DB=10`
    - `REDIS_QUEUE_DB=11`
    - `WUKONGIM_ENABLED=false`
    - `ENABLE_REDIS_ADAPTER=false`
    - `QUEUE_ENABLED=false`
  - 在 `createTypeOrmModuleOptions()` 中加入测试环境 fail-fast 重试策略：
    - `retryAttempts: 1`
    - `retryDelay: 0`
  - 把 `test/app.e2e-spec.ts` 改为单次应用初始化
  - 在 E2E 启动前增加数据库与 Redis 的短超时前置探针，直接给出可执行错误
- 验证:
  - `npm test -- --runInBand --runTestsByPath src/common/config/typeorm.options.spec.ts`
  - 结果: `4/4` 通过
  - `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts --detectOpenHandles --verbose`
  - 结果:
    - 不再无输出超时
    - 约 8 秒内失败
    - 明确报出 `E2E database prerequisite failed`
    - 根因透出为当前环境数据库认证失败：`password authentication failed for user "openchat"`

## 本轮代码改动

### User 模块修复

- 新增:
  - `src/modules/user/sanitize-user.util.ts`
  - `src/modules/user/remote-user-manager.service.spec.ts`
- 修复:
  - `src/modules/user/remote-user-manager.service.ts`
  - `src/modules/user/auth.controller.ts`
  - `src/modules/user/auth.service.ts`
  - `src/modules/user/controllers/user.controller.ts`
  - `src/modules/user/local-user-manager.service.ts`
  - `src/modules/user/user-sync.service.ts`
  - `src/modules/user/user.interface.ts`
  - `src/modules/user/verification-code.service.ts`

### 公共层与测试基础设施修复

- 修复:
  - `src/common/decorators/cache-control.decorator.ts`
  - `src/common/config/typeorm.options.ts`
  - `src/common/config/typeorm.options.spec.ts`
  - `test/setup.ts`
  - `test/app.e2e-spec.ts`
- 依赖补齐:
  - `package.json`
  - `package-lock.json`
  - 新增 `@types/pg`

## 验证结果

### 定向验证

- `npm test -- --runInBand --runTestsByPath src/modules/user/remote-user-manager.service.spec.ts src/modules/user/auth.service.spec.ts src/modules/user/user-sync.service.spec.ts`
  - 结果: `17/17` 通过
- `npm test -- --runInBand --runTestsByPath src/common/config/typeorm.options.spec.ts`
  - 结果: `4/4` 通过
- `npx eslint src/modules/user --ext .ts`
  - 结果: `0 errors / 33 warnings`
- `npx eslint src/common/decorators/cache-control.decorator.ts --ext .ts`
  - 结果: `0 errors / 5 warnings`
- `npx eslint test/app.e2e-spec.ts test/setup.ts src/common/config/typeorm.options.ts src/common/config/typeorm.options.spec.ts --ext .ts`
  - 结果: 通过

### 项目级验证

- `npm run lint:types`
  - 结果: 通过
- `npm run build`
  - 结果: 通过
- `npm run lint`
  - 结果: 未通过，但全局基线继续下降为 `262 errors / 2181 warnings`
- `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts --detectOpenHandles --verbose`
  - 结果: 未通过
  - 当前 blocker: 本机测试数据库凭据不匹配，E2E 已能快速失败并打印明确修复指令

## 基线变化

上一轮结束时:

- `npm run lint`: `282 errors / 2184 warnings`

本轮结束后:

- `npm run lint`: `262 errors / 2181 warnings`

净变化:

- Lint error: `282 -> 262`，净下降 `20`
- Lint warning: `2184 -> 2181`，净下降 `3`

## 结论

本轮已经形成完整闭环：

1. `user` 模块 error 批次完成收口
2. 一个真实异常链缺陷被修复并回归测试锁定
3. E2E 从“无输出挂死”收敛为“快速、带根因与修复建议的失败”
4. `types/build` 质量闸门持续保持绿色

当前仍不能宣称 E2E 全绿，因为本机测试数据库认证尚未满足仓库约定的测试剖面；但阻塞已被压缩为单一、明确、可执行的环境问题，不再是模糊超时。
