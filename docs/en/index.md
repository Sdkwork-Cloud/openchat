---
layout: home

hero:
  name: "OpenChat"
  text: "Open Source IM Solution"
  tagline: All-in-one server, SDKs, and applications. Build your instant messaging app quickly.
  image:
    src: /logo.svg
    alt: OpenChat
  actions:
    - theme: brand
      text: Quick Start
      link: /en/guide/quickstart
    - theme: alt
      text: Overview
      link: /en/guide/overview
    - theme: alt
      text: GitHub
      link: https://github.com/openchat-team/openchat-server

features:
  - icon: 🚀
    title: One-Click Deploy
    details: Docker Compose one-click deployment with WuKongIM, PostgreSQL, Redis. Setup in 5 minutes.
  - icon: 📱
    title: Multi-Platform
    details: Web, PC, mobile SDKs. Support React, React Native, Mini Program and more.
  - icon: 🔊
    title: Real-time Audio/Video
    details: HD audio/video calls, screen sharing, interactive live streaming with Volcengine/Tencent RTC.
  - icon: 🤖
    title: AI Assistant
    details: Built-in AI Bot with GPT support. Smart customer service and Q&A capabilities.
  - icon: 🔌
    title: Third-party Integration
    details: Telegram, WhatsApp message sync. Unified management of multi-platform messages.
  - icon: 🛡️
    title: Secure & Reliable
    details: JWT auth, end-to-end encryption, message recall, self-destruct. Full security protection.
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

## Quick Start

::: code-group

```bash [Docker One-Click]
# Clone
git clone https://github.com/openchat-team/openchat-server.git
cd openchat-server

# Deploy
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

```bash [Local Development]
# Install
npm install

# Start dev server
npm run start:dev
```

```typescript [Client Integration]
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

## Tech Stack

<div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin: 32px 0;">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
</div>

## Project Structure

```
openchat-server/
├── 📁 src/                 # Server source code
├── 📁 sdk/                 # SDK directory
│   ├── typescript/        # TypeScript SDK
│   ├── java/              # Java SDK
│   ├── go/                # Go SDK
│   └── python/            # Python SDK
├── 📁 app/                 # Applications
│   ├── openchat-react-pc/ # React PC client
│   └── openchat-rn/       # React Native
├── 📁 docs/                # Documentation
├── 📁 database/            # Database scripts
├── 📁 scripts/             # Deployment scripts
└── 📁 k8s/                 # Kubernetes configs
```

## Community & Support

- 💬 [GitHub Discussions](https://github.com/openchat-team/openchat-server/discussions)
- 🐛 [Issue Report](https://github.com/openchat-team/openchat-server/issues)
- 📧 Email: support@openchat.dev

## License

[MIT](https://github.com/openchat-team/openchat-server/blob/main/LICENSE)
