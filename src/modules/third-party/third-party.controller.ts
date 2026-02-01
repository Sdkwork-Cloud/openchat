import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ThirdPartyService } from './third-party.service';
import { ThirdPartyMessage } from './third-party-message.entity';

@ApiTags('third-party')
@Controller('third-party')
export class ThirdPartyController {
  constructor(private thirdPartyService: ThirdPartyService) {}

  @Post(':platform/messages')
  @ApiOperation({ summary: '发送第三方平台消息' })
  @ApiParam({ name: 'platform', description: '平台类型', enum: ['whatsapp', 'telegram', 'wechat', 'signal'] })
  @ApiBody({ description: '消息信息', required: true })
  @ApiResponse({ status: 201, description: '成功发送消息', type: ThirdPartyMessage })
  @ApiResponse({ status: 404, description: '平台不支持' })
  async sendMessage(
    @Param('platform') platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal',
    @Body() messageData: Omit<ThirdPartyMessage, 'id' | 'platform' | 'createdAt' | 'updatedAt'>
  ): Promise<ThirdPartyMessage> {
    return this.thirdPartyService.sendMessage(platform, messageData);
  }

  @Get(':platform/messages/:id/status')
  @ApiOperation({ summary: '获取第三方平台消息状态' })
  @ApiParam({ name: 'platform', description: '平台类型', enum: ['whatsapp', 'telegram', 'wechat', 'signal'] })
  @ApiParam({ name: 'id', description: '消息ID' })
  @ApiResponse({ status: 200, description: '成功获取消息状态' })
  @ApiResponse({ status: 404, description: '平台不支持' })
  async getMessageStatus(
    @Param('platform') platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal',
    @Param('id') messageId: string
  ): Promise<string> {
    return this.thirdPartyService.getMessageStatus(platform, messageId);
  }

  @Post(':platform/contacts/sync')
  @ApiOperation({ summary: '同步第三方平台联系人' })
  @ApiParam({ name: 'platform', description: '平台类型', enum: ['whatsapp', 'telegram', 'wechat', 'signal'] })
  @ApiBody({ description: '同步信息', required: true, schema: { type: 'object', properties: { userId: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: '成功同步联系人' })
  @ApiResponse({ status: 404, description: '平台不支持' })
  async syncContacts(
    @Param('platform') platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal',
    @Body('userId') userId: string
  ): Promise<any[]> {
    return this.thirdPartyService.syncContacts(platform, userId);
  }

  @Get(':platform/contacts')
  @ApiOperation({ summary: '获取第三方平台联系人' })
  @ApiParam({ name: 'platform', description: '平台类型', enum: ['whatsapp', 'telegram', 'wechat', 'signal'] })
  @ApiQuery({ name: 'userId', description: '用户ID' })
  @ApiQuery({ name: 'platformUserId', description: '平台用户ID' })
  @ApiResponse({ status: 200, description: '成功获取联系人' })
  @ApiResponse({ status: 404, description: '平台不支持' })
  async getContact(
    @Param('platform') platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal',
    @Query('userId') userId: string,
    @Query('platformUserId') platformUserId: string
  ): Promise<any | null> {
    return this.thirdPartyService.getContact(platform, userId, platformUserId);
  }
}