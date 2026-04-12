# OpenChat 下一轮实施计划 V4

日期: 2026-04-06
阶段: 第六轮静态质量与 E2E 闭环推进
当前全局基线: `174 errors / eslint --quiet`

## 本轮目标

在保持 `npm run lint:types` 与 `npm run build` 持续通过的前提下，继续优先收敛 `src/common/services/*` 中确定性最高的 error，并在静态基线继续下降后重新尝试推进 E2E 测试环境闭环。

## 批次顺序

### 批次 A: `BufferEncoding + import/export` 集群

优先原因:

- 问题集中
- 修改面主要在类型声明和未使用变量层面
- 对运行时语义影响低

目标文件:

- `src/common/services/data-export.service.ts`
- `src/common/services/encryption.service.ts`
- `src/common/services/file-handler.service.ts`
- `src/common/services/export.service.ts`
- `src/common/services/import.service.ts`

重点动作:

- 为 `BufferEncoding` 提供 ESLint 可识别的类型来源
- 去除无效赋值 `no-useless-assignment`
- 收敛未使用参数和未使用 import

验证:

- `npx eslint <targets> --ext .ts`
- `npm run lint:types`
- `npm run build`

### 批次 B: 锁与存储抽象集群

优先原因:

- 仍属于 `src/common/services/*`
- 大多为未使用参数，不涉及控制流重构

目标文件:

- `src/common/services/distributed-lock.service.ts`
- `src/common/services/file-storage.service.ts`
- `src/common/services/lock-manager.service.ts`
- `src/common/services/message-queue.service.ts`
- `src/common/services/metrics.service.ts`
- `src/common/services/notification.service.ts`

重点动作:

- 清理未使用参数
- 处理 `no-case-declarations`
- 避免通过伪变量“消音”，优先删除无意义解构或用真实透传方式消除 error

验证:

- `npx eslint <targets> --ext .ts`
- `npm run lint:types`
- `npm run build`

### 批次 C: E2E 环境闭环重试

前置条件:

- 当前批次代码验证完成
- `.env.test` 已存在并与测试文档一致
- Docker CLI 可在本机稳定响应

动作:

1. 基于 `.env.example` 与文档约定补齐 `.env.test`
2. 验证 `docker ps`
3. 若仍卡住，先定位 Docker Desktop / daemon 通信问题，不直接进入 compose
4. 查阅并执行仓库约定的测试环境启动命令
5. 启动测试依赖
6. 执行 `npm run db:init:test`
7. 重新运行:
   - `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts --detectOpenHandles --verbose`

成功标准:

- 如果环境已恢复，继续定位新的单一业务 blocker
- 如果环境仍不可用，输出更精确的环境阻塞点并回写文档

## 成功标准

- `eslint --quiet` 全局 error 继续从 `174` 下降
- `npm run lint:types` 持续通过
- `npm run build` 持续通过
- E2E 至少完成一次新的环境闭环尝试，并留下可执行结论
