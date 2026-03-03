# OpenChat React PC - 项目上下文文档

## 项目概述

OpenChat React PC 是一个基于 **React 18+** 和 **TypeScript 5+** 构建的现代化桌面聊天应用，使用 **Vite 5+** 作为构建工具，**Tailwind CSS** 进行样式设计，支持 **Tauri** 桌面应用。

这是 OpenChat 项目的前端桌面应用部分，提供完整的即时通讯功能，包括实时消息、群组管理、音视频通话、AI 机器人集成等。

### 核心技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | 18.2+ | UI 框架 |
| 语言 | TypeScript | 5.2+ | 开发语言 |
| 构建工具 | Vite | 5.0+ | 构建/开发服务器 |
| 样式 | Tailwind CSS | 3.3+ | 原子化 CSS 框架 |
| 桌面框架 | Tauri | 1.5+ | 桌面应用打包 |
| 路由 | React Router | 6.20+ | 客户端路由 |
| 状态管理 | Zustand | 4.5+ | 轻量级状态管理 |
| 数据获取 | React Query | 5.90+ | 数据获取和缓存 |
| 富文本 | TipTap | 3.18+ | 富文本编辑器 |
| WebSocket | Socket.IO | 4.x | 实时通信 |
| 测试 | Vitest | 4.0+ | 单元测试框架 |

### 主要功能模块

- **认证模块** (`auth`) - 用户登录、注册
- **即时通讯模块** (`im`) - 消息发送、接收、会话管理
- **联系人模块** (`contacts`) - 好友管理、群组管理
- **RTC 模块** (`rtc`) - 实时音视频通话
- **AI Agent 模块** (`agent`) - AI 机器人集成
- **终端模块** (`terminal`) - 终端模拟功能
- **设置模块** (`settings`) - 应用设置
- **发现模块** (`discover`) - 发现页面
- **搜索模块** (`search`) - 全局搜索
- **通知模块** (`notification`) - 消息通知
- **钱包模块** (`wallet`) - 支付功能
- **云盘模块** (`drive`) - 文件存储
- **设备模块** (`device`) - 设备管理
- **工具模块** (`tools`) - 工具集合

## 项目结构

```
openchat-react-pc/
├── src/                        # 源代码目录
│   ├── app/                    # 应用核心
│   │   ├── App.tsx             # 应用根组件
│   │   ├── AppProvider.tsx     # 应用提供者
│   │   ├── QueryProvider.tsx   # 数据查询提供者
│   │   └── env.ts              # 环境配置
│   ├── components/             # 通用组件
│   │   ├── ui/                 # UI 基础组件
│   │   ├── desktop/            # 桌面端组件
│   │   ├── a11y/               # 无障碍组件
│   │   └── AsyncComponent/     # 异步组件
│   ├── contexts/               # React Context
│   ├── core/                   # 核心模块
│   ├── di/                     # 依赖注入系统
│   ├── entities/               # 实体定义
│   ├── hooks/                  # 自定义 Hooks
│   ├── i18n/                   # 国际化
│   ├── layouts/                # 布局组件
│   ├── lib/                    # 第三方库封装
│   ├── microfrontends/         # 微前端架构
│   ├── modules/                # 业务模块
│   │   ├── agent/              # AI Agent
│   │   ├── auth/               # 认证
│   │   ├── commerce/           # 电商
│   │   ├── contacts/           # 联系人
│   │   ├── creation/           # 创作
│   │   ├── device/             # 设备
│   │   ├── discover/           # 发现
│   │   ├── drive/              # 云盘
│   │   ├── im/                 # 即时通讯
│   │   ├── notification/       # 通知
│   │   ├── rtc/                # 实时音视频
│   │   ├── search/             # 搜索
│   │   ├── settings/           # 设置
│   │   ├── social/             # 社交
│   │   ├── terminal/           # 终端
│   │   ├── tools/              # 工具
│   │   ├── video/              # 视频
│   │   └── wallet/             # 钱包
│   ├── pages/                  # 页面组件
│   ├── platform/               # 平台抽象接口
│   ├── platform-impl/          # 平台实现
│   │   ├── web/                # Web 平台实现
│   │   └── desktop/            # 桌面平台实现
│   ├── plugins/                # 插件系统
│   ├── router/                 # 路由配置
│   ├── services/               # 服务层
│   │   ├── api.client.ts       # API 客户端
│   │   ├── websocket.client.ts # WebSocket 客户端
│   │   ├── error.service.ts    # 错误服务
│   │   ├── security.service.ts # 安全服务
│   │   ├── cache.service.ts    # 缓存服务
│   │   └── ...                 # 其他服务
│   ├── store/                  # 状态管理 (Zustand)
│   ├── tests/                  # 测试工具
│   ├── tools/                  # 开发工具
│   ├── types/                  # TypeScript 类型定义
│   ├── utils/                  # 工具函数
│   ├── workers/                # Web Worker
│   ├── index.css               # 全局样式
│   ├── main.tsx                # 应用入口
│   └── vite-env.d.ts           # Vite 类型声明
├── src-tauri/                  # Tauri 配置
│   ├── src/                    # Tauri 后端代码 (Rust)
│   ├── icons/                  # 应用图标
│   ├── tauri.conf.json         # Tauri 配置
│   ├── Cargo.toml              # Rust 依赖
│   └── build.rs                # 构建脚本
├── public/                     # 静态资源
├── tests/                      # 测试文件
│   └── setup.ts                # 测试环境初始化
├── wasm/                       # WebAssembly 模块
├── docs/                       # 文档
│   ├── di.md                   # 依赖注入文档
│   └── services.md             # 服务文档
├── .env                        # 环境变量
├── .env.development            # 开发环境配置
├── .env.test                   # 测试环境配置
├── .env.production             # 生产环境配置
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript 配置
├── vite.config.ts              # Vite 配置
├── vitest.config.ts            # Vitest 测试配置
├── tailwind.config.js          # Tailwind CSS 配置
├── postcss.config.js           # PostCSS 配置
└── ARCHITECT.md                # 技术架构文档
```

