import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendService } from './friend.service';
import { FriendController } from './friend.controller';
import { Friend } from './friend.entity';
import { FriendRequest } from './friend-request.entity';
import { ContactModule } from '../contact/contact.module';
import { ConversationModule } from '../conversation/conversation.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friend, FriendRequest]),
    ContactModule,
    ConversationModule,
    UserModule,
  ],
  providers: [FriendService],
  controllers: [FriendController],
  exports: [FriendService],
})
export class FriendModule {}