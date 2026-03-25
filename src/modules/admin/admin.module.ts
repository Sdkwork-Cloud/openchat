import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../../common/entities/audit-log.entity';
import { AuditLogService } from '../../common/services/audit-log.service';
import { Friend } from '../friend/friend.entity';
import { FriendRequest } from '../friend/friend-request.entity';
import { FriendModule } from '../friend/friend.module';
import { Group } from '../group/group.entity';
import { GroupMember } from '../group/group-member.entity';
import { GroupModule } from '../group/group.module';
import { DeviceEntity } from '../iot/entities/device.entity';
import { DeviceMessageEntity } from '../iot/entities/device-message.entity';
import { IoTModule } from '../iot/iot.module';
import { Message } from '../message/message.entity';
import { MessageModule } from '../message/message.module';
import { UserEntity } from '../user/entities/user.entity';
import { UserModule } from '../user/user.module';
import { AdminConsoleService } from './admin-console.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminFriendsController } from './admin-friends.controller';
import { AdminGroupsController } from './admin-groups.controller';
import { AdminIotController } from './admin-iot.controller';
import { AdminMessagesController } from './admin-messages.controller';
import { AdminSystemController } from './admin-system.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      Friend,
      FriendRequest,
      Group,
      GroupMember,
      Message,
      DeviceEntity,
      DeviceMessageEntity,
      AuditLogEntity,
    ]),
    UserModule,
    GroupModule,
    FriendModule,
    MessageModule,
    IoTModule,
  ],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminGroupsController,
    AdminFriendsController,
    AdminMessagesController,
    AdminIotController,
    AdminSystemController,
  ],
  providers: [AdminConsoleService, AuditLogService],
  exports: [AdminConsoleService],
})
export class AdminModule {}
