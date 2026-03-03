# OpenChat PC 分包架构标准

## 1. 总体目标

项目采用 `pnpm workspace` + 顶级 `packages/` 分包架构，`src/` 仅保留应用壳层（启动、路由组装、平台适配）。  
任何业务能力、共享能力、状态管理、类型定义都必须在分包内实现，不允许回流到 `src/components|services|utils|types|store|modules`。

## 2. 分包命名规范

- 目录名: `packages/sdkwork-openchat-pc-xxx`
- 包名: `@sdkwork/openchat-pc-xxx`
- 统一入口: `src/index.ts`
- 包内类型检查脚本: `tsc --noEmit -p tsconfig.json`

`xxx` 建议使用业务域名词，如 `im`、`settings`、`wallet`。公共能力统一收敛到 `commons`。

## 3. 全局能力设计（基础三包 + 兼容聚合）

基础能力拆分为三个顶级包：

- `@sdkwork/openchat-pc-ui`: UI 与体验层（ThemeProvider、Toast、基础 UI 组件）
- `@sdkwork/openchat-pc-kernel`: 核心能力层（env/api/core/services/algorithms/di/tools）
- `@sdkwork/openchat-pc-contracts`: 共享契约层（types/contracts）

`@sdkwork/openchat-pc-commons` 作为兼容聚合层，对外统一转发基础三包与 shell 能力，便于平滑迁移历史引用。

依赖方向标准：

- `contracts` 不依赖 `ui/kernel`
- `kernel` 可依赖 `contracts`
- `ui` 可依赖 `kernel/contracts`
- `commons` 仅允许依赖 `ui/kernel/contracts`，禁止依赖业务分包

## 4. 业务分包标准模板

每个业务包建议目录：

```text
src/
  components/
  pages/
  services/
  store/
  hooks/
  entities/
  types/
  index.ts
```

业务包默认只依赖 `commons`。若跨业务包依赖不可避免，必须显式声明 `workspace:*`，并优先依赖对方公开 API（`@sdkwork/openchat-pc-xxx`），禁止引用对方 `/src/*`。

## 5. 架构守护与工作流

- 依赖同步: `pnpm run sync:workspace-deps`
- 架构校验: `pnpm run verify:packages`
- 全量类型检查: `pnpm run typecheck:all`
- 测试: `pnpm run test`

`verify:packages` 已强制检查：

- 分包命名与入口规范
- 包内禁止 `@/` 与跨包 `/src/` 引用
- 包不得通过相对路径越界访问 `src/` 或其他包
- `src/` 壳层目录白名单与业务目录禁入
