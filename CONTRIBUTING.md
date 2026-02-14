# Contributing to OpenChat

感谢您有兴趣为 OpenChat 做出贡献！本文档将帮助您了解如何参与项目开发。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)

## 行为准则

本项目采用贡献者公约作为行为准则。参与本项目即表示您同意遵守其条款。请阅读 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 了解详情。

## 如何贡献

### 报告 Bug

如果您发现了 bug，请通过 [GitHub Issues](https://github.com/Sdkwork-Cloud/openchat/issues) 提交报告。提交前请：

1. 搜索现有 issues，确认该问题尚未被报告
2. 使用 Bug 报告模板填写详细信息
3. 包含复现步骤、预期行为和实际行为

### 提出新功能

如果您有新功能的想法：

1. 先在 [Discussions](https://github.com/Sdkwork-Cloud/openchat/discussions) 中讨论您的想法
2. 确认功能符合项目定位
3. 提交 Feature Request issue

### 提交代码

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 开发流程

### 环境设置

```bash
# Fork 后克隆您的仓库
git clone https://github.com/your-username/openchat.git
cd openchat

# 添加上游仓库
git remote add upstream https://github.com/Sdkwork-Cloud/openchat.git

# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env

# 启动开发服务器
npm run start:dev
```

### 运行测试

```bash
# 单元测试
npm run test

# 测试覆盖率
npm run test:cov

# E2E 测试
npm run test:e2e

# 监视模式
npm run test:watch
```

### 代码检查

```bash
# 类型检查
npm run build

# 代码格式化
npm run format
```

### 数据库迁移

```bash
# 生成迁移文件
npm run migration:generate -- -n MigrationName

# 运行迁移
npm run migration:run

# 回滚迁移
npm run migration:revert
```

## 代码规范

### TypeScript 规范

- 使用 TypeScript 编写所有代码
- 避免使用 `any` 类型，使用具体类型或泛型
- 为公共 API 添加 JSDoc 注释
- 使用接口定义数据结构

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 类名 | PascalCase | `UserService` |
| 接口名 | PascalCase (I 前缀可选) | `IUser` 或 `User` |
| 函数名 | camelCase | `getUserById` |
| 变量名 | camelCase | `userName` |
| 常量名 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件名 | kebab-case | `user.service.ts` |

### 目录结构

```
src/
├── common/           # 公共模块
│   ├── base/         # 基础类
│   ├── config/       # 配置
│   ├── constants/    # 常量
│   ├── decorators/   # 装饰器
│   ├── dto/          # 公共DTO
│   ├── filters/      # 异常过滤器
│   ├── guards/       # 守卫
│   ├── interceptors/ # 拦截器
│   ├── interfaces/   # 公共接口
│   └── utils/        # 工具函数
├── modules/          # 业务模块
│   ├── user/         # 用户模块
│   ├── message/      # 消息模块
│   ├── group/        # 群组模块
│   └── ...
└── gateways/         # WebSocket 网关
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（不是新功能也不是修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |
| `ci` | CI/CD 相关 |

### 示例

```
feat(message): add message recall feature

- Add recall endpoint
- Add recall time limit validation
- Update message status on recall

Closes #123
```

## Pull Request 流程

### PR 检查清单

- [ ] 代码通过所有测试
- [ ] 代码通过 ESLint 检查
- [ ] 新功能有对应的测试用例
- [ ] 更新了相关文档
- [ ] 提交信息符合规范

### 审核流程

1. 提交 PR 后，CI 会自动运行测试
2. 至少需要一位维护者审核通过
3. 所有讨论解决后，维护者会合并 PR

### 合并策略

- 使用 Squash and Merge 保持提交历史整洁
- 合并后会自动生成 Changelog

## 许可证

通过贡献代码，您同意您的代码将根据项目的 AGPL-3.0 许可证进行授权。

## 联系方式

如有问题，请通过以下方式联系：

- GitHub Issues: [提交 Issue](https://github.com/Sdkwork-Cloud/openchat/issues)
- GitHub Discussions: [参与讨论](https://github.com/Sdkwork-Cloud/openchat/discussions)
- Email: contact@sdkwork.com

---

再次感谢您的贡献！🎉
