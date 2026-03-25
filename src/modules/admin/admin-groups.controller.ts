import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { assertAdminAccess } from '../../common/auth/admin-access.util';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { AdminConsoleService } from './admin-console.service';
import {
  AdminGroupListQueryDto,
  AdminGroupMemberMuteDto,
  AdminGroupMemberRoleUpdateDto,
  AdminGroupMemberUpdateDto,
  AdminGroupTransferOwnerDto,
  AdminGroupUpdateDto,
} from './dto/admin.dto';

@ApiTags('admin-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class AdminGroupsController {
  constructor(private readonly adminConsoleService: AdminConsoleService) {}

  @Get()
  async listGroups(
    @CurrentUser() user: UserEntity,
    @Query() query: AdminGroupListQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listGroups(query);
  }

  @Get(':id')
  async getGroupDetail(
    @CurrentUser() user: UserEntity,
    @Param('id') groupId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.getGroupDetail(groupId);
  }

  @Put(':id')
  async updateGroup(
    @CurrentUser() user: UserEntity,
    @Param('id') groupId: string,
    @Body() payload: AdminGroupUpdateDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.updateGroup(user.id, groupId, payload);
  }

  @Post(':id/members')
  async addGroupMember(
    @CurrentUser() user: UserEntity,
    @Param('id') groupId: string,
    @Body() payload: AdminGroupMemberUpdateDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.addGroupMember(user.id, groupId, payload);
  }

  @Put(':id/members/:userId/role')
  async updateGroupMemberRole(
    @CurrentUser() user: UserEntity,
    @Param('id') groupId: string,
    @Param('userId') memberUserId: string,
    @Body() payload: AdminGroupMemberRoleUpdateDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.updateGroupMemberRole(
      user.id,
      groupId,
      memberUserId,
      payload,
    );
  }

  @Put(':id/members/:userId/mute')
  async updateGroupMemberMute(
    @CurrentUser() user: UserEntity,
    @Param('id') groupId: string,
    @Param('userId') memberUserId: string,
    @Body() payload: AdminGroupMemberMuteDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.updateGroupMemberMute(
      user.id,
      groupId,
      memberUserId,
      payload,
    );
  }

  @Delete(':id/members/:userId')
  async removeGroupMember(
    @CurrentUser() user: UserEntity,
    @Param('id') groupId: string,
    @Param('userId') memberUserId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.removeGroupMember(user.id, groupId, memberUserId);
  }

  @Post(':id/transfer')
  async transferGroupOwner(
    @CurrentUser() user: UserEntity,
    @Param('id') groupId: string,
    @Body() payload: AdminGroupTransferOwnerDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.transferGroupOwner(user.id, groupId, payload);
  }

  @Delete(':id')
  async deleteGroup(
    @CurrentUser() user: UserEntity,
    @Param('id') groupId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.deleteGroup(user.id, groupId);
  }

  private assertAdmin(user: UserEntity): void {
    assertAdminAccess(user);
  }
}
