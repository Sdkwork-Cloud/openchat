# React PC 应用

OpenChat React PC 是一个基于 React、TypeScript 和 Tailwind CSS 构建的桌面聊天应用，采用：

- HTTP 业务接口：通过 `sdkwork-im-sdk` 调用服务端 `/im/v3/*`
- 实时长连接：通过 WuKongIM 处理消息接收、在线状态和实时同步
- 统一服务端：消息发送、会话、RTC 能力与 OpenAPI 文档统一由 OpenChat Server 暴露

## 功能概览

- 单聊、群聊、消息撤回、已读回执
- 图片、文件、语音等多媒体消息
- 基于 RTC 的音视频通话
- 全局搜索、通知提醒、主题切换
- 基于 OpenAPI 生成的 HTTP SDK + 独立 WuKongIM 适配层

## 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| React | UI 框架 | ^18.0 |
| TypeScript | 开发语言 | ^5.0 |
| Tailwind CSS | 样式框架 | ^3.0 |
| Zustand | 状态管理 | ^4.4 |
| React Query | 数据获取 | ^5.0 |
| React Router | 路由管理 | ^6.0 |
| WuKongIM SDK | 实时通信 | 项目内集成 |

## 项目结构

```text
app/openchat-react-pc/
|- src/
|  |- components/        # 聊天、联系人、群组、消息等 UI 组件
|  |- hooks/             # 自定义业务 Hooks
|  |- stores/            # 状态管理
|  |- services/          # HTTP / SDK 访问封装
|  |- utils/             # 工具函数
|  |- types/             # TypeScript 类型
|  |- App.tsx            # 应用入口
|- public/
|- package.json
```

## 快速开始

### 安装依赖

```bash
cd app/openchat-react-pc
pnpm install
```

### 配置环境变量

创建 `.env.local`：

```env
VITE_API_URL=http://localhost:3000
VITE_IM_TCP_ADDR=localhost:5100
VITE_IM_WS_URL=ws://localhost:5200
VITE_RTC_PROVIDER=volcengine
```

说明：

- `VITE_API_URL` 指向服务端基础地址，生成的 HTTP SDK 会自动访问 `/im/v3/*`
- 消息实时接收和长连接同步仍然由 WuKongIM 负责

### 启动开发环境

```bash
pnpm dev
```

默认访问：`http://localhost:5173`

### 构建生产版本

```bash
pnpm build
```

## 运行时接口入口

| 能力 | 地址 |
|------|------|
| 前端 API 文档 | `http://localhost:3000/im/v3/docs` |
| 前端 OpenAPI JSON | `http://localhost:3000/im/v3/openapi.json` |
| 管理端 API 文档 | `http://localhost:3000/admin/im/v3/docs` |
| 管理端 OpenAPI JSON | `http://localhost:3000/admin/im/v3/openapi.json` |
| WuKongIM WebSocket | `ws://localhost:5200` |
| WuKongIM TCP | `localhost:5100` |

## 本地代理示例

如果你希望在前端开发环境中代理 HTTP 接口，可在 `vite.config.ts` 中配置：

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/im/v3': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

## 接入原则

- 不要手写覆盖生成器产物，生成代码只写入 `generated/server-openapi`
- WuKongIM 适配逻辑应保持在独立实时层
- 前端应用只消费前端 schema，不接入 `/admin/im/v3/*`

## 相关文档

- [中文 API 文档](/zh/api/)
- [前端 API 总览](/zh/api/index.md)
- [SDK OpenAPI 标准](../im-openapi-sdk-standard.md)
