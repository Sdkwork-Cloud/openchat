# OpenChat 第六轮修复记录：流式导出闭环与批次 A 收口

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第六轮静态质量与真实缺陷闭环

## 本轮目标

在保持 `npm run lint:types` 和 `npm run build` 持续通过的前提下，完成 `src/common/services/*` 中 `BufferEncoding + import/export` 批次的闭环：

1. 用测试复现真实缺陷
2. 修复流式导出错误行为
3. 清理本批次文件中的 error 级静态问题
4. 更新全局 `eslint --quiet` 基线

## 本轮新增问题与修复

### BUG-014 `ExportService.exportStream()` 错误地双重消费 `AsyncIterable`

- 严重级别: High
- 状态: 已修复并补测试
- 影响范围:
  - `src/common/services/export.service.ts`
- 现象:
  - `exportStream()` 先遍历一次 `dataStream` 统计 `total`
  - 随后再次遍历相同 `dataStream` 写出内容
  - 对于单次可消费的异步流，第一次遍历后数据已经耗尽，导致导出文件为空或缺失数据
- 复现方式:
  - 新增测试 `src/common/services/export.service.spec.ts`
  - 测试名: `exports every row from a one-shot async iterable stream`
  - 修复前结果: `recordsCount` 为 `0`
- 根因:
  - 把 `AsyncIterable` 当成可重复遍历集合使用
- 修复:
  - 移除对 `dataStream` 的预统计遍历
  - 改为单次遍历中直接过滤、转换、分批写出
  - 新增 `writeChunk()`，在 `write()` 返回背压信号时等待 `drain`
  - 在导出前显式确保导出目录存在
- 验证:
  - 新增回归测试通过
  - 文件内容包含完整 CSV 头和两条记录

### BUG-015 `DataExportService.exportStream()` JSON 分批导出会写出非法 JSON

- 严重级别: High
- 状态: 已修复并补测试
- 影响范围:
  - `src/common/services/data-export.service.ts`
- 现象:
  - 第一批 JSON 写出的是完整数组字符串
  - 后续批次直接在已闭合数组后追加逗号和内容
  - 最终文件无法被 `JSON.parse()`
- 复现方式:
  - 新增测试 `src/common/services/data-export.service.spec.ts`
  - 测试名: `writes a valid JSON array when streaming across multiple batches`
  - 修复前结果: `JSON.parse()` 抛出语法错误
- 根因:
  - 流式 JSON 批次写出没有显式管理数组起始、分隔符和结束边界
- 修复:
  - 首批输出 `[` 和首批元素
  - 后续批次只追加 `,` 和元素内容
  - 导出结束时统一追加 `]`
  - 空流时写出 `[]`
  - JSON 流式导出补齐与普通导出一致的字段投影逻辑
- 验证:
  - 1001 行跨批次导出后可正常 `JSON.parse()`
  - 首尾记录均正确

## 本轮顺手收口的静态问题

已收口文件:

- `src/common/services/export.service.ts`
- `src/common/services/data-export.service.ts`
- `src/common/services/import.service.ts`
- `src/common/services/encryption.service.ts`
- `src/common/services/file-handler.service.ts`

已修复的 error 级问题:

1. `BufferEncoding` 被 ESLint 识别为未定义标识符，统一改为 `NodeJS.BufferEncoding`
2. `import.service.ts` 中无效泛型、无效初始赋值和未使用参数
3. `export.service.ts` 中未使用 import、无效赋值和未使用参数
4. 同批次文件保持 `0 error`，仅保留 warning 级 `no-explicit-any`

## 验证结果

### 新增测试

- `npm run test -- --runTestsByPath src/common/services/export.service.spec.ts src/common/services/data-export.service.spec.ts --runInBand`
  - 结果: 通过

### 定向静态检查

- `npx eslint src/common/services/export.service.ts src/common/services/data-export.service.ts src/common/services/import.service.ts src/common/services/encryption.service.ts src/common/services/file-handler.service.ts src/common/services/export.service.spec.ts src/common/services/data-export.service.spec.ts`
  - 结果: `0 error`，仅 warning

### 项目级验证

- `npm run lint:types`
  - 结果: 通过
- `npm run build`
  - 结果: 通过
- `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
  - 结果: 全局仍未清零，但 error 基线从 `174` 降到 `159`

## 基线变化

本轮开始时:

- `eslint --quiet`: `174 errors`

本轮完成后:

- `eslint --quiet`: `159 errors`

净变化:

- `174 -> 159`
- 净下降 `15` 个 error

## 当前剩余高价值问题

下一批仍优先处理 `src/common/services/*` 中低风险且高收益的 error：

1. `distributed-lock.service.ts`
2. `file-storage.service.ts`
3. `lock-manager.service.ts`
4. `message-queue.service.ts`
5. `metrics.service.ts`
6. `notification.service.ts`

这些问题仍主要集中在:

- 未使用参数
- 未使用局部变量
- `no-case-declarations`

## E2E 状态

本轮没有重新尝试 E2E。原因不是代码回退，而是当前优先完成批次 A 的真实缺陷与静态收口。

E2E 前置状态保持不变:

1. `.env.test` 已存在
2. `docker ps` 与 `docker version` 之前仍存在 CLI 卡住问题
3. 只有在 Docker CLI 恢复正常响应后，才适合继续 `make test-env` 和 `npm run test:e2e`

## 结论

本轮已经形成完整闭环:

1. 用测试复现两个真实流式导出缺陷
2. 以最小行为修复完成导出链路收口
3. 保持 `lint:types` 与 `build` 绿色
4. 把全局 `eslint --quiet` error 基线继续压低到 `159`
5. 为下一批 `common/services` 收口建立了更稳定的导出/导入基础
