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
  ForbiddenException,
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
import { ConversationUnreadService } from './conversation-unread.service';
import {
  Conversation,
  ConversationSyncStateBatchResult,
  ConversationSyncTarget,
  ConversationSyncState,
  DeviceReadCursorSummaryResult,
  CreateConversationRequest,
  UpdateConversationRequest,
} from './conversation.interface';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/auth/interfaces/authenticated-request.interface';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationController {
  constructor(
    private conversationService: ConversationService,
    private conversationUnreadService: ConversationUnreadService,
  ) {}

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
        targetId: { type: 'string' },
      },
      required: ['type', 'targetId'],
    },
  })
  @ApiResponse({ status: 201, description: '成功创建会话', type: Conversation })
  @ApiResponse({ status: 400, description: '会话已存在' })
  async createConversation(
    @Body() request: Omit<CreateConversationRequest, 'userId'> & { userId?: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<Conversation> {
    if (request.userId && request.userId !== req.auth.userId) {
      throw new ForbiddenException('Cannot create conversation for another user');
    }

    return this.conversationService.createConversation({
      ...request,
      userId: req.auth.userId,
    });
  }

  /**
   * 获取会话详情
   */
  @Get(':id(\\d+)')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取会话详情' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiResponse({ status: 200, description: '成功获取会话详情', type: Conversation })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async getConversationById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Conversation | null> {
    return this.conversationService.getConversationByIdForUser(id, req.auth.userId);
  }

  /**
   * 获取用户的会话列表
   */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取用户的会话列表' })
  @ApiQuery({ name: 'type', description: '会话类型', required: false, enum: ['single', 'group'] })
  @ApiQuery({ name: 'isPinned', description: '是否置顶', required: false })
  @ApiQuery({ name: 'limit', description: '限制数量', required: false })
  @ApiQuery({ name: 'offset', description: '偏移量', required: false })
  @ApiResponse({ status: 200, description: '成功获取会话列表', type: [Conversation] })
  async getConversationsByUserId(
    @Request() req: AuthenticatedRequest,
    @Query('type') type?: 'single' | 'group',
    @Query('isPinned') isPinned?: boolean,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<Conversation[]> {
    return this.conversationService.getConversationsByUserId({
      userId: req.auth.userId,
      type,
      isPinned,
      limit,
      offset,
    });
  }

  /**
   * 获取会话同步状态（用于 SDK 增量同步）
   */
  @Get('sync-state')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取会话同步状态' })
  @ApiQuery({ name: 'targetId', description: '目标ID（用户ID或群组ID）', required: true })
  @ApiQuery({ name: 'type', description: '会话类型', required: true, enum: ['single', 'group'] })
  @ApiQuery({ name: 'deviceId', description: '设备ID（可选，用于多端独立同步游标）', required: false })
  @ApiResponse({ status: 200, description: '成功获取会话同步状态' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async getConversationSyncState(
    @Query('targetId') targetId: string,
    @Query('type') type: 'single' | 'group',
    @Request() req: AuthenticatedRequest,
    @Query('deviceId') deviceId?: string,
  ): Promise<ConversationSyncState | null> {
    const effectiveDeviceId = this.resolveEffectiveDeviceId(req.auth.deviceId, deviceId);
    if (effectiveDeviceId) {
      return this.conversationService.getConversationSyncStateForUser(
        req.auth.userId,
        targetId,
        type,
        { deviceId: effectiveDeviceId },
      );
    }

    return this.conversationService.getConversationSyncStateForUser(req.auth.userId, targetId, type);
  }

  /**
   * 批量获取会话同步状态
   */
  @Post('sync-state/batch')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '批量获取会话同步状态' })
  @ApiBody({
    description: '会话目标列表',
    required: true,
    schema: {
      type: 'object',
      properties: {
        conversations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              targetId: { type: 'string' },
              type: { type: 'string', enum: ['single', 'group'] },
            },
            required: ['targetId', 'type'],
          },
        },
        deviceId: { type: 'string' },
      },
      required: ['conversations'],
    },
  })
  @ApiResponse({ status: 200, description: '成功获取会话同步状态' })
  async getConversationSyncStates(
    @Body('conversations') conversations: ConversationSyncTarget[],
    @Request() req: AuthenticatedRequest,
    @Body('deviceId') deviceId?: string,
  ): Promise<ConversationSyncStateBatchResult> {
    const effectiveDeviceId = this.resolveEffectiveDeviceId(req.auth.deviceId, deviceId);
    if (effectiveDeviceId) {
      return this.conversationService.getConversationSyncStatesForUser(
        req.auth.userId,
        conversations || [],
        { deviceId: effectiveDeviceId },
      );
    }

    return this.conversationService.getConversationSyncStatesForUser(req.auth.userId, conversations || []);
  }

  /**
   * 删除指定设备的会话读游标（设备登出/失效清理）
   */
  @Delete('sync-state/device/:deviceId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除设备会话读游标' })
  @ApiParam({ name: 'deviceId', description: '设备ID' })
  @ApiResponse({ status: 200, description: '成功删除设备会话读游标' })
  async deleteDeviceSyncState(
    @Param('deviceId') deviceId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; deleted: number }> {
    const effectiveDeviceId = this.resolveEffectiveDeviceId(req.auth.deviceId, deviceId);
    if (!effectiveDeviceId) {
      throw new ForbiddenException('deviceId must be bound to authenticated token');
    }

    const deleted = await this.conversationService.deleteDeviceReadCursorsForUser(
      req.auth.userId,
      effectiveDeviceId,
    );
    return { success: true, deleted };
  }

  /**
   * 获取设备游标摘要（用于设备管理/观测）
   */
  @Get('sync-state/devices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取设备会话游标摘要' })
  @ApiQuery({ name: 'limit', description: '返回设备数量上限，默认 100，最大 200', required: false })
  @ApiResponse({ status: 200, description: '成功获取设备会话游标摘要' })
  async getDeviceSyncStateSummaries(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit: number = 100,
  ): Promise<DeviceReadCursorSummaryResult> {
    return this.conversationService.getDeviceReadCursorSummariesForUser(req.auth.userId, limit);
  }

  /**
   * 清理长时间不活跃设备游标
   */
  @Delete('sync-state/devices/stale')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '清理失活设备会话游标' })
  @ApiQuery({ name: 'inactiveDays', description: '按最后活跃时间清理阈值（天），默认 90', required: false })
  @ApiResponse({ status: 200, description: '成功清理失活设备会话游标' })
  async deleteStaleDeviceSyncStates(
    @Request() req: AuthenticatedRequest,
    @Query('inactiveDays') inactiveDays: number = 90,
  ): Promise<{ success: boolean; deleted: number; inactiveDays: number }> {
    const deleted = await this.conversationService.deleteStaleDeviceReadCursorsForUser(
      req.auth.userId,
      inactiveDays,
    );
    return { success: true, deleted, inactiveDays };
  }

  /**
   * 获取用户与特定目标的会话
   */
  @Get('target/:targetId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取用户与特定目标的会话' })
  @ApiParam({ name: 'targetId', description: '目标ID' })
  @ApiQuery({ name: 'type', description: '会话类型', required: true, enum: ['single', 'group'] })
  @ApiResponse({ status: 200, description: '成功获取会话', type: Conversation })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async getConversationByTarget(
    @Param('targetId') targetId: string,
    @Query('type') type: 'single' | 'group',
    @Request() req: AuthenticatedRequest,
  ): Promise<Conversation | null> {
    return this.conversationService.getConversationByTarget(req.auth.userId, targetId, type);
  }

  /**
   * 更新会话
   */
  @Put(':id(\\d+)')
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
    @Request() req: AuthenticatedRequest,
  ): Promise<Conversation | null> {
    return this.conversationService.updateConversationForUser(id, req.auth.userId, request);
  }

  /**
   * 删除会话
   */
  @Delete(':id(\\d+)')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除会话' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiResponse({ status: 200, description: '成功删除会话' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async deleteConversation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<boolean> {
    return this.conversationService.deleteConversationForUser(id, req.auth.userId);
  }

  /**
   * 置顶/取消置顶会话
   */
  @Put(':id(\\d+)/pin')
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
    @Request() req: AuthenticatedRequest,
  ): Promise<boolean> {
    return this.conversationService.pinConversationForUser(id, req.auth.userId, isPinned);
  }

  /**
   * 设置免打扰
   */
  @Put(':id(\\d+)/mute')
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
    @Request() req: AuthenticatedRequest,
  ): Promise<boolean> {
    return this.conversationService.muteConversationForUser(id, req.auth.userId, isMuted);
  }

  @Put(':id(\\d+)/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '清空未读消息数' })
  @ApiParam({ name: 'id', description: '会话ID' })
  @ApiResponse({ status: 200, description: '成功清空未读消息数' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async clearUnreadCount(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<boolean> {
    const conversation = await this.conversationService.getConversationByIdForUser(id, req.auth.userId);
    if (!conversation) {
      return false;
    }

    return this.conversationUnreadService.clearUnreadCount(conversation.id);
  }

  @Get('unread-total/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取未读消息总数' })
  @ApiResponse({ status: 200, description: '成功获取未读消息总数' })
  async getTotalUnreadCount(@Request() req: AuthenticatedRequest): Promise<{ total: number }> {
    const total = await this.conversationService.getTotalUnreadCount(req.auth.userId);
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
  async batchDeleteConversations(
    @Body('ids') ids: string[],
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; count: number }> {
    const count = await this.conversationService.batchDeleteConversationsForUser(ids, req.auth.userId);
    return { success: true, count };
  }

  private resolveEffectiveDeviceId(
    authenticatedDeviceId?: string,
    requestedDeviceId?: string,
  ): string | undefined {
    const trusted = this.normalizeDeviceIdCandidate(authenticatedDeviceId);
    const requested = this.normalizeDeviceIdCandidate(requestedDeviceId);

    if (requested && !trusted) {
      throw new ForbiddenException('deviceId must be bound to authenticated token');
    }

    if (trusted && requested && trusted !== requested) {
      throw new ForbiddenException('deviceId does not match authenticated device');
    }

    return trusted;
  }

  private normalizeDeviceIdCandidate(candidate?: string): string | undefined {
    if (!candidate) {
      return undefined;
    }

    const normalized = candidate.trim();
    if (!normalized) {
      return undefined;
    }

    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(normalized)) {
      return undefined;
    }

    return normalized;
  }
}
