import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { GroupSyncService } from './group-sync.service';
import { GroupBlacklistService } from './group-blacklist.service';
import { GroupMessageBatchService } from './group-message-batch.service';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { GroupInvitation } from './group-invitation.entity';
import { ContactModule } from '../contact/contact.module';
import { ConversationModule } from '../conversation/conversation.module';
import { IMProviderModule } from '../im-provider/im-provider.module';
import { RedisModule } from '../../common/redis/redis.module';
import { ConversationEntity } from '../conversation/conversation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, GroupInvitation, ConversationEntity]),
    HttpModule,
    ContactModule,
    ConversationModule,
    IMProviderModule,
    RedisModule,
  ],
  providers: [GroupService, GroupSyncService, GroupBlacklistService, GroupMessageBatchService],
  controllers: [GroupController],
  exports: [GroupService, GroupSyncService, GroupBlacklistService, GroupMessageBatchService],
})
export class GroupModule {}