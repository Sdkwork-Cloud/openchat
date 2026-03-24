import { Module } from '@nestjs/common';
import { ContactModule } from '../../modules/contact/contact.module';
import { FriendModule } from '../../modules/friend/friend.module';
import { UserModule } from '../../modules/user/user.module';

@Module({
  imports: [UserModule, FriendModule, ContactModule],
})
export class ImAppIdentityApiModule {}
