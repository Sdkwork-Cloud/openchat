# 应用概览

OpenChat 提供多平台应用示例，帮助开发者快速上手。

## 支持的平台

| 平台 | 技术栈 | 状态 | 说明 |
|------|--------|------|------|
| **Web** | React + TypeScript | ✅ 已支持 | 浏览器访问 |
| **PC** | React + Electron | ✅ 已支持 | Windows/macOS/Linux |
| **iOS** | React Native | ✅ 已支持 | iPhone/iPad |
| **Android** | React Native | ✅ 已支持 | Android 手机/平板 |
| **小程序** | 微信小程序 | ✅ 已支持 | 微信内使用 |

## 应用列表

### React PC 端

功能完整的桌面聊天应用，支持 Windows、macOS、Linux。

- [React PC 端文档](./react-pc.md)
- 技术栈：React 18 + TypeScript + Electron
- 特性：消息收发、群组管理、音视频通话

### React Native 移动端

跨平台移动应用，一套代码同时支持 iOS 和 Android。

- [React Native 文档](./react-native.md)
- 技术栈：React Native + TypeScript
- 特性：推送通知、相机相册、本地存储

### 小程序

微信小程序版本，快速接入微信生态。

- [小程序文档](./miniprogram.md)
- 技术栈：微信小程序原生开发
- 特性：微信登录、分享、支付

## 快速开始

### 启动 PC 端

```bash
cd app/openchat-react-pc
pnpm install
pnpm dev
```

### 启动移动端

```bash
cd app/openchat-react-native
pnpm install

# iOS
pnpm ios

# Android
pnpm android
```

## 应用截图

### PC 端界面

- 聊天窗口
- 联系人列表
- 群组管理
- 设置面板

### 移动端界面

- 消息列表
- 聊天详情
- 个人中心
- 群组信息

## 相关链接

- [SDK 文档](../sdk/) - 集成 SDK
- [API 文档](../api/) - 后端接口
- [部署指南](../deploy/) - 服务端部署
