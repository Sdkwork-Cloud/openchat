# OpenChat 顶级分包架构标准

## 1. 分包目录标准

分包必须放在仓库顶级 `packages/` 目录，不允许在 `src/modules` 内模拟分包层。

目录规范：

```txt
packages/
  sdkwork-openchat-pc-agent/
  sdkwork-openchat-pc-im/
  sdkwork-openchat-pc-settings/
  sdkwork-openchat-pc-commons/
  ...
```

命名规范：

1. 目录名：`sdkwork-openchat-pc-xxx`
2. 包名：`@sdkwork/openchat-pc-xxx`
3. `xxx` 对应 `src/modules` 的模块名；公共能力统一为 `commons`

## 2. 已落地分包清单

已按 `src/modules` 生成以下包：

- `@sdkwork/openchat-pc-agent`
- `@sdkwork/openchat-pc-appstore`
- `@sdkwork/openchat-pc-auth`
- `@sdkwork/openchat-pc-commerce`
- `@sdkwork/openchat-pc-contacts`
- `@sdkwork/openchat-pc-creation`
- `@sdkwork/openchat-pc-device`
- `@sdkwork/openchat-pc-discover`
- `@sdkwork/openchat-pc-drive`
- `@sdkwork/openchat-pc-im`
- `@sdkwork/openchat-pc-notification`
- `@sdkwork/openchat-pc-rtc`
- `@sdkwork/openchat-pc-search`
- `@sdkwork/openchat-pc-settings`
- `@sdkwork/openchat-pc-skill`
- `@sdkwork/openchat-pc-social`
- `@sdkwork/openchat-pc-terminal`
- `@sdkwork/openchat-pc-tool`
- `@sdkwork/openchat-pc-tools`
- `@sdkwork/openchat-pc-video`
- `@sdkwork/openchat-pc-wallet`
- `@sdkwork/openchat-pc-commons`

## 3. 包入口约定

每个包统一通过 `src/index.ts` 对外导出：

- 模块包：转发 `src/modules/<module>/index.ts`
- `settings`、`terminal` 包：额外兼容导出应用壳页面
- `commons` 包：聚合 `src/components`、`src/services`、`src/types` 与公共页面

## 4. 工程接入标准

1. 根 `package.json` 启用 workspace：`"workspaces": ["packages/*"]`
2. TS 路径支持 `@sdkwork/openchat-pc-*`
3. Vite/Vitest alias 同步 `@sdkwork/openchat-pc-*`
4. App/Router 优先从包名导入，而非直接深层导入 `src/modules/*`

推荐导入：

```ts
import { ChatPage } from "@sdkwork/openchat-pc-im";
import { AgentMarketPage } from "@sdkwork/openchat-pc-agent";
import { AppSettingsPage } from "@sdkwork/openchat-pc-settings";
import { Button, apiClient } from "@sdkwork/openchat-pc-commons";
```
