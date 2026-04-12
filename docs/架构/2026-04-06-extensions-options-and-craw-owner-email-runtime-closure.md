# OpenChat Extensions 运行时选项接线与 Craw Owner Email 闭环设计

日期: 2026-04-06
范围: `apps/openchat`

## 一、Extensions module options 运行时接线

### 背景

`ExtensionsModuleOptions` 中此前存在两类典型假配置：

1. `primaryUserCenterId`
2. `enableAutoRecovery`

它们的问题不是定义错误，而是根本没有进入运行时服务层。

### 根因

根因有两个：

1. `forRoot()` 没有提供统一的 options provider
2. 服务层只读取环境变量，不读取模块 options

因此即使调用方在代码里传入这些 options，也不会改变系统行为。

### 设计方案

本轮新增统一注入令牌 `EXTENSIONS_OPTIONS`，并将 options 定义独立到专用文件。

运行时接线如下：

1. `ExtensionsModule.forRoot()`
   - 通过 `EXTENSIONS_OPTIONS` 注入同步 options
2. `ExtensionsModule.forRootAsync()`
   - 通过同一 token 注入异步 options
3. `UserCenterProxy`
   - 优先使用 `primaryUserCenterId`
   - 再回退 `USER_CENTER_EXTENSION`
4. `ExtensionHealthService`
   - `enableAutoRecovery` 优先使用 module options
   - `enableHealthCheck` 优先使用 module options

### 收益

1. 模块级配置真正改变运行时行为
2. 同步与异步模块初始化路径一致
3. 用户中心选择和自动恢复策略不再依赖环境变量硬编码

## 二、Craw owner email 真实闭环

### 背景

`setupOwnerEmail()` 之前是典型公共空壳：

1. 控制器暴露了接口
2. 服务方法存在
3. 实际没有任何持久化行为

更严重的是，控制器还返回了会误导调用方的成功文案。

### 根因

根因贯穿三层：

1. entity 没有 `ownerEmail`
2. 数据库 schema 没有 `owner_email`
3. 服务方法没有任何验证和保存逻辑

### 设计方案

本轮将它收敛为“真实存储能力”，而不是“假装发送邮件”。

落地路径：

1. `craw_agents` 新增 `owner_email`
2. schema 与 patch 同步新增列和索引
3. 服务层对 email 做：
   - trim
   - lowercase
   - 格式校验
   - 持久化
4. 控制器返回文案改为与真实行为一致

### 为什么本轮不做邮件发送

因为当前系统中并不存在完整的邮件发送或验证链路。如果继续返回“已发送邮件”，那只是另一种公开契约失真。

本轮选择的是更严格也更可信的收敛方式：

1. 先把存储闭环做真
2. 后续如需邮件验证，再以独立设计补齐

## 三、设计原则总结

这两类修复都遵循了同一原则：

1. 公开配置必须真的影响行为
2. 公开接口必须真的做事
3. 如果暂时做不到，就不能伪装成已经支持

这是当前 OpenChat 从“代码能编译”走向“系统可信运行”的关键步骤。
