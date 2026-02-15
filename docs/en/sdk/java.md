# Java SDK

## Installation

### Maven

```xml
<dependency>
    <groupId>io.openchat</groupId>
    <artifactId>sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'io.openchat:sdk:1.0.0'
```

## Quick Start

```java
import io.openchat.sdk.OpenChatClient;

OpenChatClient client = new OpenChatClient.Builder()
    .serverUrl("http://localhost:3000")
    .imConfig(new ImConfig.Builder()
        .tcpAddr("localhost:5100")
        .wsUrl("ws://localhost:5200")
        .build())
    .build();

// Initialize
client.init();

// Login
AuthResponse response = client.auth().login(
    new LoginRequest("username", "password")
);

// Send message
client.messages().send(new MessageRequest()
    .to("user2")
    .type(MessageType.TEXT)
    .content("Hello, OpenChat!")
);
```

## More Examples

See [GitHub Examples](https://github.com/openchat-team/sdk-java-examples).

## Next Steps

- [TypeScript SDK](./typescript.md) - TypeScript SDK
- [API Documentation](../api/) - Complete API reference
