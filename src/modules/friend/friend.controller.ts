import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FriendService } from './friend.service';
import { FriendRequest } from './friend.interface';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendController {
  constructor(private friendService: FriendService) {}

  @Post('request')
  @ApiOperation({ summary: '发送好友请求' })
  @ApiBody({ description: '好友请求信息', required: true, schema: { type: 'object', properties: { fromUserId: { type: 'string' }, toUserId: { type: 'string' }, message: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: '成功发送好友请求', type: FriendRequest })
  @ApiResponse({ status: 400, description: '好友请求已发送或好友关系已存在' })
  async sendFriendRequest(
    @Body('fromUserId') fromUserId: string,
    @Body('toUserId') toUserId: string,
    @Body('message') message?: string,
  ): Promise<FriendRequest> {
    return this.friendService.sendFriendRequest(fromUserId, toUserId, message);
  }

  @Post('request/:id/accept')
  @ApiOperation({ summary: '接受好友请求' })
  @ApiParam({ name: 'id', description: '好友请求ID' })
  @ApiResponse({ status: 200, description: '成功接受好友请求' })
  @ApiResponse({ status: 400, description: '好友请求不存在或状态不正确' })
  async acceptFriendRequest(@Param('id') id: string): Promise<boolean> {
    return this.friendService.acceptFriendRequest(id);
  }

  @Post('request/:id/reject')
  @ApiOperation({ summary: '拒绝好友请求' })
  @ApiParam({ name: 'id', description: '好友请求ID' })
  @ApiResponse({ status: 200, description: '成功拒绝好友请求' })
  @ApiResponse({ status: 400, description: '好友请求不存在或状态不正确' })
  async rejectFriendRequest(@Param('id') id: string): Promise<boolean> {
    return this.friendService.rejectFriendRequest(id);
  }

  @Delete('request/:id')
  @ApiOperation({ summary: '取消好友请求' })
  @ApiParam({ name: 'id', description: '好友请求ID' })
  @ApiResponse({ status: 200, description: '成功取消好友请求' })
  @ApiResponse({ status: 400, description: '好友请求不存在或状态不正确' })
  async cancelFriendRequest(@Param('id') id: string): Promise<boolean> {
    return this.friendService.cancelFriendRequest(id);
  }

  @Delete(':userId/:friendId')
  @ApiOperation({ summary: '删除好友' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiParam({ name: 'friendId', description: '好友ID' })
  @ApiResponse({ status: 200, description: '成功删除好友' })
  async removeFriend(@Param('userId') userId: string, @Param('friendId') friendId: string): Promise<boolean> {
    return this.friendService.removeFriend(userId, friendId);
  }

  @Get('requests/:userId')
  @ApiOperation({ summary: '获取好友请求列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({ name: 'status', description: '请求状态', required: false })
  @ApiResponse({ status: 200, description: '成功获取好友请求列表', type: [FriendRequest] })
  async getFriendRequests(
    @Param('userId') userId: string,
    @Query('status') status?: 'pending' | 'accepted' | 'rejected',
  ): Promise<FriendRequest[]> {
    return this.friendService.getFriendRequests(userId, status);
  }

  @Get(':userId')
  @ApiOperation({ summary: '获取好友列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取好友列表' })
  async getFriends(@Param('userId') userId: string): Promise<string[]> {
    return this.friendService.getFriends(userId);
  }

  @Get(':userId/:friendId/check')
  @ApiOperation({ summary: '检查好友关系' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiParam({ name: 'friendId', description: '好友ID' })
  @ApiResponse({ status: 200, description: '成功检查好友关系' })
  async checkFriendship(@Param('userId') userId: string, @Param('friendId') friendId: string): Promise<boolean> {
    return this.friendService.checkFriendship(userId, friendId);
  }

  @Get('requests/sent/:userId')
  @ApiOperation({ summary: '获取发送的好友请求列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取发送的好友请求列表', type: [FriendRequest] })
  async getSentFriendRequests(@Param('userId') userId: string): Promise<FriendRequest[]> {
    return this.friendService.getSentFriendRequests(userId);
  }

  @Post(':userId/:friendId/block')
  @ApiOperation({ summary: '拉黑好友' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiParam({ name: 'friendId', description: '好友ID' })
  @ApiResponse({ status: 200, description: '成功拉黑好友' })
  async blockFriend(@Param('userId') userId: string, @Param('friendId') friendId: string): Promise<boolean> {
    return this.friendService.blockFriend(userId, friendId);
  }

  @Post(':userId/:friendId/unblock')
  @ApiOperation({ summary: '取消拉黑' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiParam({ name: 'friendId', description: '好友ID' })
  @ApiResponse({ status: 200, description: '成功取消拉黑' })
  async unblockFriend(@Param('userId') userId: string, @Param('friendId') friendId: string): Promise<boolean> {
    return this.friendService.unblockFriend(userId, friendId);
  }

  @Get(':userId/:friendId/blocked')
  @ApiOperation({ summary: '检查是否被拉黑' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiParam({ name: 'friendId', description: '好友ID' })
  @ApiResponse({ status: 200, description: '成功检查拉黑状态' })
  async checkBlocked(@Param('userId') userId: string, @Param('friendId') friendId: string): Promise<boolean> {
    return this.friendService.checkBlocked(userId, friendId);
  }
}