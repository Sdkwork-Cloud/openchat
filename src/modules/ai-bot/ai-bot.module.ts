import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIBotController } from './ai-bot.controller';
import { AIBotService } from './ai-bot.service';
import { AIBotEntity, BotMessageEntity } from './ai-bot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIBotEntity, BotMessageEntity]),
  ],
  controllers: [AIBotController],
  providers: [AIBotService],
  exports: [AIBotService],
})
export class AIBotModule {}
