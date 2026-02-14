import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import {
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest,
  ConversationQueryParams,
} from './conversation.interface';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  /**
   * 创建会话
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建会话' })
  @ApiBody({
    description: '会话信息',
    required: true,
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['single', 'group'] },
        userId: { type: 'string' },
        targetId: { type: 'string' },
      },
      required: ['type', 'userId', 'targetId'],
    },
  })
  @ApiResponse({ status: 201, description: '成功创建会话', type: Conversation })
  @ApiResponse({ status: 400, description: '会话已存在' })
  async createConversation(
    @Body() request: CreateConversationRequest,
  ): Promise<Conversation> {
    return this.conversationService.createConversation(request);
  }

  /**
   * 获取会话详情
   */
  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取会话详情' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiResponse({ status: 200, description: '成功获取会话详情', type: Conversation })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async getConversationById(@Param('id') id: string): Promise<Conversation | null> {
    return this.conversationService.getConversationById(id);
  }

  /**
   * 获取用户的会话列表
   */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取用户的会话列表' })
  @ApiQuery({ name: 'userId', description: '用户ID', required: true })
  @ApiQuery({ name: 'type', description: '会话类型', required: false, enum: ['single', 'group'] })
  @ApiQuery({ name: 'isPinned', description: '是否置顶', required: false })
  @ApiQuery({ name: 'limit', description: '限制数量', required: false })
  @ApiQuery({ name: 'offset', description: '偏移量', required: false })
  @ApiResponse({ status: 200, description: '成功获取会话列表', type: [Conversation] })
  async getConversationsByUserId(
    @Query('userId') userId: string,
    @Query('type') type?: 'single' | 'group',
    @Query('isPinned') isPinned?: boolean,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<Conversation[]> {
    return this.conversationService.getConversationsByUserId({
      userId,
      type,
      isPinned,
      limit,
      offset,
    });
  }

  /**
   * 获取用户与特定目标的会话
   */
  @Get('target/:userId/:targetId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取用户与特定目标的会话' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiParam({ name: 'targetId', description: '目标ID' })
  @ApiQuery({ name: 'type', description: '会话类型', required: true, enum: ['single', 'group'] })
  @ApiResponse({ status: 200, description: '成功获取会话', type: Conversation })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async getConversationByTarget(
    @Param('userId') userId: string,
    @Param('targetId') targetId: string,
    @Query('type') type: 'single' | 'group',
  ): Promise<Conversation | null> {
    return this.conversationService.getConversationByTarget(userId, targetId, type);
  }

  /**
   * 更新会话
   */
  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新会话' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiBody({
    description: '会话更新信息',
    required: true,
    schema: {
      type: 'object',
      properties: {
        isPinned: { type: 'boolean' },
        isMuted: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '成功更新会话', type: Conversation })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async updateConversation(
    @Param('id') id: string,
    @Body() request: UpdateConversationRequest,
  ): Promise<Conversation | null> {
    return this.conversationService.updateConversation(id, request);
  }

  /**
   * 删除会话
   */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除会话' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiResponse({ status: 200, description: '成功删除会话' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async deleteConversation(@Param('id') id: string): Promise<boolean> {
    return this.conversationService.deleteConversation(id);
  }

  /**
   * 置顶/取消置顶会话
   */
  @Put(':id/pin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '置顶/取消置顶会话' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiBody({
    description: '置顶状态',
    required: true,
    schema: {
      type: 'object',
      properties: {
        isPinned: { type: 'boolean' },
      },
      required: ['isPinned'],
    },
  })
  @ApiResponse({ status: 200, description: '成功更新置顶状态' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async pinConversation(
    @Param('id') id: string,
    @Body('isPinned') isPinned: boolean,
  ): Promise<boolean> {
    return this.conversationService.pinConversation(id, isPinned);
  }

  /**
   * 设置免打扰
   */
  @Put(':id/mute')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '设置免打扰' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiBody({
    description: '免打扰状态',
    required: true,
    schema: {
      type: 'object',
      properties: {
        isMuted: { type: 'boolean' },
      },
      required: ['isMuted'],
    },
  })
  @ApiResponse({ status: 200, description: '成功更新免打扰状态' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async muteConversation(
    @Param('id') id: string,
    @Body('isMuted') isMuted: boolean,
  ): Promise<boolean> {
    return this.conversationService.muteConversation(id, isMuted);
  }

  @Put(':id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '清空未读消息数' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiResponse({ status: 200, description: '成功清空未读消息数' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async clearUnreadCount(@Param('id') id: string): Promise<boolean> {
    return this.conversationService.clearUnreadCount(id);
  }

  @Get('unread-total/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取未读消息总数' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取未读消息总数' })
  async getTotalUnreadCount(@Param('userId') userId: string): Promise<{ total: number }> {
    const total = await this.conversationService.getTotalUnreadCount(userId);
    return { total };
  }

  @Delete('batch')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '批量删除会话' })
  @ApiBody({
    description: '会话ID列表',
    required: true,
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({ status: 200, description: '成功批量删除会话' })
  async batchDeleteConversations(@Body('ids') ids: string[]): Promise<{ success: boolean; count: number }> {
    let count = 0;
    for (const id of ids) {
      const result = await this.conversationService.deleteConversation(id);
      if (result) count++;
    }
    return { success: true, count };
  }
}
