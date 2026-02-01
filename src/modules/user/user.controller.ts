import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserSyncService } from './user-sync.service';
import { User } from './user.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private userSyncService: UserSyncService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: '获取用户信息' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取用户信息', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserById(@Param('id') id: string): Promise<User | null> {
    return this.userService.getUserById(id);
  }

  @Get()
  @ApiOperation({ summary: '根据用户名获取用户信息' })
  @ApiQuery({ name: 'username', description: '用户名' })
  @ApiResponse({ status: 200, description: '成功获取用户信息', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserByUsername(@Query('username') username: string): Promise<User | null> {
    return this.userService.getUserByUsername(username);
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiBody({ description: '用户信息', required: true })
  @ApiResponse({ status: 201, description: '成功创建用户', type: User })
  async createUser(@Body() userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.userService.createUser(userData);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiBody({ description: '用户信息', required: true })
  @ApiResponse({ status: 200, description: '成功更新用户信息', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async updateUser(@Param('id') id: string, @Body() userData: Partial<User>): Promise<User | null> {
    const updatedUser = await this.userService.updateUser(id, userData);

    if (updatedUser) {
      // 同步用户更新到IM系统（异步执行）
      this.userSyncService.syncUserOnUpdate(id, userData).catch(error => {
        console.error('Failed to sync user update to IM:', error);
      });
    }

    return updatedUser;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功删除用户' })
  async deleteUser(@Param('id') id: string): Promise<boolean> {
    const result = await this.userService.deleteUser(id);

    if (result) {
      // 同步用户删除到IM系统（异步执行）
      this.userSyncService.syncUserOnDelete(id).catch(error => {
        console.error('Failed to sync user delete to IM:', error);
      });
    }

    return result;
  }

  @Post('batch')
  @ApiOperation({ summary: '批量获取用户信息' })
  @ApiBody({ description: '用户ID列表', required: true, schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 200, description: '成功获取用户信息列表', type: [User] })
  async getUsers(@Body('ids') ids: string[]): Promise<User[]> {
    return this.userService.getUsers(ids);
  }
}