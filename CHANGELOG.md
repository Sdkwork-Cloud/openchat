# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Installation wizard with interactive setup
- Comprehensive operations toolkit (diagnose, auto-fix, log-analyzer, health-check)
- Multi-environment configuration support (development, test, production)
- External database and Redis support
- Installation state management and recovery

### Changed

- Updated documentation structure and content
- Improved Docker deployment configuration
- Enhanced security configuration

## [1.0.0] - 2024-01-01

### Added

- Core instant messaging functionality
  - One-on-one chat
  - Group chat (up to 500 members)
  - Message recall (within 2 minutes)
  - Read receipts
  - Multimedia messages (text, image, voice, video, file)
  - Message search
  - Offline push notifications

- Real-time audio/video
  - HD voice calls
  - 1080P video calls
  - Screen sharing
  - Group calls
  - Recording and playback

- AI Assistant
  - ChatGPT integration
  - Smart customer service
  - Custom AI bots
  - Multi-model support (OpenAI, Claude)

- Third-party integrations
  - Telegram message sync
  - WhatsApp message sync
  - Webhook support
  - Open API

- System features
  - User management
  - Friend system
  - Group management
  - WebSocket real-time push
  - Distributed deployment
  - Performance monitoring
  - JWT + RBAC authentication
  - Rate limiting

### Security

- Password encryption with bcrypt
- JWT authentication with refresh tokens
- Multi-level rate limiting
- Input validation with class-validator
- SQL injection protection via TypeORM
- Security headers with Helmet
- CORS configuration
- Timing attack protection

## [0.9.0] - 2023-12-01

### Added

- Initial beta release
- Basic IM functionality
- User authentication
- Message storage
- WebSocket support

### Changed

- Migrated to NestJS 11
- Upgraded to TypeScript 5.9

## [0.1.0] - 2023-06-01

### Added

- Project initialization
- Basic project structure
- Development environment setup

---

[Unreleased]: https://github.com/Sdkwork-Cloud/openchat/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Sdkwork-Cloud/openchat/releases/tag/v1.0.0
[0.9.0]: https://github.com/Sdkwork-Cloud/openchat/releases/tag/v0.9.0
[0.1.0]: https://github.com/Sdkwork-Cloud/openchat/releases/tag/v0.1.0
