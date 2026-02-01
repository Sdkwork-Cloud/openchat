# OpenChat Android SDK

Android SDK for OpenChat instant messaging service.

## Requirements

- Android API 21+ (Android 5.0)
- Kotlin 1.8+
- Java 8+

## Installation

### Gradle

Add to your `build.gradle`:

```groovy
dependencies {
    implementation 'com.openchat:sdk:1.0.0'
}
```

## Usage

```kotlin
import com.openchat.sdk.OpenChat
import com.openchat.sdk.config.OpenChatConfig
import kotlinx.coroutines.launch

// Initialize SDK
val openChat = OpenChat(
    context = applicationContext,
    config = OpenChatConfig(
        baseUrl = "https://api.openchat.com",
        apiKey = "your-api-key"
    )
)

// Login
lifecycleScope.launch {
    try {
        val authResponse = openChat.auth.login(
            username = "user@example.com",
            password = "password"
        )
        println("Login success: ${authResponse.user.username}")
    } catch (e: Exception) {
        println("Login failed: ${e.message}")
    }
}

// Listen to messages
openChat.messages.onMessageReceived { message ->
    println("New message: ${message.content.text}")
}

// Send message
lifecycleScope.launch {
    try {
        val message = openChat.messages.sendTextMessage(
            toUserId = "user-id",
            text = "Hello!"
        )
        println("Message sent: ${message.id}")
    } catch (e: Exception) {
        println("Send failed: ${e.message}")
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
- ✅ Kotlin Coroutines
- ✅ Flow API

## Architecture

```
openchat-sdk/
├── src/
│   ├── main/
│   │   ├── java/com/openchat/sdk/
│   │   │   ├── OpenChat.kt              # Main SDK class
│   │   │   ├── core/
│   │   │   │   ├── HttpClient.kt        # OkHttp wrapper
│   │   │   │   ├── WebSocketManager.kt  # WebSocket handler
│   │   │   │   └── EventBus.kt          # Event bus
│   │   │   ├── modules/
│   │   │   │   ├── AuthModule.kt
│   │   │   │   ├── UserModule.kt
│   │   │   │   ├── FriendModule.kt
│   │   │   │   ├── MessageModule.kt
│   │   │   │   ├── GroupModule.kt
│   │   │   │   ├── ConversationModule.kt
│   │   │   │   └── ContactModule.kt
│   │   │   ├── models/
│   │   │   │   ├── User.kt
│   │   │   │   ├── Message.kt
│   │   │   │   ├── Group.kt
│   │   │   │   └── Conversation.kt
│   │   │   └── utils/
│   │   │       └── Logger.kt
│   │   └── AndroidManifest.xml
│   └── test/
│       └── java/com/openchat/sdk/
└── build.gradle
```
