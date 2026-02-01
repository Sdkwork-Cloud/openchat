/**
 * Bot Platform Module - Public API
 *
 * @description
 * This module provides bot registration, management, and webhook capabilities
 * for the OpenChat platform.
 *
 * @example
 * ```typescript
 * import { BotPlatformModule } from './bot-platform';
 *
 * @Module({
 *   imports: [BotPlatformModule],
 * })
 * export class AppModule {}
 * ```
 */

// Module
export { BotPlatformModule } from './bot-platform.module';

// Entities
export { BotEntity, BotIntent, BotScope, BotStatus, WebhookConfig, BotStats } from './entities/bot.entity';
export { BotCommandEntity, CommandOptionType, CommandOption, CommandChoice } from './entities/bot-command.entity';

// Services
export { BotService, CreateBotParams, UpdateBotParams, BotResponse } from './services/bot.service';
export { WebhookService, WebhookPayload, WebhookResult } from './services/webhook.service';

// Controllers
export { BotController } from './controllers/bot.controller';
