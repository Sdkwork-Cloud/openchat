import { Controller, Get, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { MultiAuthGuard, RequireScopes } from '../../../common/auth/guards/multi-auth.guard';

/**
 * 更新用户资料 DTO
 */
class UpdateProfileDto {
  nickname?: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
}

/**
 * 用户控制器
 * 提供用户资料管理 API
 */
@ApiTags('users')
@Controller('users')
@UseGuards(MultiAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前用户信息
   */
  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCurrentUser(@Request() req: { auth: { userId: string } }) {
    const user = await this.userService.getUserById(req.auth.userId);
    if (!user) {
      return null;
    }
    // 移除密码字段
    const { password, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  /**
   * 获取用户详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserById(@Param('id') id: string) {
    const user = await this.userService.getUserById(id);
    if (!user) {
      return null;
    }
    // 移除密码字段
    const { password, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  /**
   * 更新用户资料
   */
  @Put(':id')
  @RequireScopes('users:write')
  @ApiOperation({ summary: '更新用户资料' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Request() req: { auth: { userId: string } },
  ) {
    // 只能更新自己的资料（或管理员）
    if (id !== req.auth.userId) {
      throw new Error('Permission denied');
    }

    const updatedUser = await this.userService.updateUser(id, dto);
    if (!updatedUser) {
      return null;
    }

    // 移除密码字段
    const { password, ...userWithoutPassword } = updatedUser as any;
    return userWithoutPassword;
  }

  /**
   * 搜索用户
   */
  @Get()
  @ApiOperation({ summary: '搜索用户' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchUsers(
    @Query('keyword') keyword: string,
    @Query('limit') limit?: string,
  ) {
    if (!keyword) {
      return [];
    }
    return this.userService.searchUsers(keyword, limit ? parseInt(limit, 10) : 20);
  }
}
