# OpenChat iOS SDK

iOS SDK for OpenChat instant messaging service.

## Requirements

- iOS 13.0+
- Swift 5.5+
- Xcode 14.0+

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/openchat/ios-sdk.git", from: "1.0.0")
]
```

### CocoaPods

```ruby
pod 'OpenChatSDK', '~> 1.0.0'
```

## Usage

```swift
import OpenChatSDK

// Initialize SDK
let openChat = OpenChat(config: OpenChatConfig(
    baseUrl: "https://api.openchat.com",
    apiKey: "your-api-key"
))

// Login
Task {
    do {
        let authResponse = try await openChat.auth.login(
            username: "user@example.com",
            password: "password"
        )
        print("Login success: \(authResponse.user.username)")
    } catch {
        print("Login failed: \(error)")
    }
}

// Listen to messages
openChat.messages.onMessageReceived = { message in
    print("New message: \(message.content.text ?? "")")
}

// Send message
Task {
    do {
        let message = try await openChat.messages.sendTextMessage(
            toUserId: "user-id",
            text: "Hello!"
        )
        print("Message sent: \(message.id)")
    } catch {
        print("Send failed: \(error)")
    }
}
```

## Features

- ✅ User authentication
- ✅ Real-time messaging
- ✅ Friend management
- ✅ Group chat
- ✅ File upload/download
- ✅ Push notifications
- ✅ Combine framework support
- ✅ Swift Concurrency (async/await)

## Architecture

```
OpenChatSDK/
├── Sources/
│   ├── OpenChatSDK.swift           # Main SDK class
│   ├── Core/
│   │   ├── HTTPClient.swift        # URLSession wrapper
│   │   ├── WebSocketManager.swift  # WebSocket handler
│   │   └── EventBus.swift          # Event bus
│   ├── Modules/
│   │   ├── AuthModule.swift
│   │   ├── UserModule.swift
│   │   ├── FriendModule.swift
│   │   ├── MessageModule.swift
│   │   ├── GroupModule.swift
│   │   ├── ConversationModule.swift
│   │   └── ContactModule.swift
│   ├── Models/
│   │   ├── User.swift
│   │   ├── Message.swift
│   │   ├── Group.swift
│   │   └── Conversation.swift
│   └── Utils/
│       └── Logger.swift
└── Tests/
    └── OpenChatSDKTests/
```
