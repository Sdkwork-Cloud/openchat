---
layout: home

hero:
  name: "OpenChat"
  text: "开源即时通讯解决方案"
  tagline: 服务端、SDK、应用一体化，开箱即用，快速构建您的即时通讯应用
  image:
    src: /logo.svg
    alt: OpenChat
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quickstart
    - theme: alt
      text: 项目概览
      link: /guide/overview
    - theme: alt
      text: GitHub
      link: https://github.com/openchat-team/openchat-server

features:
  - icon: 🚀
    title: 一键部署
    details: Docker Compose 一键部署，集成悟空IM、PostgreSQL、Redis，5分钟搭建完整即时通讯服务
  - icon: 📱
    title: 多端支持
    details: 提供 Web、PC、移动端 SDK，支持 React、React Native、小程序等多平台应用开发
  - icon: 🔊
    title: 实时音视频
    details: 集成火山引擎、腾讯云RTC，支持高清音视频通话、屏幕共享、互动直播
  - icon: 🤖
    title: AI 助手
    details: 内置 AI Bot 系统，支持 GPT 等大模型，提供智能客服、智能问答能力
  - icon: 🔌
    title: 第三方集成
    details: 支持 Telegram、WhatsApp 等第三方平台消息同步，统一管理多平台消息
  - icon: 🛡️
    title: 安全可靠
    details: JWT 认证、端到端加密、消息撤回、阅后即焚，全方位保障通讯安全
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #bd34fe 50%, #47caff 50%);
  --vp-home-hero-image-filter: blur(44px);
}

.VPFeature {
  border-radius: 12px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  transition: all 0.3s ease;
}

.VPFeature:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}
</style>

## 快速开始

::: code-group

```bash [Docker 一键部署]
# 克隆项目
git clone https://github.com/openchat-team/openchat-server.git
cd openchat-server

# 一键部署
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

```bash [本地开发]
# 安装依赖
npm install

# 启动开发服务
npm run start:dev
```

```typescript [客户端接入]
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000',
  imConfig: {
    tcpAddr: 'localhost:5100',
    wsUrl: 'ws://localhost:5200'
  }
});

await client.init();
```

:::

## 技术栈

<div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin: 32px 0;">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
</div>

## 项目结构

```
openchat-server/
├── 📁 src/                 # 服务端源码
├── 📁 sdk/                 # SDK 目录
│   ├── typescript/        # TypeScript SDK
│   ├── java/              # Java SDK
│   ├── go/                # Go SDK
│   └── python/            # Python SDK
├── 📁 app/                 # 应用目录
│   ├── openchat-react-pc/ # React PC 端
│   └── openchat-rn/       # React Native
├── 📁 docs/                # 文档
├── 📁 database/            # 数据库脚本
├── 📁 scripts/             # 部署脚本
└── 📁 k8s/                 # Kubernetes 配置
```

## 社区与支持

- 💬 [GitHub Discussions](https://github.com/openchat-team/openchat-server/discussions)
- 🐛 [Issue 报告](https://github.com/openchat-team/openchat-server/issues)
- 📧 邮箱: support@openchat.dev

## 许可证

[MIT](https://github.com/openchat-team/openchat-server/blob/main/LICENSE)
