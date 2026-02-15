# Apps Overview

OpenChat provides multi-platform application examples to help developers get started quickly.

## Supported Platforms

| Platform | Tech Stack | Status | Description |
|----------|------------|--------|-------------|
| **Web** | React + TypeScript | ✅ Available | Browser access |
| **PC** | React + Electron | ✅ Available | Windows/macOS/Linux |
| **iOS** | React Native | ✅ Available | iPhone/iPad |
| **Android** | React Native | ✅ Available | Android phones/tablets |
| **Mini Program** | WeChat Mini Program | ✅ Available | WeChat ecosystem |

## App List

### React PC

Full-featured desktop chat application supporting Windows, macOS, and Linux.

- [React PC Documentation](./react-pc.md)
- Tech Stack: React 18 + TypeScript + Electron
- Features: Messaging, group management, audio/video calls

### React Native Mobile

Cross-platform mobile app, one codebase for both iOS and Android.

- [React Native Documentation](./react-native.md)
- Tech Stack: React Native + TypeScript
- Features: Push notifications, camera/gallery, local storage

### Mini Program

WeChat Mini Program version for quick integration with WeChat ecosystem.

- [Mini Program Documentation](./miniprogram.md)
- Tech Stack: WeChat Mini Program native development
- Features: WeChat login, sharing, payment

## Quick Start

### Start PC App

```bash
cd app/openchat-react-pc
pnpm install
pnpm dev
```

### Start Mobile App

```bash
cd app/openchat-react-native
pnpm install

# iOS
pnpm ios

# Android
pnpm android
```

## App Screenshots

### PC Interface

- Chat window
- Contact list
- Group management
- Settings panel

### Mobile Interface

- Message list
- Chat details
- Personal center
- Group info

## Related Links

- [SDK Documentation](../sdk/) - Integrate SDK
- [API Documentation](../api/) - Backend APIs
- [Deployment Guide](../deploy/) - Server deployment
