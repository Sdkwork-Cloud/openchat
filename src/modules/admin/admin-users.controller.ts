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
  AdminUserDeviceSessionListQueryDto,
  AdminUserListQueryDto,
  AdminUserProfileUpdateDto,
  AdminUserResetPasswordDto,
  AdminUserRolesUpdateDto,
} from './dto/admin.dto';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class AdminUsersController {
  constructor(private readonly adminConsoleService: AdminConsoleService) {}

  @Get()
  async listUsers(
    @CurrentUser() user: UserEntity,
    @Query() query: AdminUserListQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listUsers(query);
  }

  @Get(':id/device-sessions')
  async listUserDeviceSessions(
    @CurrentUser() user: UserEntity,
    @Param('id') userId: string,
    @Query() query: AdminUserDeviceSessionListQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listUserDeviceSessions(userId, query);
  }

  @Post(':id/device-sessions/logout-all')
  async logoutAllUserDeviceSessions(
    @CurrentUser() user: UserEntity,
    @Param('id') userId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.logoutAllUserDeviceSessions(user.id, userId);
  }

  @Post(':id/device-sessions/:deviceId/logout')
  async logoutUserDeviceSession(
    @CurrentUser() user: UserEntity,
    @Param('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.logoutUserDeviceSession(user.id, userId, deviceId);
  }

  @Get(':id')
  async getUserDetail(
    @CurrentUser() user: UserEntity,
    @Param('id') userId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.getUserDetail(userId);
  }

  @Put(':id/profile')
  async updateUserProfile(
    @CurrentUser() user: UserEntity,
    @Param('id') userId: string,
    @Body() payload: AdminUserProfileUpdateDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.updateUserProfile(user.id, userId, payload);
  }

  @Put(':id/roles')
  async updateUserRoles(
    @CurrentUser() user: UserEntity,
    @Param('id') userId: string,
    @Body() payload: AdminUserRolesUpdateDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.updateUserRoles(user.id, userId, payload.roles);
  }

  @Post(':id/reset-password')
  async resetUserPassword(
    @CurrentUser() user: UserEntity,
    @Param('id') userId: string,
    @Body() payload: AdminUserResetPasswordDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.resetUserPassword(user.id, userId, payload.newPassword);
  }

  @Delete(':id')
  async deleteUser(
    @CurrentUser() user: UserEntity,
    @Param('id') userId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.deleteUser(user.id, userId);
  }

  private assertAdmin(user: UserEntity): void {
    assertAdminAccess(user);
  }
}
