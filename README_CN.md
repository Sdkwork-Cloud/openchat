<div align="center">

<img src="./docs/assets/logo.png" width="150" alt="OpenChat Logo">

# OpenChat

**开源即时通讯解决方案 - 服务端、SDK、应用一体化**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-24.0+-2496ED.svg?logo=docker)](https://www.docker.com/)
[![悟空IM](https://img.shields.io/badge/悟空IM-v2-orange.svg)](https://githubim.com/)

[English](README.md) | [中文](README_CN.md)

</div>

---

## 🚀 快速开始

### 一键部署（推荐）

```bash
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 一键部署
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

访问 http://localhost:5172 即可体验。

### Docker Compose 部署

```bash
docker compose up -d
```

## ✨ 功能特性

### 💬 即时通讯
- 单聊、群聊、消息撤回、已读回执
- 支持文本、图片、语音、视频、文件等多种消息类型
- 消息搜索、历史消息、离线消息推送

### 🔊 实时音视频
- 高清音视频通话
- 群组通话（最多 50 人）
- 屏幕共享、互动直播

### 🤖 AI 助手
- 内置 GPT 等大模型支持
- 智能客服、智能问答
- AI Bot 自定义

### 🔌 第三方集成
- Telegram、WhatsApp 消息同步
- Webhook 支持
- 丰富的 API 接口

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                             │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Web App    │  PC Client   │  Mobile App  │  Mini Program  │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       └──────────────┴──────────────┴────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                      服务层 (NestJS)                          │
│  ┌──────────┬──────────┬──────────┬──────────┬─────────────┐  │
│  │   Auth   │   User   │ Message  │  Group   │    RTC      │  │
│  └──────────┴──────────┴──────────┴──────────┴─────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                      消息层 (悟空IM)                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                       数据层                                 │
│  ┌──────────────┬──────────────┬──────────────┬───────────┐  │
│  │  PostgreSQL  │    Redis     │    MinIO     │  ES       │  │
│  └──────────────┴──────────────┴──────────────┴───────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## 🛠️ 技术栈

### 后端
- **框架**: [NestJS](https://nestjs.com/) 10.x
- **语言**: [TypeScript](https://www.typescriptlang.org/) 5.x
- **ORM**: [TypeORM](https://typeorm.io/) 0.3.x
- **数据库**: [PostgreSQL](https://www.postgresql.org/) 15+
- **缓存**: [Redis](https://redis.io/) 7+
- **IM 服务**: [悟空IM](https://githubim.com/) v2

### 前端
- **框架**: [React](https://react.dev/) 18.x
- **语言**: [TypeScript](https://www.typescriptlang.org/) 5.x
- **样式**: [Tailwind CSS](https://tailwindcss.com/) 3.x
- **状态**: [Zustand](https://github.com/pmndrs/zustand) 4.x

## 📦 项目结构

```
openchat/
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
│   └── 📁 assets/           # 图片资源
│       ├── logo.svg       # 项目 logo
│       ├── screenshots/   # 界面截图
│       └── wechat-qr.png  # 微信公众号二维码
├── 📁 database/            # 数据库脚本
├── 📁 scripts/             # 部署脚本
├── 📁 k8s/                 # Kubernetes 配置
├── docker-compose.yml      # Docker 编排
└── README.md               # 本文件
```

## 📖 文档

- [📚 完整文档](https://docs.openchat.dev)
- [🚀 快速开始](https://docs.openchat.dev/guide/quickstart)
- [🏗️ 架构设计](https://docs.openchat.dev/guide/architecture)
- [🔌 API 文档](https://docs.openchat.dev/api/)
- [📦 SDK 文档](https://docs.openchat.dev/sdk/)

## 🌐 SDK

| 语言 | 包名 | 版本 | 文档 |
|------|------|------|------|
| TypeScript | `@openchat/sdk` | [![npm](https://img.shields.io/npm/v/@openchat/sdk)](https://www.npmjs.com/package/@openchat/sdk) | [文档](https://docs.openchat.dev/sdk/typescript) |
| Java | `io.openchat:sdk` | [![Maven](https://img.shields.io/maven-central/v/io.openchat/sdk)](https://mvnrepository.com/artifact/io.openchat/sdk) | [文档](https://docs.openchat.dev/sdk/java) |
| Go | `github.com/openchat-team/sdk-go` | [![Go](https://img.shields.io/github/go-mod/go-version/openchat-team/sdk-go)](https://pkg.go.dev/github.com/openchat-team/sdk-go) | [文档](https://docs.openchat.dev/sdk/go) |
| Python | `openchat-sdk` | [![PyPI](https://img.shields.io/pypi/v/openchat-sdk)](https://pypi.org/project/openchat-sdk/) | [文档](https://docs.openchat.dev/sdk/python) |

## 🚀 部署

### Docker Compose（推荐）

```bash
docker compose up -d
```

### Kubernetes

```bash
kubectl apply -k k8s/overlays/production
```

### 传统部署

```bash
npm install
npm run build
npm start
```

## 🧪 开发

```bash
# 安装依赖
npm install

# 启动开发服务
npm run start:dev

# 运行测试
npm run test

# 构建
npm run build
```

## 🤝 贡献

我们欢迎所有形式的贡献！

- [📖 贡献指南](CONTRIBUTING.md)
- [🐛 提交 Issue](https://github.com/Sdkwork-Cloud/openchat/issues)
- [💡 功能建议](https://github.com/Sdkwork-Cloud/openchat/discussions)

## 📄 许可证

OpenChat 是开源软件，使用 [MIT 许可证](LICENSE)。

## 💬 社区

- [GitHub Discussions](https://github.com/Sdkwork-Cloud/openchat/discussions)
- [Discord](https://discord.gg/openchat)
- [X](https://x.com/openchat_cloud)
- [微信公众号](#) - 扫描下方二维码
- [邮箱](mailto:contact@sdkwork.com)

<div align="center">
  <img src="./docs/assets/wechat-mp-qr.jpg" width="200" alt="微信公众号二维码">
  <p>OpenChat 官方公众号</p>
</div>

## 📷 截图

<div align="center">

### Web 界面
<img src="./docs/assets/screenshots/web-chat.png" width="300" alt="Web 聊天界面">
<img src="./docs/assets/screenshots/web-group.png" width="300" alt="Web 群组界面">

### 移动界面
<img src="./docs/assets/screenshots/mobile-chat.png" width="200" alt="移动聊天界面">
<img src="./docs/assets/screenshots/mobile-profile.png" width="200" alt="移动个人资料界面">

### 视频通话
<img src="./docs/assets/screenshots/video-call.png" width="300" alt="视频通话界面">

</div>

---

<div align="center">

**如果这个项目对你有帮助，请给我们一个 ⭐️ Star！**

</div>
