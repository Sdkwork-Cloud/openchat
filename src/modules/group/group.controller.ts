import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { Group, GroupMember, GroupInvitation } from './group.interface';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: '创建群组' })
  @ApiBody({ description: '群组信息', required: true })
  @ApiResponse({ status: 201, description: '成功创建群组', type: Group })
  async createGroup(@Body() groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> {
    return this.groupService.createGroup(groupData);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取群组详情' })
  @ApiParam({ name: 'id', description: '群组ID' })
  @ApiResponse({ status: 200, description: '成功获取群组详情', type: Group })
  @ApiResponse({ status: 404, description: '群组不存在' })
  async getGroupById(@Param('id') id: string): Promise<Group | null> {
    return this.groupService.getGroupById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新群组信息' })
  @ApiParam({ name: 'id', description: '群组ID' })
  @ApiBody({ description: '群组信息', required: true })
  @ApiResponse({ status: 200, description: '成功更新群组信息', type: Group })
  @ApiResponse({ status: 404, description: '群组不存在' })
  async updateGroup(@Param('id') id: string, @Body() groupData: Partial<Group>): Promise<Group | null> {
    return this.groupService.updateGroup(id, groupData);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除群组' })
  @ApiParam({ name: 'id', description: '群组ID' })
  @ApiResponse({ status: 200, description: '成功删除群组' })
  @ApiResponse({ status: 404, description: '群组不存在' })
  async deleteGroup(@Param('id') id: string): Promise<boolean> {
    return this.groupService.deleteGroup(id);
  }

  @Post(':groupId/members')
  @ApiOperation({ summary: '添加群成员' })
  @ApiParam({ name: 'groupId', description: '群组ID' })
  @ApiBody({ description: '成员信息', required: true, schema: { type: 'object', properties: { userId: { type: 'string' }, role: { type: 'string', enum: ['admin', 'member'], default: 'member' } } } })
  @ApiResponse({ status: 201, description: '成功添加群成员', type: GroupMember })
  @ApiResponse({ status: 400, description: '群组不存在或用户已在群中' })
  async addMember(
    @Param('groupId') groupId: string,
    @Body('userId') userId: string,
    @Body('role') role: 'admin' | 'member' = 'member',
  ): Promise<GroupMember> {
    return this.groupService.addMember(groupId, userId, role);
  }

  @Delete(':groupId/members/:userId')
  @ApiOperation({ summary: '移除群成员' })
  @ApiParam({ name: 'groupId', description: '群组ID' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功移除群成员' })
  async removeMember(@Param('groupId') groupId: string, @Param('userId') userId: string): Promise<boolean> {
    return this.groupService.removeMember(groupId, userId);
  }

  @Put(':groupId/members/:userId/role')
  @ApiOperation({ summary: '更新群成员角色' })
  @ApiParam({ name: 'groupId', description: '群组ID' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiBody({ description: '角色信息', required: true, schema: { type: 'object', properties: { role: { type: 'string', enum: ['admin', 'member'] } } } })
  @ApiResponse({ status: 200, description: '成功更新群成员角色' })
  async updateMemberRole(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body('role') role: 'admin' | 'member',
  ): Promise<boolean> {
    return this.groupService.updateMemberRole(groupId, userId, role);
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: '获取群成员列表' })
  @ApiParam({ name: 'groupId', description: '群组ID' })
  @ApiResponse({ status: 200, description: '成功获取群成员列表', type: [GroupMember] })
  async getGroupMembers(@Param('groupId') groupId: string): Promise<GroupMember[]> {
    return this.groupService.getGroupMembers(groupId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户所在群组列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取用户所在群组列表', type: [Group] })
  async getGroupsByUserId(@Param('userId') userId: string): Promise<Group[]> {
    return this.groupService.getGroupsByUserId(userId);
  }

  @Post('invitation')
  @ApiOperation({ summary: '发送群组邀请' })
  @ApiBody({ description: '邀请信息', required: true, schema: { type: 'object', properties: { groupId: { type: 'string' }, inviterId: { type: 'string' }, inviteeId: { type: 'string' }, message: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: '成功发送群组邀请', type: GroupInvitation })
  @ApiResponse({ status: 400, description: '群组不存在、邀请者不是群成员或被邀请者已在群中' })
  async sendGroupInvitation(
    @Body('groupId') groupId: string,
    @Body('inviterId') inviterId: string,
    @Body('inviteeId') inviteeId: string,
    @Body('message') message?: string,
  ): Promise<GroupInvitation> {
    return this.groupService.sendGroupInvitation(groupId, inviterId, inviteeId, message);
  }

  @Post('invitation/:id/accept')
  @ApiOperation({ summary: '接受群组邀请' })
  @ApiParam({ name: 'id', description: '邀请ID' })
  @ApiResponse({ status: 200, description: '成功接受群组邀请' })
  @ApiResponse({ status: 400, description: '邀请不存在或状态不正确' })
  async acceptGroupInvitation(@Param('id') id: string): Promise<boolean> {
    return this.groupService.acceptGroupInvitation(id);
  }

  @Post('invitation/:id/reject')
  @ApiOperation({ summary: '拒绝群组邀请' })
  @ApiParam({ name: 'id', description: '邀请ID' })
  @ApiResponse({ status: 200, description: '成功拒绝群组邀请' })
  @ApiResponse({ status: 400, description: '邀请不存在或状态不正确' })
  async rejectGroupInvitation(@Param('id') id: string): Promise<boolean> {
    return this.groupService.rejectGroupInvitation(id);
  }

  @Delete('invitation/:id')
  @ApiOperation({ summary: '取消群组邀请' })
  @ApiParam({ name: 'id', description: '邀请ID' })
  @ApiResponse({ status: 200, description: '成功取消群组邀请' })
  @ApiResponse({ status: 400, description: '邀请不存在或状态不正确' })
  async cancelGroupInvitation(@Param('id') id: string): Promise<boolean> {
    return this.groupService.cancelGroupInvitation(id);
  }
}