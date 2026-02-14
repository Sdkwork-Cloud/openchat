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
      link: https://github.com/Sdkwork-Cloud/openchat

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

```bash [安装向导]
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.sh | bash

# Windows
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.bat" -OutFile "setup-wizard.bat"
.\setup-wizard.bat
```

```bash [Docker 部署]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 一键启动
docker compose up -d
```

```bash [本地开发]
# 安装依赖
npm install

# 配置环境
cp .env.example .env

# 启动开发服务
npm run start:dev
```

:::

## 技术栈

<div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin: 32px 0;">
  <img src="https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.9+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7+-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-24.0+-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/WukongIM-v2-orange?style=for-the-badge" alt="WukongIM" />
</div>

## 项目结构

```
openchat-server/
├── 📁 src/                 # 服务端源码
│   ├── 📁 common/         # 公共模块
│   ├── 📁 modules/        # 业务模块
│   └── 📁 gateways/       # WebSocket 网关
├── 📁 sdk/                 # SDK 目录
│   ├── typescript/        # TypeScript SDK
│   ├── android/           # Android SDK
│   ├── ios/               # iOS SDK
│   ├── flutter/           # Flutter SDK
│   ├── python/            # Python SDK
│   └── nodejs/            # Node.js SDK
├── 📁 app/                 # 应用目录
│   ├── openchat/          # 主应用
│   ├── openchat-admin/    # 管理后台
│   ├── openchat-react-mobile/  # 移动端
│   └── openchat-react-pc/ # PC 端
├── 📁 docs/                # 文档
├── 📁 database/            # 数据库脚本
├── 📁 scripts/             # 部署脚本
├── 📁 k8s/                 # Kubernetes 配置
└── 📁 xiaozhi-esp32/       # ESP32 IoT 固件
```

## 运维工具

```bash
# 系统预检查
./scripts/precheck.sh

# 安装测试验证
./scripts/install-test.sh quick

# 错误诊断
./scripts/diagnose.sh

# 自动修复
./scripts/auto-fix.sh --all

# 日志分析
./scripts/log-analyzer.sh analyze

# 健康监控
./scripts/health-check.sh --monitor
```

## 社区与支持

- 💬 [GitHub Discussions](https://github.com/Sdkwork-Cloud/openchat/discussions)
- 🐛 [Issue 报告](https://github.com/Sdkwork-Cloud/openchat/issues)
- 📧 邮箱: contact@sdkwork.com

## 许可证

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0)
