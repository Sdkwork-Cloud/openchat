# OpenChat 第八轮修复记录：Message / RTC 静态收口与单测兼容性闭环

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第八轮静态质量与回归验证收口

## 本轮目标

在前序批次已经将全局 `eslint --quiet` 基线压降到 `11 errors` 的基础上，完成最后一批 `message / rtc` 收尾问题，达成以下结果：

1. 全局 `eslint --quiet` 归零
2. `message` 与 `rtc` 改动路径完成定向回归验证
3. 将本轮识别出的测试兼容性问题一并闭环

## 本轮完成内容

### 1. Message 静态问题收口

处理文件：

- `src/modules/message/message-filter.service.ts`
- `src/modules/message/message-search.controller.ts`
- `src/modules/message/message-search.service.ts`
- `src/modules/message/message.service.ts`

修复内容：

1. 删除未使用的 `ForbiddenException` import，避免误导权限控制能力已经接入。
2. 删除 `message-search.controller.ts` 中未接线的 Swagger 占位 DTO 与未使用的装饰器 import，保留现有 HTTP 接口与返回契约不变。
3. 将 `message-search.service.ts` 中暂未使用的占位参数显式改为 `_limit`，表明该接口仍是留白实现而不是遗漏逻辑。
4. 调整 `message.service.ts` 中多个仅用于占位的初始赋值：
   - `messageSeq`
   - `savedMessage`
   - `batchStatus`
5. 将无意义的 `catch (error)` 改为裸 `catch`，消除未使用异常变量。
6. 为批量 ack 指标上报增加 `finalBatchStatus` 回退，保证指标出口始终有明确状态值。

### 2. RTC 静态问题收口

处理文件：

- `src/modules/rtc/channels/tencent/index.ts`
- `src/modules/rtc/rtc.service.ts`

修复内容：

1. 删除 Tencent token buffer 拼装中的无效 `offset` 末次递增，保持编码行为不变。
2. 删除 `stopRoomRecording()` 中无意义的 `record = null` 初始赋值，仅保留真实分支赋值和空值守卫。

### 3. 定向单测兼容性修复

在运行 `message / rtc` 定向单测时，额外暴露出两处测试兼容性问题，本轮一并修复：

处理文件：

- `src/modules/message/message.service.spec.ts`
- `src/modules/rtc/rtc.service.spec.ts`

修复内容：

1. `message.service.spec.ts`
   - `jest.useFakeTimers().setSystemTime(now)` 在当前 Jest 30 组合下触发兼容性异常。
   - 调整为 `setSystemTime(now.getTime())`，测试意图不变，但与当前 fake timers 行为保持兼容。
2. `rtc.service.spec.ts`
   - `RTCService` 构造函数已新增 `aiExtension` 可选参数。
   - 测试工厂仍按旧参数位次注入 `prometheusService`，导致 mock 被错位注入到 `aiExtension`。
   - 补齐 `undefined` 占位后，Prometheus mock 恢复注入到正确参数位置。

## 本轮验证结果

### 定向静态检查

命令：

```bash
npx eslint src/modules/message/**/*.ts src/modules/rtc/**/*.ts --quiet
```

结果：

- 通过

### 定向单元测试

命令：

```bash
npm run test -- --runTestsByPath src/modules/message/message.service.spec.ts src/modules/rtc/rtc.service.spec.ts --runInBand
```

结果：

- 通过
- `66 passed, 66 total`

说明：

- 测试输出中的部分 `warn/error` 日志来自针对异常分支的断言场景，不代表测试失败。

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

## 基线演进

本阶段静态质量基线演进如下：

- 初始全局 quiet error: `95`
- 公共核心与服务批次后: `79`
- agent / ai-bot / bot-platform 批次后: `63`
- contact / conversation / craw / friend / group 批次后: `44`
- im-provider / iot / xiaozhi 批次后: `11`
- 本轮 `message / rtc` 收口后: `0`

## 当前仍未关闭的设计缺口

以下问题本轮已确认存在，但没有伪造实现：

1. `src/extensions/extensions.module.ts`
   - `ExtensionsModuleOptions.primaryUserCenterId`
   - `ExtensionsModuleOptions.enableAutoRecovery`
   - 目前仍为声明存在、运行时未真正接线
2. `src/modules/craw/services/craw-agent.service.ts`
   - `setupOwnerEmail()` 仍是公共但无实际效果的占位方法
3. `src/modules/im-provider/providers/wukongim/wukongim.provider.ts`
   - 部分订阅钩子与 `validateToken()` 仍是 warning 型占位实现
4. E2E 环境
   - Docker 可用性与测试数据库鉴权条件仍需单独打通后才能声明端到端通过

## 结论

本轮已经完成当前已知静态问题清零，并补齐了同路径单测兼容性问题。当前代码状态满足：

1. 全局 TypeScript 类型检查通过
2. 全局静态检查通过
3. 应用构建通过
4. `message / rtc` 定向单测通过

下一轮应从“声明了但未真正运行”的契约缺口入手，而不是继续做表层静态清理。
