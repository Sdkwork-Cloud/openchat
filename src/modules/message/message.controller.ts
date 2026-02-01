import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { Message, SendMessageResult } from './message.interface';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Post()
  @ApiOperation({ summary: '发送消息' })
  @ApiBody({ description: '消息信息', required: true })
  @ApiResponse({ status: 201, description: '成功发送消息' })
  async sendMessage(@Body() messageData: Omit<Message, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { clientSeq?: number }): Promise<SendMessageResult> {
    return this.messageService.sendMessage(messageData);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取消息详情' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功获取消息详情', type: Message })
  @ApiResponse({ status: 404, description: '消息不存在' })
  async getMessageById(@Param('id') id: string): Promise<Message | null> {
    return this.messageService.getMessageById(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户消息列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({ name: 'limit', description: '限制数量', required: false })
  @ApiQuery({ name: 'offset', description: '偏移量', required: false })
  @ApiResponse({ status: 200, description: '成功获取用户消息列表', type: [Message] })
  async getMessagesByUserId(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<Message[]> {
    return this.messageService.getMessagesByUserId(userId, limit, offset);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: '获取群组消息列表' })
  @ApiParam({ name: 'groupId', description: '群组ID' })
  @ApiQuery({ name: 'limit', description: '限制数量', required: false })
  @ApiQuery({ name: 'offset', description: '偏移量', required: false })
  @ApiResponse({ status: 200, description: '成功获取群组消息列表', type: [Message] })
  async getMessagesByGroupId(
    @Param('groupId') groupId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<Message[]> {
    return this.messageService.getMessagesByGroupId(groupId, limit, offset);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新消息状态' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiBody({ description: '消息状态', required: true, schema: { type: 'object', properties: { status: { type: 'string', enum: ['sending', 'sent', 'delivered', 'read', 'failed'] } } } })
  @ApiResponse({ status: 200, description: '成功更新消息状态' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  async updateMessageStatus(@Param('id') id: string, @Body('status') status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'): Promise<boolean> {
    return this.messageService.updateMessageStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除消息' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功删除消息' })
  async deleteMessage(@Param('id') id: string): Promise<boolean> {
    return this.messageService.deleteMessage(id);
  }

  @Post(':userId/read')
  @ApiOperation({ summary: '标记消息为已读' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiBody({ description: '消息ID列表', required: true, schema: { type: 'object', properties: { messageIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 200, description: '成功标记消息为已读' })
  async markMessagesAsRead(@Param('userId') userId: string, @Body('messageIds') messageIds: string[]): Promise<boolean> {
    return this.messageService.markMessagesAsRead(userId, messageIds);
  }
}