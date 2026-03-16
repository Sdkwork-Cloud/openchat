import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { createHash } from 'crypto';
import { AuthenticatedRequest } from '../../common/auth/interfaces/authenticated-request.interface';
import {
  ConversationSeqAckBatchResult,
  ConversationSeqAckResult,
  MessageHistoryBySeqResult,
  MessageReceiptListResult,
  MessageReadMembersResult,
  MessageReceiptSummaryResult,
  MessageService,
  MessageUnreadMembersResult,
} from './message.service';
import {
  MessageReactionService,
  MessageReactionSummaryResult,
} from './message-reaction.service';
import { type ReceiptStatus } from './message-receipt.service';
import {
  MessageDispatchEventType,
  buildMessageEventPayload,
} from './message-event-envelope.util';
import { Message, MessageType as DomainMessageType, MessageStatus, SendMessageResult } from './message.interface';
import { MessageEventStateKey } from './message-state.util';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import {
  SendMessage,
  BatchSendMessage,
  EditMessage,
  UpdateMessageStatus,
  MarkMessagesRead,
  SetMessageReaction,
  GetMessagesQuery,
  ForwardMessage,
  GetMessageReadMembersQuery,
  MessageReadMembersResponse,
  MessageUnreadMembersResponse,
  GetMessageReceiptsQuery,
  GetMessageUnreadMembersQuery,
  GetMessageHistoryBySeqQuery,
  AckConversationSeqRequest,
  AckConversationSeqBatchRequest,
} from './dto/message.dto';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(
    private messageService: MessageService,
    private readonly messageReactionService: MessageReactionService,
  ) {}

  @Post()
  @ApiOperation({ summary: '发送消息' })
  @ApiResponse({ status: 201, description: '成功发送消息' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async sendMessage(
    @Body() messageData: SendMessage,
    @Request() req: AuthenticatedRequest,
  ): Promise<SendMessageResult> {
    if (messageData.fromUserId && messageData.fromUserId !== req.auth.userId) {
      throw new ForbiddenException('Cannot send message for another user');
    }

    const normalized = this.normalizeSendMessagePayload(
      messageData,
      req.auth.userId,
      this.resolveIdempotencyKeyFromRequest(req),
    );

    const result = await this.messageService.sendMessage(normalized);
    return this.attachDispatchEnvelope(result);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量发送消息' })
  @ApiResponse({ status: 201, description: '成功批量发送消息' })
  async batchSendMessages(
    @Body() batchData: BatchSendMessage,
    @Request() req: AuthenticatedRequest,
  ): Promise<SendMessageResult[]> {
    const requestIdempotencyKey = this.resolveIdempotencyKeyFromRequest(req);
    const normalizedMessages = batchData.messages.map((msg, index) => {
      if (msg.fromUserId && msg.fromUserId !== req.auth.userId) {
        throw new ForbiddenException('Cannot send message for another user');
      }

      return this.normalizeSendMessagePayload(
        msg,
        req.auth.userId,
        requestIdempotencyKey,
        index,
      );
    });

    const batchResult = await this.messageService.sendMessageBatch(normalizedMessages);
    return batchResult.results.map((result) => this.attachDispatchEnvelope(result));
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户消息列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取用户消息列表' })
  async getMessagesByUserId(
    @Param('userId') userId: string,
    @Query() query: GetMessagesQuery,
    @Request() req: AuthenticatedRequest,
  ): Promise<Message[]> {
    if (userId !== req.auth.userId) {
      throw new ForbiddenException('Cannot read messages of another user');
    }
    return this.messageService.getMessagesByUserId(userId, {
      limit: query.limit,
      offset: query.offset,
      fromSeq: query.fromSeq,
      toSeq: query.toSeq,
      direction: query.direction,
    });
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: '获取群组消息列表' })
  @ApiParam({ name: 'groupId', description: '群组ID' })
  @ApiResponse({ status: 200, description: '成功获取群组消息列表' })
  async getMessagesByGroupId(
    @Param('groupId') groupId: string,
    @Query() query: GetMessagesQuery,
    @Request() req: AuthenticatedRequest,
  ): Promise<Message[]> {
    const isMember = await this.messageService.isUserInGroup(groupId, req.auth.userId);
    if (!isMember) {
      throw new ForbiddenException('Cannot read messages of a group you have not joined');
    }
    return this.messageService.getMessagesByGroupId(groupId, {
      limit: query.limit,
      offset: query.offset,
      fromSeq: query.fromSeq,
      toSeq: query.toSeq,
      direction: query.direction,
    });
  }

  @Get('history/seq')
  @ApiOperation({ summary: '按序列号增量拉取会话消息' })
  @ApiResponse({ status: 200, description: '成功拉取消息历史' })
  async getMessageHistoryBySeq(
    @Query() query: GetMessageHistoryBySeqQuery,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageHistoryBySeqResult> {
    const conversationType: 'single' | 'group' = query.type === 'group' ? 'group' : 'single';
    return this.messageService.getMessageHistoryBySeq(
      req.auth.userId,
      query.targetId,
      conversationType,
      {
        limit: query.limit,
        fromSeq: query.fromSeq,
        toSeq: query.toSeq,
        direction: query.direction,
        includeMissingSeqs: query.includeMissingSeqs,
      },
    );
  }

  @Post('sync/ack-seq')
  @ApiOperation({ summary: '确认会话同步序列（支持设备维度）' })
  @ApiResponse({ status: 200, description: '成功确认会话同步序列' })
  async ackConversationSeq(
    @Body() body: AckConversationSeqRequest,
    @Request() req: AuthenticatedRequest,
  ): Promise<ConversationSeqAckResult> {
    const type: 'single' | 'group' = body.type === 'group' ? 'group' : 'single';
    const effectiveDeviceId = this.resolveEffectiveDeviceId(req.auth.deviceId, body.deviceId);

    if (effectiveDeviceId) {
      return this.messageService.ackConversationSeq(
        req.auth.userId,
        {
          targetId: body.targetId,
          type,
          ackSeq: body.ackSeq,
        },
        { deviceId: effectiveDeviceId },
      );
    }

    return this.messageService.ackConversationSeq(req.auth.userId, {
      targetId: body.targetId,
      type,
      ackSeq: body.ackSeq,
    });
  }

  @Post('sync/ack-seq/batch')
  @ApiOperation({ summary: '批量确认会话同步序列（支持设备维度）' })
  @ApiResponse({ status: 200, description: '成功批量确认会话同步序列' })
  async ackConversationSeqBatch(
    @Body() body: AckConversationSeqBatchRequest,
    @Request() req: AuthenticatedRequest,
  ): Promise<ConversationSeqAckBatchResult> {
    const items: Array<{ targetId: string; type: 'single' | 'group'; ackSeq: number }> = (
      body.items || []
    ).map((item) => ({
      targetId: item.targetId,
      type: item.type === 'group' ? 'group' : 'single',
      ackSeq: item.ackSeq,
    }));

    const effectiveDeviceId = this.resolveEffectiveDeviceId(req.auth.deviceId, body.deviceId);
    if (effectiveDeviceId) {
      return this.messageService.ackConversationSeqBatch(
        req.auth.userId,
        items,
        { deviceId: effectiveDeviceId },
      );
    }

    return this.messageService.ackConversationSeqBatch(req.auth.userId, items);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取消息详情' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功获取消息详情' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  async getMessageById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<Message | null> {
    const canAccess = await this.messageService.canUserAccessMessage(req.auth.userId, id);
    if (!canAccess) {
      throw new ForbiddenException('Cannot read message that does not belong to you');
    }
    return this.messageService.getMessageById(id);
  }

  @Get(':id/receipts')
  @ApiOperation({ summary: '获取消息回执详情' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功获取消息回执详情' })
  async getMessageReceipts(
    @Param('id') id: string,
    @Query() query: GetMessageReceiptsQuery,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageReceiptListResult> {
    return this.messageService.getMessageReceipts(req.auth.userId, id, {
      limit: query.limit,
      offset: query.offset,
      status: query.status as ReceiptStatus | undefined,
    });
  }

  @Get(':id/receipt-summary')
  @ApiOperation({ summary: '获取消息回执统计' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功获取消息回执统计' })
  async getMessageReceiptSummary(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageReceiptSummaryResult> {
    return this.messageService.getMessageReceiptSummary(req.auth.userId, id);
  }

  @Get(':id/unread-members')
  @ApiOperation({ summary: '获取群消息未读成员列表' })
  @ApiParam({ name: 'id', description: '消息ID（仅群消息）' })
  @ApiResponse({ status: 200, description: '成功获取群消息未读成员列表', type: MessageUnreadMembersResponse })
  async getGroupMessageUnreadMembers(
    @Param('id') id: string,
    @Query() query: GetMessageUnreadMembersQuery,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageUnreadMembersResult> {
    return this.messageService.getGroupMessageUnreadMembers(req.auth.userId, id, {
      limit: query.limit,
      offset: query.offset,
      cursor: query.cursor,
    });
  }

  @Get(':id/read-members')
  @ApiOperation({ summary: '获取群消息已读成员列表' })
  @ApiParam({ name: 'id', description: '消息ID（仅群消息）' })
  @ApiResponse({ status: 200, description: '成功获取群消息已读成员列表', type: MessageReadMembersResponse })
  async getGroupMessageReadMembers(
    @Param('id') id: string,
    @Query() query: GetMessageReadMembersQuery,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageReadMembersResult> {
    return this.messageService.getGroupMessageReadMembers(req.auth.userId, id, {
      limit: query.limit,
      offset: query.offset,
      cursor: query.cursor,
    });
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新消息状态' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功更新消息状态' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  async updateMessageStatus(
    @Param('id') id: string,
    @Body() body: UpdateMessageStatus,
    @Request() req: AuthenticatedRequest,
  ): Promise<boolean> {
    const isSender = await this.messageService.isMessageSender(req.auth.userId, id);
    if (!isSender) {
      throw new ForbiddenException('Only sender can update message status');
    }
    return this.messageService.updateMessageStatus(id, this.normalizeMessageStatus(body.status));
  }

  @Put(':id/content')
  @ApiOperation({ summary: '编辑消息内容' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功编辑消息' })
  async editMessage(
    @Param('id') id: string,
    @Body() body: EditMessage,
    @Request() req: AuthenticatedRequest,
  ): Promise<SendMessageResult> {
    return this.messageService.editMessage(id, req.auth.userId, {
      content: body.content,
      extra: body.extra,
    });
  }

  @Get(':id/reactions')
  @ApiOperation({ summary: '获取消息反应汇总' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功获取消息反应汇总' })
  async getMessageReactionSummary(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageReactionSummaryResult> {
    return this.messageReactionService.getReactionSummary(id, req.auth.userId);
  }

  @Put(':id/reactions')
  @ApiOperation({ summary: '设置消息反应' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功更新消息反应' })
  async setMessageReaction(
    @Param('id') id: string,
    @Body() body: SetMessageReaction,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageReactionSummaryResult> {
    return this.messageReactionService.setReaction(
      id,
      req.auth.userId,
      body.emoji,
      body.active ?? true,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除消息' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功删除消息' })
  async deleteMessage(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<boolean> {
    const isSender = await this.messageService.isMessageSender(req.auth.userId, id);
    if (!isSender) {
      throw new ForbiddenException('Only sender can delete message');
    }
    return this.messageService.deleteMessage(id);
  }

  @Post('group/:groupId/read')
  @ApiOperation({ summary: '标记群消息为已读' })
  @ApiParam({ name: 'groupId', description: '群组ID' })
  @ApiResponse({ status: 200, description: '成功标记群消息为已读' })
  async markGroupMessagesAsRead(
    @Param('groupId') groupId: string,
    @Body() body: MarkMessagesRead,
    @Request() req: AuthenticatedRequest,
  ): Promise<boolean> {
    const isMember = await this.messageService.isUserInGroup(groupId, req.auth.userId);
    if (!isMember) {
      throw new ForbiddenException('Cannot update read status in a group you have not joined');
    }
    return this.messageService.markGroupMessagesAsRead(req.auth.userId, groupId, body.messageIds);
  }

  @Post(':userId/read')
  @ApiOperation({ summary: '标记消息为已读' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功标记消息为已读' })
  async markMessagesAsRead(
    @Param('userId') userId: string,
    @Body() body: MarkMessagesRead,
    @Request() req: AuthenticatedRequest,
  ): Promise<boolean> {
    if (userId !== req.auth.userId) {
      throw new ForbiddenException('Cannot update another user read status');
    }
    return this.messageService.markMessagesAsRead(userId, body.messageIds);
  }

  @Post(':id/recall')
  @ApiOperation({ summary: '撤回消息' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功撤回消息' })
  @ApiResponse({ status: 400, description: '撤回失败' })
  async recallMessage(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; error?: string }> {
    return this.messageService.recallMessage(id, req.auth.userId);
  }

  @Post(':id/forward')
  @ApiOperation({ summary: '转发消息' })
  @ApiParam({ name: 'id', description: '原消息ID' })
  @ApiResponse({ status: 200, description: '成功转发消息' })
  async forwardMessage(
    @Param('id') id: string,
    @Body() body: ForwardMessage,
    @Request() req: AuthenticatedRequest,
  ): Promise<SendMessageResult[]> {
    const results: SendMessageResult[] = [];

    for (const toUserId of body.toUserIds || []) {
      const result = await this.messageService.forwardMessage(id, req.auth.userId, toUserId, undefined);
      results.push(result);
    }

    for (const toGroupId of body.toGroupIds || []) {
      const result = await this.messageService.forwardMessage(id, req.auth.userId, undefined, toGroupId);
      results.push(result);
    }

    return results;
  }

  @Post(':id/retry')
  @ApiOperation({ summary: '重试发送失败的消息' })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功重试发送' })
  async retryFailedMessage(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<SendMessageResult> {
    const isSender = await this.messageService.isMessageSender(req.auth.userId, id);
    if (!isSender) {
      throw new ForbiddenException('Only sender can retry failed message');
    }
    return this.messageService.retryFailedMessage(id);
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

  private normalizeSendMessagePayload(
    messageData: SendMessage,
    authenticatedUserId: string,
    requestIdempotencyKey?: string,
    batchIndex?: number,
  ): Parameters<MessageService['sendMessage']>[0] {
    const { idempotencyKey, ...rest } = messageData;
    const normalizedExplicitKey = this.normalizeIdempotencyKey(idempotencyKey);
    const normalizedRequestKey = this.normalizeIdempotencyKey(requestIdempotencyKey);
    const deduplicationKey = normalizedExplicitKey
      ?? (normalizedRequestKey
        ? (batchIndex === undefined ? normalizedRequestKey : `${normalizedRequestKey}:${batchIndex}`)
        : undefined);
    const rawClientSeq = rest.clientSeq;
    const explicitClientSeq = Number.isInteger(rawClientSeq) && (rawClientSeq as number) >= 0
      ? rawClientSeq
      : undefined;
    const derivedClientSeq = explicitClientSeq
      ?? this.deriveClientSeqFromIdempotencyKey(
        authenticatedUserId,
        rest.toUserId,
        rest.groupId,
        deduplicationKey,
      );

    return {
      ...rest,
      type: this.normalizeMessageType(rest.type),
      fromUserId: authenticatedUserId,
      ...(derivedClientSeq !== undefined ? { clientSeq: derivedClientSeq } : {}),
    };
  }

  private resolveIdempotencyKeyFromRequest(req: AuthenticatedRequest): string | undefined {
    const standardHeader = this.extractHeaderValue(req.headers?.['idempotency-key']);
    return this.normalizeIdempotencyKey(standardHeader);
  }

  private extractHeaderValue(raw?: string | string[]): string | undefined {
    if (!raw) {
      return undefined;
    }

    if (Array.isArray(raw)) {
      return raw.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
    }

    return raw.trim() || undefined;
  }

  private normalizeIdempotencyKey(key?: string): string | undefined {
    if (!key || typeof key !== 'string') {
      return undefined;
    }

    const normalized = key.trim();
    if (!normalized) {
      return undefined;
    }

    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(normalized)) {
      return undefined;
    }

    return normalized;
  }

  private deriveClientSeqFromIdempotencyKey(
    userId: string,
    toUserId?: string,
    groupId?: string,
    idempotencyKey?: string,
  ): number | undefined {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    if (!normalizedKey) {
      return undefined;
    }

    const scope = groupId ? `group:${groupId}` : `single:${toUserId || ''}`;
    const hashHex = createHash('sha256')
      .update(`${userId}:${scope}:${normalizedKey}`)
      .digest('hex');
    const primary = Number.parseInt(hashHex.slice(0, 13), 16);
    if (Number.isSafeInteger(primary) && primary >= 0) {
      return primary;
    }
    return Number.parseInt(hashHex.slice(0, 12), 16);
  }

  private attachDispatchEnvelope(result: SendMessageResult): SendMessageResult {
    const eventType: MessageDispatchEventType = result.success
      ? 'messageSent'
      : 'messageFailed';
    const stateKey = this.resolveDispatchStateKey(result);
    return buildMessageEventPayload(eventType, result, {
      status: stateKey,
      identity: {
        serverMessageId: result.message?.id,
        messageId: result.message?.id,
        status: result.success ? (result.isDuplicate ? 'duplicate' : 'sent') : 'failed',
        stableKey: result.message?.uuid || result.errorCode || result.error,
      },
    });
  }

  private resolveDispatchStateKey(result: SendMessageResult): MessageEventStateKey {
    if (!result.success) {
      return MessageStatus.FAILED;
    }

    return result.isDuplicate ? 'duplicate' : MessageStatus.SENT;
  }

  private normalizeMessageType(type: SendMessage['type']): Message['type'] {
    switch (type) {
      case 'text':
        return DomainMessageType.TEXT;
      case 'image':
        return DomainMessageType.IMAGE;
      case 'audio':
        return DomainMessageType.AUDIO;
      case 'video':
        return DomainMessageType.VIDEO;
      case 'file':
        return DomainMessageType.FILE;
      case 'location':
        return DomainMessageType.LOCATION;
      case 'card':
        return DomainMessageType.CARD;
      case 'custom':
        return DomainMessageType.CUSTOM;
      case 'system':
        return DomainMessageType.SYSTEM;
      case 'music':
        return DomainMessageType.MUSIC;
      case 'document':
        return DomainMessageType.DOCUMENT;
      case 'code':
        return DomainMessageType.CODE;
      case 'ppt':
        return DomainMessageType.PPT;
      case 'character':
        return DomainMessageType.CHARACTER;
      case 'model_3d':
        return DomainMessageType.MODEL_3D;
      default:
        throw new BadRequestException('Invalid message type');
    }
  }

  private normalizeMessageStatus(status: UpdateMessageStatus['status']): MessageStatus {
    switch (status) {
      case 'sending':
        return MessageStatus.SENDING;
      case 'sent':
        return MessageStatus.SENT;
      case 'delivered':
        return MessageStatus.DELIVERED;
      case 'read':
        return MessageStatus.READ;
      case 'failed':
        return MessageStatus.FAILED;
      case 'recalled':
        return MessageStatus.RECALLED;
      default:
        throw new BadRequestException('Invalid message status');
    }
  }
}
