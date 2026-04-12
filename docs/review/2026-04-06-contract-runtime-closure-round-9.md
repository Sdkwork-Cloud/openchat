# OpenChat 第九轮修复记录：公开契约运行时闭环

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第九轮运行时契约缺口修复

## 本轮目标

在前一轮已经完成静态基线清零的基础上，本轮不再处理表层 lint 噪音，而是直接关闭此前文档中确认的三类公开契约缺口：

1. `WukongIMProvider` 的 `validateToken()` 与订阅能力为占位实现
2. `CrawAgentService.setupOwnerEmail()` 为无实际效果的公共接口
3. `ExtensionsModuleOptions.primaryUserCenterId / enableAutoRecovery` 未进入运行时

## 本轮完成内容

### 1. WukongIM token 与订阅桥接闭环

处理文件：

- `src/modules/wukongim/wukongim-token.service.ts`
- `src/modules/wukongim/wukongim.service.ts`
- `src/modules/wukongim/wukongim.module.ts`
- `src/modules/wukongim/wukongim.webhook.controller.ts`
- `src/modules/wukongim/wukongim-webhook.module.ts`
- `src/modules/wukongim/index.ts`
- `src/modules/im-provider/providers/wukongim/wukongim.provider.ts`

修复内容：

1. 新增 `WukongIMTokenService`
   - 统一生成签名 token
   - 统一校验 token
   - 优先使用 `WUKONGIM_SECRET`，缺省回退到 `JWT_SECRET`
2. `WukongIMService.getUserToken()`
   - 不再生成不可验证的随机 token
   - 改为使用共享 token service 生成可验证 token，并继续注册到 `/user/token`
3. `WukongIMProvider.generateToken() / validateToken()`
   - 改为真实签发和真实校验
4. `WukongIMProvider` 的订阅方法
   - 不再吞掉回调
   - 恢复基类注册能力
5. `connect() / disconnect()`
   - 触发连接状态回调
6. `WukongIMWebhookController`
   - 补齐 `message` 事件分支
   - 将 `connect / disconnect / user.online / user.offline / message` 事件桥接到 provider
7. `WukongIMWebhookModule`
   - 显式导入 `IMProviderModule`，确保 webhook 控制器能拿到 provider

结果：

- `validateToken()` 不再是永远返回无效的占位
- 订阅能力不再是纯 warning 空壳
- 前端获取的 WukongIM token 与 provider 校验使用同一套契约

### 2. Craw owner email 闭环

处理文件：

- `src/modules/craw/entities/craw-agent.entity.ts`
- `src/modules/craw/services/craw-agent.service.ts`
- `src/modules/craw/craw.controller.ts`
- `database/schema.sql`
- `database/patches/20260406_add_craw_agent_owner_email.sql`

修复内容：

1. 为 `craw_agents` 增加 `owner_email` 字段
2. 为数据库 schema 与 patch 同步补列和索引
3. `setupOwnerEmail()`
   - 按 `apiKey` 查找 agent
   - 规范化邮箱为 `trim + lowercase`
   - 校验邮箱格式
   - 真实持久化到 `ownerEmail`
4. `craw.controller.ts`
   - 将响应文案从假性的 “Email setup sent!” 改为真实的 “Owner email saved.”

结果：

- 该接口不再是公共空实现
- 返回语义与实际行为一致

### 3. Extensions module options 运行时接线

处理文件：

- `src/extensions/extensions.options.ts`
- `src/extensions/extensions.module.ts`
- `src/extensions/user-center/user-center.proxy.ts`
- `src/extensions/core/extension-health.service.ts`
- `src/extensions/index.ts`

修复内容：

1. 新增 `EXTENSIONS_OPTIONS` 注入令牌与独立 options 定义
2. `ExtensionsModule.forRoot()`
   - 真实注入 module options
3. `ExtensionsModule.forRootAsync()`
   - 统一使用同一 options token
4. `UserCenterProxy`
   - 优先使用 `primaryUserCenterId`
   - 只有在 options 未指定时才回退环境变量 `USER_CENTER_EXTENSION`
5. `ExtensionHealthService`
   - `enableAutoRecovery` 不再只读环境变量
   - `enableHealthCheck` 也进入运行时配置合并

结果：

- `primaryUserCenterId` 与 `enableAutoRecovery` 不再是声明型摆设
- 模块 options 与服务运行时行为形成闭环

## 本轮新增测试

新增或扩展测试文件：

- `src/modules/wukongim/wukongim-token.service.spec.ts`
- `src/modules/wukongim/wukongim.webhook.controller.spec.ts`
- `src/modules/im-provider/providers/wukongim/wukongim.provider.spec.ts`
- `src/modules/wukongim/wukongim.service.spec.ts`
- `src/modules/craw/services/craw-agent.service.spec.ts`
- `src/extensions/user-center/user-center.proxy.spec.ts`
- `src/extensions/core/extension-health.service.spec.ts`

覆盖点：

1. WukongIM token 可签发、可校验、可识别篡改与过期
2. WukongIM provider 能注册回调并通过 webhook/连接生命周期派发
3. WukongIM service 返回的 token 与 provider 校验契约一致
4. craw owner email 能规范化后落库并拒绝非法邮箱
5. extensions options 能改变主用户中心选择与自动恢复行为

## 本轮验证结果

### 定向测试

命令：

```bash
npm run test -- --runTestsByPath src/modules/wukongim/wukongim-token.service.spec.ts src/modules/wukongim/wukongim.service.spec.ts src/modules/im-provider/providers/wukongim/wukongim.provider.spec.ts src/modules/wukongim/wukongim.webhook.controller.spec.ts src/modules/craw/services/craw-agent.service.spec.ts src/extensions/user-center/user-center.proxy.spec.ts src/extensions/core/extension-health.service.spec.ts --runInBand
```

结果：

- 通过
- `17 passed, 17 total`

说明：

- 输出中的部分 `warn/debug/log` 来自特意构造的 webhook 与 unhealthy 扩展场景，不代表失败。

### 项目级验证

命令：

```bash
npm run lint:types
```

结果：

- 通过

命令：

```bash
npm run build
```

结果：

- 通过

命令：

```bash
npx eslint "{src,apps,libs,test}/**/*.ts" --quiet
```

结果：

- 通过

## 当前状态更新

此前确认的三类公开契约缺口，当前状态如下：

1. `WukongIMProvider.validateToken()` 与订阅钩子
   - 已闭环
2. `CrawAgentService.setupOwnerEmail()`
   - 已闭环
3. `ExtensionsModuleOptions.primaryUserCenterId / enableAutoRecovery`
   - 已闭环

## 当前剩余高优先级问题

1. E2E 环境仍未闭环
   - Docker 可用性、测试数据库初始化与鉴权仍需单独验证
2. 跨平台交付仍缺少端到端执行证据
   - 当前已验证类型、构建和单元测试
   - 仍未验证完整 `test:e2e`

## 结论

本轮已经从“公开接口看起来存在”推进到“运行时真的有行为”。OpenChat 当前阶段的重点不再是公开契约真实性，而是下一步把 E2E 环境和跨平台交付链补齐。
