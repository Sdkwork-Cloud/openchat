import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { assertAdminAccess } from '../../common/auth/admin-access.util';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { AdminConsoleService } from './admin-console.service';
import {
  AdminFriendListQueryDto,
  AdminFriendPairDto,
  AdminFriendRequestListQueryDto,
} from './dto/admin.dto';

@ApiTags('admin-friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class AdminFriendsController {
  constructor(private readonly adminConsoleService: AdminConsoleService) {}

  @Get()
  async listFriends(
    @CurrentUser() user: UserEntity,
    @Query() query: AdminFriendListQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listFriends(query);
  }

  @Get('requests')
  async listFriendRequests(
    @CurrentUser() user: UserEntity,
    @Query() query: AdminFriendRequestListQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listFriendRequests(query);
  }

  @Post('requests/:id/accept')
  async acceptFriendRequest(
    @CurrentUser() user: UserEntity,
    @Param('id') requestId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.acceptFriendRequest(user.id, requestId);
  }

  @Post('requests/:id/reject')
  async rejectFriendRequest(
    @CurrentUser() user: UserEntity,
    @Param('id') requestId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.rejectFriendRequest(user.id, requestId);
  }

  @Post('remove')
  async removeFriendship(
    @CurrentUser() user: UserEntity,
    @Body() payload: AdminFriendPairDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.removeFriendship(user.id, payload);
  }

  @Post('block')
  async blockFriendship(
    @CurrentUser() user: UserEntity,
    @Body() payload: AdminFriendPairDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.blockFriendship(user.id, payload);
  }

  @Post('unblock')
  async unblockFriendship(
    @CurrentUser() user: UserEntity,
    @Body() payload: AdminFriendPairDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.unblockFriendship(user.id, payload);
  }

  private assertAdmin(user: UserEntity): void {
    assertAdminAccess(user);
  }
}
