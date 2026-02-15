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
      link: https://github.com/Sdkwork-Cloud/openchat

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

```bash [One-Click Install]
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# Windows
.\scripts\quick-install.bat
```

```bash [Docker Quick Start]
# Clone
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# One-click start
docker compose -f docker-compose.quick.yml up -d

# Or use npm script
pnpm run docker:quick
```

```bash [Local Development]
# Install
pnpm install

# Configure
cp .env.example .env

# Start dev server
pnpm run dev
```

:::

## Tech Stack

<div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin: 32px 0;">
  <img src="https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.9+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7+-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-24.0+-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/WukongIM-v2-orange?style=for-the-badge" alt="WukongIM" />
</div>

## Project Structure

```
openchat-server/
├── 📁 src/                 # Server source code
│   ├── 📁 common/         # Common modules
│   ├── 📁 modules/        # Business modules
│   └── 📁 gateways/       # WebSocket gateways
├── 📁 sdk/                 # SDK directory
│   ├── typescript/        # TypeScript SDK
│   ├── android/           # Android SDK
│   ├── ios/               # iOS SDK
│   ├── flutter/           # Flutter SDK
│   ├── python/            # Python SDK
│   └── nodejs/            # Node.js SDK
├── 📁 app/                 # Applications
│   ├── openchat/          # Main app
│   ├── openchat-admin/    # Admin panel
│   ├── openchat-react-mobile/  # Mobile
│   └── openchat-react-pc/ # PC client
├── 📁 docs/                # Documentation
├── 📁 database/            # Database scripts
├── 📁 scripts/             # Deployment scripts
├── 📁 k8s/                 # Kubernetes configs
└── 📁 xiaozhi-esp32/       # ESP32 IoT firmware
```

## Operations Tools

```bash
# Pre-installation check
pnpm run precheck

# Health check
pnpm run health

# Full diagnosis
pnpm run health:full

# View logs
pnpm run docker:logs

# Service management
pnpm run docker:up      # Start services
pnpm run docker:down    # Stop services
pnpm run docker:ps      # View status
```

## Community & Support

- 💬 [GitHub Discussions](https://github.com/Sdkwork-Cloud/openchat/discussions)
- 🐛 [Issue Report](https://github.com/Sdkwork-Cloud/openchat/issues)
- 📧 Email: contact@sdkwork.com

## License

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0)
