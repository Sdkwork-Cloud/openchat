import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { Message, SendMessageResult } from './message.interface';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import {
  SendMessage,
  BatchSendMessage,
  UpdateMessageStatus,
  MarkMessagesRead,
  GetMessagesQuery,
  ForwardMessage,
} from './dto/message.dto';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Post()
  @ApiOperation({ summary: '发送消息' })
  @ApiResponse({ status: 201, description: '成功发送消息' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async sendMessage(@Body() messageData: SendMessage): Promise<SendMessageResult> {
    return this.messageService.sendMessage(messageData as any);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量发送消息' })
  @ApiResponse({ status: 201, description: '成功批量发送消息' })
  async batchSendMessages(@Body() batchData: BatchSendMessage): Promise<SendMessageResult[]> {
    const results: SendMessageResult[] = [];
    for (const msg of batchData.messages) {
      const result = await this.messageService.sendMessage(msg as any);
      results.push(result);
    }
    return results;
  }

  @Get(':id')
  @ApiOperation({ summary: '获取消息详情' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功获取消息详情' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  async getMessageById(@Param('id') id: string): Promise<Message | null> {
    return this.messageService.getMessageById(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户消息列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取用户消息列表' })
  async getMessagesByUserId(
    @Param('userId') userId: string,
    @Query() query: GetMessagesQuery,
  ): Promise<Message[]> {
    return this.messageService.getMessagesByUserId(userId, { limit: query.limit, offset: query.offset });
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: '获取群组消息列表' })
  @ApiParam({ name: 'groupId', description: '群组ID' })
  @ApiResponse({ status: 200, description: '成功获取群组消息列表' })
  async getMessagesByGroupId(
    @Param('groupId') groupId: string,
    @Query() query: GetMessagesQuery,
  ): Promise<Message[]> {
    return this.messageService.getMessagesByGroupId(groupId, { limit: query.limit, offset: query.offset });
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新消息状态' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功更新消息状态' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  async updateMessageStatus(
    @Param('id') id: string,
    @Body() body: UpdateMessageStatus,
  ): Promise<boolean> {
    return this.messageService.updateMessageStatus(id, body.status as any);
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
  @ApiResponse({ status: 200, description: '成功标记消息为已读' })
  async markMessagesAsRead(
    @Param('userId') userId: string,
    @Body() body: MarkMessagesRead,
  ): Promise<boolean> {
    return this.messageService.markMessagesAsRead(userId, body.messageIds);
  }

  @Post(':id/recall')
  @ApiOperation({ summary: '撤回消息' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功撤回消息' })
  @ApiResponse({ status: 400, description: '撤回失败' })
  async recallMessage(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ success: boolean; error?: string }> {
    return this.messageService.recallMessage(id, req.user.id);
  }

  @Post(':id/forward')
  @ApiOperation({ summary: '转发消息' })
  @ApiParam({ name: 'id', description: '原消息ID' })
  @ApiResponse({ status: 200, description: '成功转发消息' })
  async forwardMessage(
    @Param('id') id: string,
    @Body() body: ForwardMessage,
    @Request() req: any,
  ): Promise<SendMessageResult[]> {
    const results: SendMessageResult[] = [];

    for (const toUserId of body.toUserIds || []) {
      const result = await this.messageService.forwardMessage(id, req.user.id, toUserId, undefined);
      results.push(result);
    }

    for (const toGroupId of body.toGroupIds || []) {
      const result = await this.messageService.forwardMessage(id, req.user.id, undefined, toGroupId);
      results.push(result);
    }

    return results;
  }

  @Post(':id/retry')
  @ApiOperation({ summary: '重试发送失败的消息' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功重试发送' })
  async retryFailedMessage(@Param('id') id: string): Promise<SendMessageResult> {
    return this.messageService.retryFailedMessage(id);
  }
}
