import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { Message } from './message.entity';
import { MessageSearchResult, MessageSearchService } from './message-search.service';

@ApiTags('message-search')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('messages/search')
export class MessageSearchController {
  constructor(private readonly messageSearchService: MessageSearchService) {}

  @Get()
  @ApiOperation({ summary: '搜索消息', description: '使用关键词搜索消息内容' })
  async search(
    @CurrentUser('userId') userId: string,
    @Query('keyword') keyword: string,
    @Query('targetId') targetId?: string,
    @Query('type') type?: 'single' | 'group',
    @Query('messageType') messageType?: string,
    @Query('startTime') startTimeStr?: string,
    @Query('endTime') endTimeStr?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ): Promise<MessageSearchResult> {
    return this.messageSearchService.search({
      keyword,
      userId,
      targetId,
      type,
      messageType,
      startTime: startTimeStr ? new Date(startTimeStr) : undefined,
      endTime: endTimeStr ? new Date(endTimeStr) : undefined,
      page,
      pageSize: Math.min(pageSize || 20, 100),
    });
  }

  @Get('quick')
  @ApiOperation({ summary: '快速搜索', description: '快速搜索最近的消息' })
  async quickSearch(
    @CurrentUser('userId') userId: string,
    @Query('keyword') keyword: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<{ messages: Message[]; nextCursor?: string }> {
    return this.messageSearchService.quickSearch(userId, keyword, Math.min(limit || 20, 50));
  }

  @Get('conversation')
  @ApiOperation({ summary: '搜索会话消息', description: '在特定会话中搜索消息' })
  async searchInConversation(
    @CurrentUser('userId') userId: string,
    @Query('targetId') targetId: string,
    @Query('type') type: 'single' | 'group',
    @Query('keyword') keyword: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ): Promise<MessageSearchResult> {
    return this.messageSearchService.searchInConversation(
      userId,
      targetId,
      type,
      keyword,
      page,
      Math.min(pageSize || 20, 100),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: '消息统计', description: '获取用户的消息统计信息' })
  async getMessageStats(
    @CurrentUser('userId') userId: string,
    @Query('startTime') startTimeStr?: string,
    @Query('endTime') endTimeStr?: string,
  ): Promise<{
    totalSent: number;
    totalReceived: number;
    textMessages: number;
    imageMessages: number;
    fileMessages: number;
  }> {
    return this.messageSearchService.getMessageStats(
      userId,
      startTimeStr ? new Date(startTimeStr) : undefined,
      endTimeStr ? new Date(endTimeStr) : undefined,
    );
  }
}
