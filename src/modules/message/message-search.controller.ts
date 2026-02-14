import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { MessageSearchService, MessageSearchResult } from './message-search.service';
import { Message } from './message.entity';

/**
 * 消息搜索请求 DTO
 */
class SearchMessagesDto {
  @ApiProperty({ description: '搜索关键词', required: true })
  keyword: string;

  @ApiProperty({ description: '目标ID（用户ID或群ID）', required: false })
  targetId?: string;

  @ApiProperty({ description: '会话类型：single/group', required: false })
  type?: 'single' | 'group';

  @ApiProperty({ description: '消息类型', required: false })
  messageType?: string;

  @ApiProperty({ description: '开始时间', required: false })
  startTime?: string;

  @ApiProperty({ description: '结束时间', required: false })
  endTime?: string;

  @ApiProperty({ description: '页码', required: false })
  page?: number;

  @ApiProperty({ description: '每页数量', required: false })
  pageSize?: number;
}

/**
 * 消息搜索控制器
 */
@ApiTags('message-search')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('messages/search')
export class MessageSearchController {
  constructor(private readonly messageSearchService: MessageSearchService) {}

  /**
   * 搜索消息
   */
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
      pageSize: Math.min(pageSize || 20, 100), // 限制最大100条
    });
  }

  /**
   * 快速搜索
   */
  @Get('quick')
  @ApiOperation({ summary: '快速搜索', description: '快速搜索最近的消息' })
  async quickSearch(
    @CurrentUser('userId') userId: string,
    @Query('keyword') keyword: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<{ messages: Message[]; nextCursor?: string }> {
    return this.messageSearchService.quickSearch(userId, keyword, Math.min(limit || 20, 50));
  }

  /**
   * 搜索特定会话的消息
   */
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

  /**
   * 获取消息统计
   */
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
