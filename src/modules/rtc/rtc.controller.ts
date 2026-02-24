import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { RTCService } from './rtc.service';
import { RTCRoom, RTCToken } from './rtc.interface';
import { RTCChannelEntity } from './rtc-channel.entity';
import { RTCVideoRecord } from './rtc-video-record.entity';

@ApiTags('rtc')
@Controller('rtc')
export class RTCController {
  constructor(private rtcService: RTCService) {}

  @Post('rooms')
  @ApiOperation({ summary: '创建RTC房间' })
  @ApiBody({ description: '房间信息', required: true, schema: { type: 'object', properties: { creatorId: { type: 'string' }, type: { type: 'string', enum: ['p2p', 'group'] }, participants: { type: 'array', items: { type: 'string' } }, name: { type: 'string' }, channelId: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: '成功创建RTC房间', type: RTCRoom })
  async createRoom(
    @Body('creatorId') creatorId: string,
    @Body('type') type: 'p2p' | 'group',
    @Body('participants') participants: string[],
    @Body('name') name?: string,
    @Body('channelId') channelId?: string,
  ): Promise<RTCRoom> {
    return this.rtcService.createRoom(creatorId, type, participants, name, channelId);
  }

  @Put('rooms/:id/end')
  @ApiOperation({ summary: '结束RTC房间' })
  @ApiParam({ name: 'id', description: '房间ID' })
  @ApiResponse({ status: 200, description: '成功结束RTC房间' })
  @ApiResponse({ status: 404, description: '房间不存在或已结束' })
  async endRoom(@Param('id') id: string): Promise<boolean> {
    return this.rtcService.endRoom(id);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: '获取RTC房间详情' })
  @ApiParam({ name: 'id', description: '房间ID' })
  @ApiResponse({ status: 200, description: '成功获取RTC房间详情', type: RTCRoom })
  @ApiResponse({ status: 404, description: '房间不存在' })
  async getRoomById(@Param('id') id: string): Promise<RTCRoom | null> {
    return this.rtcService.getRoomById(id);
  }

  @Get('rooms/user/:userId')
  @ApiOperation({ summary: '获取用户的RTC房间列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取用户的RTC房间列表', type: [RTCRoom] })
  async getRoomsByUserId(@Param('userId') userId: string): Promise<RTCRoom[]> {
    return this.rtcService.getRoomsByUserId(userId);
  }

  @Post('tokens')
  @ApiOperation({ summary: '生成RTC token' })
  @ApiBody({ description: 'Token信息', required: true, schema: { type: 'object', properties: { roomId: { type: 'string' }, userId: { type: 'string' }, channelId: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: '成功生成RTC token', type: RTCToken })
  @ApiResponse({ status: 400, description: '房间不存在或用户不在房间中' })
  async generateToken(
    @Body('roomId') roomId: string, 
    @Body('userId') userId: string,
    @Body('channelId') channelId?: string
  ): Promise<RTCToken> {
    return this.rtcService.generateToken(roomId, userId, channelId);
  }

  @Get('tokens/validate')
  @ApiOperation({ summary: '验证RTC token' })
  @ApiQuery({ name: 'token', description: 'RTC token' })
  @ApiResponse({ status: 200, description: '成功验证RTC token', type: RTCToken })
  @ApiResponse({ status: 401, description: 'Token无效或已过期' })
  async validateToken(@Query('token') token: string): Promise<RTCToken | null> {
    return this.rtcService.validateToken(token);
  }

  @Post('rooms/:id/participants')
  @ApiOperation({ summary: '添加RTC房间参与者' })
  @ApiParam({ name: 'id', description: '房间ID' })
  @ApiBody({ description: '参与者信息', required: true, schema: { type: 'object', properties: { userId: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: '成功添加RTC房间参与者' })
  @ApiResponse({ status: 404, description: '房间不存在或已结束' })
  async addParticipant(@Param('id') id: string, @Body('userId') userId: string): Promise<boolean> {
    return this.rtcService.addParticipant(id, userId);
  }

  @Delete('rooms/:id/participants/:userId')
  @ApiOperation({ summary: '移除RTC房间参与者' })
  @ApiParam({ name: 'id', description: '房间ID' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功移除RTC房间参与者' })
  @ApiResponse({ status: 404, description: '房间不存在或已结束' })
  async removeParticipant(@Param('id') id: string, @Param('userId') userId: string): Promise<boolean> {
    return this.rtcService.removeParticipant(id, userId);
  }

  // 新增：RTC Channel配置管理接口

  @Post('channels')
  @ApiOperation({ summary: '创建RTC Channel配置' })
  @ApiBody({ description: 'Channel配置', required: true, schema: { type: 'object', properties: { provider: { type: 'string' }, appId: { type: 'string' }, appKey: { type: 'string' }, appSecret: { type: 'string' }, region: { type: 'string' }, endpoint: { type: 'string' }, extraConfig: { type: 'object' } } } })
  @ApiResponse({ status: 201, description: '成功创建RTC Channel配置', type: RTCChannelEntity })
  async createChannel(
    @Body('provider') provider: string,
    @Body('appId') appId: string,
    @Body('appKey') appKey: string,
    @Body('appSecret') appSecret: string,
    @Body('region') region?: string,
    @Body('endpoint') endpoint?: string,
    @Body('extraConfig') extraConfig?: Record<string, any>
  ): Promise<RTCChannelEntity> {
    return this.rtcService.createChannel({
      provider,
      appId,
      appKey,
      appSecret,
      region,
      endpoint,
      extraConfig
    });
  }

  @Get('channels')
  @ApiOperation({ summary: '获取所有RTC Channel配置' })
  @ApiResponse({ status: 200, description: '成功获取所有RTC Channel配置', type: [RTCChannelEntity] })
  async getChannels(): Promise<RTCChannelEntity[]> {
    return this.rtcService.getChannels();
  }

  @Get('channels/:id')
  @ApiOperation({ summary: '获取单个RTC Channel配置' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: '成功获取单个RTC Channel配置', type: RTCChannelEntity })
  @ApiResponse({ status: 404, description: 'Channel不存在' })
  async getChannel(@Param('id') id: string): Promise<RTCChannelEntity | null> {
    return this.rtcService.getChannel(id);
  }

  @Put('channels/:id')
  @ApiOperation({ summary: '更新RTC Channel配置' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiBody({ description: 'Channel配置', required: true, schema: { type: 'object', properties: { provider: { type: 'string' }, appId: { type: 'string' }, appKey: { type: 'string' }, appSecret: { type: 'string' }, region: { type: 'string' }, endpoint: { type: 'string' }, extraConfig: { type: 'object' }, isActive: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: '成功更新RTC Channel配置', type: RTCChannelEntity })
  @ApiResponse({ status: 404, description: 'Channel不存在' })
  async updateChannel(
    @Param('id') id: string,
    @Body() config: Partial<RTCChannelEntity>
  ): Promise<RTCChannelEntity | null> {
    return this.rtcService.updateChannel(id, config);
  }

  @Delete('channels/:id')
  @ApiOperation({ summary: '删除RTC Channel配置' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: '成功删除RTC Channel配置' })
  @ApiResponse({ status: 404, description: 'Channel不存在' })
  async deleteChannel(@Param('id') id: string): Promise<boolean> {
    return this.rtcService.deleteChannel(id);
  }

  // 新增：视频记录相关API接口

  @Post('video-records')
  @ApiOperation({ summary: '创建视频记录' })
  @ApiBody({ description: '视频记录信息', required: true, schema: { type: 'object', properties: { roomId: { type: 'string' }, userId: { type: 'string' }, fileName: { type: 'string' }, filePath: { type: 'string' }, fileType: { type: 'string' }, fileSize: { type: 'number' }, startTime: { type: 'string', format: 'date-time' }, endTime: { type: 'string', format: 'date-time' }, status: { type: 'string', enum: ['recording', 'completed', 'failed', 'processing'] }, metadata: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: '成功创建视频记录', type: RTCVideoRecord })
  async createVideoRecord(
    @Body('roomId') roomId: string,
    @Body('fileName') fileName: string,
    @Body('filePath') filePath: string,
    @Body('fileType') fileType: string,
    @Body('fileSize') fileSize: number,
    @Body('startTime') startTime: Date,
    @Body('endTime') endTime: Date,
    @Body('userId') userId?: string,
    @Body('status') status?: 'recording' | 'completed' | 'failed' | 'processing',
    @Body('metadata') metadata?: string
  ): Promise<RTCVideoRecord> {
    return this.rtcService.createVideoRecord({
      roomId,
      userId,
      fileName,
      filePath,
      fileType,
      fileSize,
      startTime,
      endTime,
      status,
      metadata
    });
  }

  @Get('video-records/:id')
  @ApiOperation({ summary: '获取视频记录详情' })
  @ApiParam({ name: 'id', description: '视频记录ID' })
  @ApiResponse({ status: 200, description: '成功获取视频记录详情', type: RTCVideoRecord })
  @ApiResponse({ status: 404, description: '视频记录不存在' })
  async getVideoRecord(@Param('id') id: string): Promise<RTCVideoRecord | null> {
    return this.rtcService.getVideoRecord(id);
  }

  @Get('rooms/:roomId/video-records')
  @ApiOperation({ summary: '获取房间的视频记录列表' })
  @ApiParam({ name: 'roomId', description: '房间ID' })
  @ApiResponse({ status: 200, description: '成功获取房间的视频记录列表', type: [RTCVideoRecord] })
  async getVideoRecordsByRoomId(@Param('roomId') roomId: string): Promise<RTCVideoRecord[]> {
    return this.rtcService.getVideoRecordsByRoomId(roomId);
  }

  @Get('users/:userId/video-records')
  @ApiOperation({ summary: '获取用户的视频记录列表' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取用户的视频记录列表', type: [RTCVideoRecord] })
  async getVideoRecordsByUserId(@Param('userId') userId: string): Promise<RTCVideoRecord[]> {
    return this.rtcService.getVideoRecordsByUserId(userId);
  }

  @Put('video-records/:id/status')
  @ApiOperation({ summary: '更新视频记录状态' })
  @ApiParam({ name: 'id', description: '视频记录ID' })
  @ApiBody({ description: '状态信息', required: true, schema: { type: 'object', properties: { status: { type: 'string', enum: ['recording', 'completed', 'failed', 'processing'] }, errorMessage: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: '成功更新视频记录状态', type: RTCVideoRecord })
  @ApiResponse({ status: 404, description: '视频记录不存在' })
  async updateVideoRecordStatus(
    @Param('id') id: string,
    @Body('status') status: 'recording' | 'completed' | 'failed' | 'processing',
    @Body('errorMessage') errorMessage?: string
  ): Promise<RTCVideoRecord | null> {
    return this.rtcService.updateVideoRecordStatus(id, status, errorMessage);
  }

  @Put('video-records/:id/metadata')
  @ApiOperation({ summary: '更新视频记录元数据' })
  @ApiParam({ name: 'id', description: '视频记录ID' })
  @ApiBody({ description: '元数据信息', required: true, schema: { type: 'object', properties: { metadata: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: '成功更新视频记录元数据', type: RTCVideoRecord })
  @ApiResponse({ status: 404, description: '视频记录不存在' })
  async updateVideoRecordMetadata(
    @Param('id') id: string,
    @Body('metadata') metadata: string
  ): Promise<RTCVideoRecord | null> {
    return this.rtcService.updateVideoRecordMetadata(id, metadata);
  }

  @Delete('video-records/:id')
  @ApiOperation({ summary: '删除视频记录' })
  @ApiParam({ name: 'id', description: '视频记录ID' })
  @ApiResponse({ status: 200, description: '成功删除视频记录' })
  @ApiResponse({ status: 404, description: '视频记录不存在' })
  async deleteVideoRecord(@Param('id') id: string): Promise<boolean> {
    return this.rtcService.deleteVideoRecord(id);
  }

  @Get('video-records')
  @ApiOperation({ summary: '获取所有视频记录（分页）' })
  @ApiQuery({ name: 'limit', description: '每页数量', required: false, example: 50 })
  @ApiQuery({ name: 'offset', description: '偏移量', required: false, example: 0 })
  @ApiResponse({ status: 200, description: '成功获取所有视频记录', type: [RTCVideoRecord] })
  async getVideoRecords(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0
  ): Promise<RTCVideoRecord[]> {
    return this.rtcService.getVideoRecords(limit, offset);
  }
}
