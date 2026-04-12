# OpenChat 架构说明：OwnedEntityService 缓存失效一致性设计

日期: 2026-04-06
范围: `apps/openchat`

## 背景

基础服务层同时存在两套相近的资源服务抽象：

- `BaseEntityService`
- `OwnedEntityService`

两者都承担“数据库写入 + 事件发出 + 缓存处理”的职责，但在本轮修复前，两者的写后顺序并不一致：

- `BaseEntityService` 会等待缓存失效完成后再向上返回
- `OwnedEntityService` 则在调用 `invalidateCache()` 后直接返回

这会导致拥有者资源相关链路存在短暂的写后读不一致窗口。

## 设计目标

1. 统一基础服务写后语义
2. 保证写成功返回时，主缓存键已经完成失效
3. 不把缓存删除失败直接升级为业务写失败
4. 让调用方能基于一致的基础层约束设计业务流程

## 设计规则

对 `OwnedEntityService` 的所有写方法应用统一顺序约束：

1. 完成数据库写入
2. 发布领域/业务事件
3. 等待 `invalidateCache(id)` 完成
4. 再向上层返回结果

适用方法:

- `create`
- `update`
- `delete`
- `restore`
- `transferOwnership`

## 失败处理策略

`invalidateCache()` 保持当前容错策略不变：

- 内部调用 `cacheService.delete()`
- 若缓存删除失败，只记录 warning
- 不把缓存系统瞬时异常放大为业务写异常

这样做的原因是：

- 基础资源写入的主事实仍然是数据库
- 缓存删除失败应由日志、监控、后续读取回源与运维手段兜底
- 但“是否等待缓存失效完成”仍必须有统一顺序约束

## 回归验证

新增回归测试:

- `src/common/base/owned-entity.service.spec.ts`

测试目标:

- 证明旧实现会在缓存删除 Promise 未完成前提前 resolve
- 修复后必须等待缓存失效完成后才 resolve

这条测试将该规则从“实现细节”升级为“显式架构契约”。

## 对后续设计的约束

后续所有基础服务抽象如果承担缓存职责，必须显式满足以下要求：

- 写后返回顺序一致
- 缓存删除失败的降级策略一致
- 通过单元测试锁定关键时序约束

若未来引入二级缓存、批量失效、异步事件驱动失效，也必须先明确该服务对调用方承诺的是：

- 强一致写后读
- 最终一致写后读
- 还是仅对某些键提供顺序保证

当前 `OwnedEntityService` 与 `BaseEntityService` 已统一到同一条基础语义线上。