## 构建与运行

### 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| pnpm | 8+ | 包管理器 (推荐) |
| npm | 9+ | 包管理器 (备选) |

### 安装依赖

```bash
pnpm install
# 或
npm install
```

### 开发模式

```bash
# 启动开发服务器 (默认使用 development 模式)
pnpm run dev

# 指定环境启动
pnpm run dev:test      # 测试环境
pnpm run dev:prod      # 生产环境

# 启动桌面应用开发模式
pnpm run dev:desktop
```

### 构建

```bash
# 构建生产版本 (默认)
pnpm run build

# 指定环境构建
pnpm run build:dev     # 开发环境
pnpm run build:test    # 测试环境
pnpm run build:prod    # 生产环境

# 构建桌面应用
pnpm run build:desktop
```

### 预览构建产物

```bash
# 预览生产构建
pnpm run preview

# 预览测试构建
pnpm run preview:test

# 预览生产构建
pnpm run preview:prod
```

### 测试

```bash
# 运行测试
pnpm run test

# 监视模式运行测试
pnpm run test:watch

# 生成测试覆盖率报告
pnpm run test:coverage
```

### 代码质量

```bash
# ESLint 检查
pnpm run lint

# Prettier 格式化
pnpm run format
```

## 配置说明

### 环境变量

项目支持多环境配置，通过 `.env.*` 文件管理：

| 文件 | 环境 | 用途 |
|------|------|------|
| `.env.development` | 开发环境 | 本地开发使用 |
| `.env.test` | 测试环境 | 测试/预发布环境 |
| `.env.production` | 生产环境 | 线上生产环境 |

### 关键环境变量

```bash
# 应用信息
VITE_APP_NAME=OpenChat
VITE_APP_VERSION=1.0.0
VITE_DEBUG=true
VITE_LOG_LEVEL=debug

# 服务端点
VITE_API_BASE_URL=http://localhost:3000
VITE_IM_WS_URL=ws://localhost:5200

# RTC 配置
VITE_RTC_APP_ID=your-app-id
VITE_RTC_PROVIDER=volcengine
```

### 在代码中使用环境变量

```typescript
import {
  API_BASE_URL,
  IM_WS_URL,
  APP_VERSION,
  IS_DEV,
  IS_PROD,
  DEBUG
} from '@/app/env';

// 使用环境变量
console.log('API 地址:', API_BASE_URL);
console.log('IM 地址:', IM_WS_URL);
console.log('版本:', APP_VERSION);
console.log('是否开发环境:', IS_DEV);
```

## 核心服务

### 依赖注入系统

项目实现了完整的依赖注入系统，位于 `src/di/` 目录：

```typescript
import { container } from '@/di';

// 解析服务
const apiClient = container.resolve('apiClient');
const websocketClient = container.resolve('websocketClient');

// 注册服务
container.register('myService', () => new MyService());

// 注册单例
container.registerSingleton('cacheService', () => new CacheService());
```

### API 客户端

统一的 HTTP API 客户端，位于 `src/services/api.client.ts`：

```typescript
import { apiClient } from '@/services/api.client';

// GET 请求
const users = await apiClient.get('/users');

// POST 请求
const user = await apiClient.post('/users', { name: 'John' });

// PUT 请求
await apiClient.put('/users/1', { name: 'Jane' });

// DELETE 请求
await apiClient.delete('/users/1');
```

