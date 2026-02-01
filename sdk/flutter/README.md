# OpenChat Flutter SDK

Flutter SDK for OpenChat instant messaging service.

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  openchat_sdk: ^1.0.0
```

## Usage

```dart
import 'package:openchat_sdk/openchat_sdk.dart';

// Initialize SDK
final openChat = OpenChat(
  config: OpenChatConfig(
    baseUrl: 'https://api.openchat.com',
    apiKey: 'your-api-key',
  ),
);

// Login
final authResponse = await openChat.auth.login(
  username: 'user@example.com',
  password: 'password',
);

// Listen to messages
openChat.messages.onMessageReceived.listen((message) {
  print('New message: ${message.content.text}');
});

// Send message
await openChat.messages.sendTextMessage(
  toUserId: 'user-id',
  text: 'Hello!',
);
```

## Features

- ✅ User authentication
- ✅ Real-time messaging
- ✅ Friend management
- ✅ Group chat
- ✅ File upload/download
- ✅ Push notifications
- ✅ Offline support

## Architecture

```
lib/
├── openchat_sdk.dart          # Main export
├── src/
│   ├── core/
│   │   ├── http_client.dart   # HTTP client
│   │   ├── websocket.dart     # WebSocket manager
│   │   └── event_bus.dart     # Event bus
│   ├── modules/
│   │   ├── auth.dart          # Auth module
│   │   ├── user.dart          # User module
│   │   ├── friend.dart        # Friend module
│   │   ├── message.dart       # Message module
│   │   ├── group.dart         # Group module
│   │   ├── conversation.dart  # Conversation module
│   │   └── contact.dart       # Contact module
│   ├── models/
│   │   ├── user.dart
│   │   ├── message.dart
│   │   ├── group.dart
│   │   └── conversation.dart
│   └── utils/
│       └── logger.dart
```
