import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageFilterService } from './message-filter.service';
import { MessageDeduplicationService } from './message-deduplication.service';
import { MessageSearchService } from './message-search.service';
import { MessageSearchController } from './message-search.controller';
import { Message } from './message.entity';
import { Friend } from '../friend/friend.entity';
import { GroupMember } from '../group/group-member.entity';
import { ConversationModule } from '../conversation/conversation.module';
import { ContactModule } from '../contact/contact.module';
import { IMProviderModule } from '../im-provider/im-provider.module';
import { GroupModule } from '../group/group.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Friend, GroupMember]),
    ConversationModule,
    ContactModule,
    IMProviderModule,
    RedisModule,
    // 使用 forwardRef 避免循环依赖
    forwardRef(() => GroupModule),
  ],
  providers: [
    MessageService,
    MessageFilterService,
    MessageDeduplicationService,
    MessageSearchService,
  ],
  controllers: [MessageController, MessageSearchController],
  exports: [
    MessageService,
    MessageFilterService,
    MessageDeduplicationService,
    MessageSearchService,
  ],
})
export class MessageModule {}