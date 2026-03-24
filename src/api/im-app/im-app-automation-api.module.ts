import { Module } from '@nestjs/common';
import { AIBotModule } from '../../modules/ai-bot/ai-bot.module';
import { AgentModule } from '../../modules/agent/agent.module';
import { BotPlatformModule } from '../../modules/bot-platform/bot-platform.module';

@Module({
  imports: [AIBotModule, AgentModule, BotPlatformModule],
})
export class ImAppAutomationApiModule {}