### WebSocket 客户端

实时通信客户端，位于 `src/services/websocket.client.ts`：

```typescript
import { websocketClient } from '@/services/websocket.client';

// 连接
websocketClient.connect();

// 发送消息
websocketClient.send('message', { text: 'Hello' });

// 监听事件
websocketClient.on('message', (data) => {
  console.log('收到消息:', data);
});

// 断开连接
websocketClient.disconnect();
```

### 错误服务

全局错误处理服务，位于 `src/services/error.service.ts`：

```typescript
import { errorService } from '@/services/error.service';

// 捕获错误
try {
  // ...
} catch (error) {
  errorService.handleError(error);
}

// 监听错误
errorService.onError((error) => {
  console.error('全局错误:', error);
});
```

### 安全服务

安全相关服务，位于 `src/services/security.service.ts`：

```typescript
import { securityService } from '@/services/security.service';

// 验证输入
const isValid = securityService.validateInput(input);

// XSS 防护
const safeHtml = securityService.sanitizeHtml(dirtyHtml);

// 安全扫描
const result = await securityService.scanSecurityVulnerabilities();
```

### 缓存服务

高级缓存服务，位于 `src/services/cache.service.ts`：

```typescript
import { cacheService } from '@/services/cache.service';

// 设置缓存
await cacheService.set('key', value, { ttl: 3600 });

// 获取缓存
const value = await cacheService.get('key');

// 删除缓存
await cacheService.delete('key');

// 清空缓存
await cacheService.clear();
```

### 性能服务

性能监控服务，位于 `src/services/performance.service.ts`：

```typescript
import { performanceService } from '@/services/performance.service';

// 开始性能分析
performanceService.startProfile('operation');

// 结束性能分析
performanceService.endProfile('operation');

// 获取性能指标
const metrics = performanceService.getMetrics();
```

### 功能开关服务

功能开关管理，位于 `src/services/feature.service.ts`：

```typescript
import { featureService } from '@/services/feature.service';

// 检查功能是否启用
if (featureService.isEnabled('new-feature')) {
  // 使用新功能
}

// 获取所有功能状态
const features = featureService.getAllFeatures();
```

## 平台抽象

项目实现了平台抽象层，支持 Web 和桌面平台：

### 平台接口

```typescript
// src/platform/index.ts
import { platform } from '@/platform';

// 获取当前平台
const currentPlatform = platform.getPlatform(); // 'web' | 'desktop'

// 获取设备 ID
const deviceId = await platform.getDeviceId();

// 本地存储
await platform.setStorage('key', 'value');
const value = await platform.getStorage('key');

// 剪贴板
await platform.copy('text');
const text = await platform.readClipboard();

// 打开外部链接
await platform.openExternal('https://example.com');

// 文件操作
const files = await platform.selectFile();
await platform.writeFile('path', 'content');
const content = await platform.readFile('path');

// 窗口控制 (仅桌面端)
await platform.minimizeWindow();
await platform.maximizeWindow();
await platform.closeWindow();

// 通知
await platform.showNotification({ title: 'Title', body: 'Body' });

// 网络状态
const isOnline = platform.isOnline();
platform.onNetworkChange((online) => {
  console.log('网络状态变化:', online);
});
```

### 平台实现

- **Web 平台**: `src/platform-impl/web/` - 使用浏览器 API 实现
- **桌面平台**: `src/platform-impl/desktop/` - 使用 Tauri API 实现

## 状态管理

使用 Zustand 进行状态管理：

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  immer((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    login: (user, token) => set((state) => {
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
    }),
    logout: () => set((state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    }),
  }))
);
```

## 数据获取

使用 React Query 进行数据获取：

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { userApi } from '@/services/user.api';

// 查询
function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getUser(userId),
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}

// 变更
function useUpdateUser() {
  return useMutation({
    mutationFn: (data) => userApi.updateUser(data),
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries(['user']);
    },
  });
}
```

## 路由配置

使用 React Router 进行路由管理：

```typescript
// src/router/routes.ts
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: 'messages', element: <MessagesPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'agent', element: <AgentPage /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
];
```

## 测试实践

### 测试文件命名

- 单元测试：`*.test.ts` 或 `*.test.tsx`
- 集成测试：`*.spec.ts` 或 `*.spec.tsx`

