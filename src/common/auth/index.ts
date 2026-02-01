/**
 * Authentication Module - Public API
 *
 * @description
 * This module provides multi-strategy authentication support including JWT,
 * Bot Token, and API Key authentication methods.
 *
 * @example
 * ```typescript
 * import { AuthModule, MultiAuthGuard, RequireScopes } from './auth';
 *
 * @Controller('api/v1/protected')
 * @UseGuards(MultiAuthGuard)
 * export class ProtectedController {
 *   @Get()
 *   @RequireScopes('users:read')
 *   async getData() {
 *     // Protected endpoint
 *   }
 * }
 * ```
 */

// Module
export { AuthModule } from './auth.module';

// Services
export { AuthManagerService, AuthConfig } from './auth-manager.service';

// Guards
export {
  MultiAuthGuard,
  RequireScopes,
  AllowAnonymous,
  RequireBotAuth,
  RequireAPIKey,
  REQUIRED_SCOPES_KEY,
  ALLOW_ANONYMOUS_KEY,
} from './guards/multi-auth.guard';

// Interfaces
export {
  AuthStrategy,
  AuthResult,
  TokenExtractor,
  JWTPayload,
  APIKeyPayload,
  OAuthTokenPayload,
} from './auth-strategy.interface';

// Strategies
export { JWTAuthStrategy } from './strategies/jwt.strategy';
export { BotTokenAuthStrategy } from './strategies/bot-token.strategy';
export { APIKeyAuthStrategy } from './strategies/api-key.strategy';
