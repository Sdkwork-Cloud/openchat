import { Module } from '@nestjs/common';
import { ConversationModule } from '../../modules/conversation/conversation.module';
import { GroupModule } from '../../modules/group/group.module';
import { MessageModule } from '../../modules/message/message.module';

@Module({
  imports: [MessageModule, GroupModule, ConversationModule],
})
export class ImAppMessagingApiModule {}
