# OpenChat 下一轮实施计划

日期: 2026-04-06
阶段: 第三轮静态质量收敛

## 目标

在保持 `npm run build` 与 `npm run lint:types` 持续通过的前提下，优先降低全局 lint error 数量，把仓库从 `309 errors` 继续压缩到更低水平。

## 执行策略

采用“小批次、可回归、先 error 后 warning”的推进方式:

1. 只处理 lint `error`，不同时扩散到 warning 燃尽
2. 每批聚焦一个目录或一类问题
3. 每批结束必须执行 fresh verification
4. 每批结束都回写 `docs/review`

## 第三轮分批顺序

### 批次 A: `src/common/base/*`

优先原因:

- 公共基类影响面大
- 多数问题是 unused import / unused var，低风险高收益
- 修完后可以为更多模块降低同类扩散风险

动作:

- 清理 unused imports
- 清理未使用的 catch 参数
- 对必须保留的未使用参数统一改为 `_param`
- 保持行为不变

验证:

- `npx eslint src/common/base/**/*.ts`
- `npm run lint:types`
- `npm run build`

### 批次 B: `src/modules/user/*`

优先原因:

- lint error 密度高
- 多为 controller/service 的未使用字段、未使用 import、错误因果链问题
- 属于高频业务域，值得尽早收口

动作:

- 清理 unused destructuring 的 `password`
- 清理未使用 import
- 修复 `preserve-caught-error`
- 对未使用参数改为 `_name`

验证:

- `npx eslint src/modules/user/**/*.ts`
- `npm run lint:types`
- `npm run build`

### 批次 C: `test/*`

优先原因:

- 多为纯测试代码静态问题
- 改动风险最小
- 能进一步压低 lint error 总数

动作:

- 修复 `no-useless-escape`
- 修复 `no-unassigned-vars`
- 清理测试中的未使用变量

验证:

- `npx eslint test/**/*.ts`
- 对受影响测试执行定向 jest

## 成功标准

- 第三轮结束后:
  - `npm run build` 通过
  - `npm run lint:types` 通过
  - 全局 lint error 继续下降
  - 文档记录包含“修复前后数量对比”和“下一轮计划”
