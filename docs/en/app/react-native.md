# React Native App

OpenChat React Native app supports both iOS and Android platforms.

## Tech Stack

- React Native 0.72+
- TypeScript 5.0+
- React Navigation 6.x
- Zustand 4.x

## Quick Start

```bash
cd app/openchat-rn

# Install dependencies
pnpm install

# iOS
cd ios && pod install && cd ..
pnpm ios

# Android
pnpm android
```

## Features

- 💬 Instant Messaging
- 🔊 Audio/Video Calls
- 📎 File Transfer
- 🔔 Push Notifications

## Project Structure

```
app/openchat-rn/
├── src/
│   ├── components/     # Components
│   ├── screens/        # Screens
│   ├── navigation/     # Navigation
│   ├── hooks/          # Custom hooks
│   ├── stores/         # State management
│   └── services/       # API services
├── ios/                # iOS native
└── android/            # Android native
```

## Next Steps

- [React PC](./react-pc.md) - Desktop app
- [Mini Program](./miniprogram.md) - WeChat mini program
