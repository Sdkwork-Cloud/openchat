import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { ConversationUnreadService } from './conversation-unread.service';
import { ConversationController } from './conversation.controller';
import { ConversationEntity } from './conversation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationEntity]),
  ],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationUnreadService],
  exports: [ConversationService, ConversationUnreadService],
})
export class ConversationModule {}
