# Changelog

All notable changes to the OpenChat TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

#### Core Features
- **OpenChatClient**: Unified client entry point with `client.init()` one-click initialization
- **AuthModule**: Complete authentication flow (register, login, logout, token refresh)
- **IMModule**: Full instant messaging capabilities
  - `client.im.messages`: Message operations (send, recall, delete, forward, reply)
  - `client.im.conversations`: Conversation management
  - `client.im.contacts`: Contact management
  - `client.im.groups`: Group management
- **RTCModule**: Real-time audio/video calling with multiple providers
  - Volcengine RTC support
  - Agora RTC support (planned)
  - Tencent TRTC support (planned)

#### MediaResource Standard (MRS)
- **14 MediaResource Types**: AI-native resource definitions
  - `ImageMediaResource`: Image resources with AI generation support
  - `VideoMediaResource`: Video resources with cover and duration
  - `AudioMediaResource`: Audio resources with transcription
  - `FileMediaResource`: File resources with metadata
  - `DocumentMediaResource`: Document resources (PDF, DOC, etc.)
  - `MusicMediaResource`: Music resources with genre and mood
  - `LocationMediaResource`: Location resources with coordinates
  - `CardMediaResource`: Card resources (user card, mini-program card)
  - `CharacterMediaResource`: AI character/agent resources
  - `Model3DMediaResource`: 3D model resources (GLB, GLTF)
  - `CodeMediaResource`: Code snippet resources
  - `PptMediaResource`: Presentation resources
  - `CustomMediaResource`: Custom resources
  - `CombinedMediaResource`: Combined resources (multiple images)

#### ResourceBuilder
- Fluent API for building MediaResource objects
- Type-safe resource construction
- Support for AI prompt and regeneration

#### Platform Support
- **Browser**: Chrome 80+, Firefox 75+, Safari 13.1+, Edge 80+
- **Node.js**: Node.js 16+
- **Mini Programs**: WeChat, Alipay, Baidu, ByteDance

#### Infrastructure
- **HttpCache**: HTTP response caching with LRU eviction
- **RetryPolicy**: Configurable retry strategies with backoff
  - Exponential backoff
  - Linear backoff
  - Fixed interval backoff
- **HttpClient**: Multi-platform HTTP client abstraction
- **PlatformDetector**: Automatic platform detection

#### Type System
- Complete TypeScript type definitions
- 100% type-safe API design
- JSDoc documentation for all public APIs

### Fixed

#### LRU Cache
- Fixed `removeTail()` method deleting wrong node

#### HttpCache
- Fixed `set()` method not supporting 2 parameters
- Fixed `get()` method missing `requests` counter
- Fixed TTL=0 handling (immediate expiration)
- Fixed maxSize=0 handling (disable caching)
- Fixed defaultTTL=0 falsy value handling

#### RTC
- Fixed `generateToken()` cross-platform compatibility (browser vs Node.js)

#### Code Quality
- Fixed `OpenChatError` duplicate interface/class definition
- Fixed `Function` type usage (replaced with proper function signatures)
- Fixed `hasOwnProperty` usage (use `Object.prototype.hasOwnProperty.call`)
- Removed unused imports

### Changed

#### API Design
- Simplified message sending API with `toUserId`/`groupId` parameters
- Unified MediaResource standard for all media types
- Consistent error handling with `OpenChatError`

### Documentation
- 2286 lines of comprehensive README documentation
- API reference for all modules
- Best practices guide
- FAQ section
- 10 complete code examples

### Testing
- 54 unit test cases
- LRU cache tests (14 cases)
- HTTP cache tests (22 cases)
- Retry policy tests (15 cases)
- API service tests (4 cases)

### Dependencies
- **Production**: `eventemitter3@^5.0.1` (only 1 dependency)
- **Development**: TypeScript 5.3, Jest 29, Rollup 4, ESLint 8

---

## [0.9.0] - 2024-01-01

### Added
- Initial beta release
- Basic IM functionality
- Simple message types
- WeChat mini-program support

---

## Roadmap

### [1.1.0] - Planned
- Agora RTC provider support
- Tencent TRTC provider support
- Message translation API
- Message search improvements

### [1.2.0] - Planned
- End-to-end encryption
- Message reactions
- Message threading
- Voice/video message recording

### [2.0.0] - Planned
- WebRTC-based P2P calls
- Screen sharing
- Virtual background
- AI-powered features
