# OpenChat SDKs

Official SDKs for OpenChat instant messaging service.

## Available SDKs

| Platform | Package | Status | Description |
|----------|---------|--------|-------------|
| **TypeScript** | `@openchat/typescript-sdk` | ✅ Ready | Universal SDK for all Node.js frontend frameworks |
| **Flutter** | `openchat_sdk` | 🚧 Planned | Dart SDK for Flutter apps |
| **iOS** | `OpenChatSDK` | 🚧 Planned | Swift SDK for iOS apps |
| **Android** | `com.openchat:sdk` | 🚧 Planned | Kotlin SDK for Android apps |
| **Node.js** | `@openchat/nodejs-sdk` | 🚧 Planned | Server-side Node.js SDK |
| **Python** | `openchat-sdk` | 🚧 Planned | Python SDK for backend/AI bots |

## TypeScript SDK (Universal)

The TypeScript SDK is a universal SDK that supports all Node.js frontend frameworks:

### Supported Frameworks

| Framework | Import Path | Status |
|-----------|-------------|--------|
| **Vanilla JS** | `@openchat/typescript-sdk` | ✅ Ready |
| **React** | `@openchat/typescript-sdk/react` | ✅ Ready |
| **Vue 3** | `@openchat/typescript-sdk/vue` | ✅ Ready |
| **Angular** | `@openchat/typescript-sdk/angular` | 🚧 Planned |
| **Svelte** | `@openchat/typescript-sdk/svelte` | 🚧 Planned |
| **Solid** | `@openchat/typescript-sdk/solid` | 🚧 Planned |

### Quick Start

#### Vanilla JavaScript / TypeScript

```bash
npm install @openchat/typescript-sdk
```

```typescript
import { OpenChatCore } from '@openchat/typescript-sdk';

const openChat = new OpenChatCore({
  baseUrl: 'https://api.openchat.com',
});

await openChat.auth.login('username', 'password');
```

#### React

```bash
npm install @openchat/typescript-sdk/react
```

```tsx
import { OpenChatProvider, useMessages } from '@openchat/typescript-sdk/react';

function App() {
  return (
    <OpenChatProvider config={{ baseUrl: 'https://api.openchat.com' }}>
      <Chat />
    </OpenChatProvider>
  );
}

function Chat() {
  const { messages, sendMessage } = useMessages('conversation-id');
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content.text}</div>
      ))}
    </div>
  );
}
```

#### Vue 3

```bash
npm install @openchat/typescript-sdk/vue
```

```typescript
import { OpenChatPlugin } from '@openchat/typescript-sdk/vue';

app.use(OpenChatPlugin, { baseUrl: 'https://api.openchat.com' });
```

```vue
<script setup>
import { useMessages } from '@openchat/typescript-sdk/vue';
const { messages, sendMessage } = useMessages('conversation-id');
</script>
```

## Quick Start - Other Platforms

### Flutter

```yaml
dependencies:
  openchat_sdk: ^1.0.0
```

```dart
final openChat = OpenChat(config: OpenChatConfig(baseUrl: '...'));
await openChat.auth.login(username: '...', password: '...');
```

### iOS

```swift
import OpenChatSDK

let openChat = OpenChat(config: OpenChatConfig(baseUrl: "..."))
try await openChat.auth.login(username: "...", password: "...")
```

### Android

```kotlin
val openChat = OpenChat(context, OpenChatConfig(baseUrl = "..."))
lifecycleScope.launch {
    openChat.auth.login("...", "...")
}
```

### Node.js

```bash
npm install @openchat/nodejs-sdk
```

```typescript
import { OpenChat } from '@openchat/nodejs-sdk';

const openChat = new OpenChat({ baseUrl: '...' });
await openChat.auth.login({ username: '...', password: '...' });
```

### Python

```bash
pip install openchat-sdk
```

```python
from openchat_sdk import OpenChat

openchat = OpenChat(base_url="...")
await openchat.auth.login("...", "...")
```

## SDK Architecture

All SDKs follow a consistent architecture:

```
SDK/
├── Core/
│   ├── HTTP Client        # API communication
│   ├── WebSocket          # Real-time messaging
│   └── Event Bus          # Event handling
├── Modules/
│   ├── Auth               # Authentication
│   ├── User               # User management
│   ├── Friend             # Friend management
│   ├── Message            # Messaging
│   ├── Group              # Group chat
│   ├── Conversation       # Conversations
│   └── Contact            # Contacts
├── Adapters/              # Framework adapters (TypeScript SDK)
│   ├── react/
│   ├── vue/
│   ├── angular/
│   ├── svelte/
│   └── vanilla/
└── Models/                # Data models
```

## Common Features

All SDKs support:

- ✅ User authentication (login/register)
- ✅ Real-time messaging (WebSocket)
- ✅ Friend management (add/remove/block)
- ✅ Group chat (create/join/leave)
- ✅ Message types (text/image/audio/video/file)
- ✅ Conversation management
- ✅ Contact management
- ✅ Push notifications
- ✅ Offline support
- ✅ Error handling
- ✅ Type safety

## API Documentation

See [API Specification](./docs/api-spec.md) for detailed API documentation.

## Contributing

Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting PRs.

## License

MIT License - see [LICENSE](./LICENSE) for details.
