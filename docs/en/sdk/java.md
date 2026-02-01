# Java SDK

## 安装

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

## 快速开始

```java
import io.openchat.sdk.OpenChatClient;

OpenChatClient client = new OpenChatClient.Builder()
    .serverUrl("http://localhost:3000")
    .imConfig(new ImConfig.Builder()
        .tcpAddr("localhost:5100")
        .wsUrl("ws://localhost:5200")
        .build())
    .build();

// 初始化
client.init();

// 登录
AuthResponse response = client.auth().login(
    new LoginRequest("username", "password")
);

// 发送消息
client.messages().send(new MessageRequest()
    .to("user2")
    .type(MessageType.TEXT)
    .content("Hello, OpenChat!")
);
```

## 更多示例

请参考 [GitHub 示例项目](https://github.com/openchat-team/sdk-java-examples)。