### 测试示例

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('渲染按钮文本', () => {
    render(<Button>点击我</Button>);
    expect(screen.getByText('点击我')).toBeInTheDocument();
  });

  it('处理点击事件', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>点击</Button>);
    fireEvent.click(screen.getByText('点击'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 测试工具

- `@testing-library/react`: React 组件测试
- `@testing-library/user-event`: 用户交互模拟
- `vitest`: 测试运行器
- `jsdom`: 浏览器环境模拟

## 开发规范

### 目录命名

- 使用小写字母
- 多单词使用连字符分隔 (kebab-case)
- 示例：`user-service`, `auth-module`

### 文件命名

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `LoginPage.tsx`, `UserProfile.tsx` |
| 服务 | camelCase | `auth.service.ts`, `user.api.ts` |
| Hooks | use 前缀 + camelCase | `useAuth.ts`, `useMessages.ts` |
| 类型 | PascalCase | `user.entity.ts`, `auth.types.ts` |
| 工具 | camelCase | `uuid.ts`, `format.ts` |

### 代码风格

- 使用 2 个空格缩进
- 使用分号
- 使用单引号
- 每行不超过 100 个字符
- 使用 `const/let`，避免使用 `var`
- 优先使用箭头函数

### 提交规范

遵循 Conventional Commits：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具配置
- `perf:` 性能优化

## 插件系统

项目支持插件系统，允许通过插件扩展功能：

```typescript
import { pluginManager } from '@/di';

// 监听插件事件
pluginManager.on('plugin:loaded', (plugin) => {
  console.log('插件加载:', plugin.metadata.name);
});

pluginManager.on('plugin:activated', (plugin) => {
  console.log('插件激活:', plugin.metadata.name);
});

// 插件支持热插拔
// 无需重启即可加载/卸载插件
```

## 性能优化

### 代码分割

Vite 配置中已设置代码分割：

```typescript
// vite.config.ts
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-state': ['zustand', 'immer', '@tanstack/react-query'],
  'vendor-ui': ['@tiptap/react', '@tiptap/starter-kit'],
  'vendor-markdown': ['react-markdown', 'remark-gfm'],
  'vendor-syntax': ['react-syntax-highlighter', 'highlight.js'],
  'vendor-i18n': ['react-i18next', 'i18next'],
  'vendor-utils': ['lodash-es', 'date-fns', 'clsx', 'tailwind-merge'],
}
```

### 虚拟列表

使用 `@tanstack/react-virtual` 进行长列表优化：

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <Message key={virtualRow.key} message={messages[virtualRow.index]} />
        ))}
      </div>
    </div>
  );
}
```

### 构建优化

- **Brotli 压缩**: 生产构建自动压缩
- **Tree Shaking**: 自动移除未使用代码
- ** Terser 压缩**: JavaScript 压缩和混淆
- **CSS 代码分割**: CSS 按需加载

## 安全措施

- **输入验证**: 所有用户输入经过验证
- **XSS 防护**: React 自动转义 + DOMPurify
- **CSRF 防护**: Token 验证
- **CSP 配置**: 内容安全策略
- **依赖安全**: 定期更新依赖

## 国际化

使用 `i18next` 实现多语言支持：

```typescript
import { useTranslation } from 'react-i18next';

function Welcome() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <button onClick={() => i18n.changeLanguage('en')}>English</button>
      <button onClick={() => i18n.changeLanguage('zh')}>中文</button>
    </div>
  );
}
```

## 常见问题

### 开发服务器无法启动

1. 检查端口 5173 是否被占用
2. 运行 `pnpm install` 重新安装依赖
3. 清除 `node_modules` 和锁文件后重新安装

### Tauri 构建失败

1. 确保已安装 Rust 环境
2. 检查 `src-tauri/Cargo.toml` 依赖
3. 运行 `pnpm tauri info` 检查环境

### WebSocket 连接失败

1. 检查 `VITE_IM_WS_URL` 配置
2. 确认后端服务已启动
3. 检查 CORS 配置

### 测试失败

1. 运行 `pnpm test:coverage` 查看详细报告
2. 检查 `tests/setup.ts` 中的 Mock 配置
3. 确保测试文件命名正确 (`*.test.ts` 或 `*.test.tsx`)

## 相关文档

- [ARCHITECT.md](ARCHITECT.md) - 技术架构标准文档
- [README.md](README.md) - 项目主文档
- [docs/di.md](docs/di.md) - 依赖注入文档
- [docs/services.md](docs/services.md) - 服务文档

## API 路由前缀

HTTP API 基础路径由 `VITE_API_BASE_URL` 环境变量配置，默认为 `http://localhost:3000`。

## 注意事项

1. **环境变量**: 所有客户端环境变量必须以 `VITE_` 开头
2. **敏感信息**: 不要将敏感信息放在环境变量中，它们会被打包到客户端
3. **本地覆盖**: 可以创建 `.env.local` 文件覆盖本地配置，该文件不会被提交
4. **Tauri 权限**: Tauri 的权限配置在 `src-tauri/tauri.conf.json` 中
5. **构建输出**: 构建产物输出到 `dist/` 目录
