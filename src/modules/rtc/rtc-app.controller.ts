import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { hasAdminAccess } from '../../common/auth/admin-access.util';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { UserEntity } from '../user/entities/user.entity';
import {
  AddRtcParticipantDto,
  CreateRtcRoomDto,
  CreateRtcVideoRecordDto,
  GenerateRtcTokenDto,
  ListRtcVideoRecordQueryDto,
  RtcProviderCapabilitiesResponseDto,
  RtcProviderOperationErrorDto,
  RtcTokenValidationResultDto,
  StartRtcRecordingDto,
  StopRtcRecordingDto,
  SyncRtcVideoRecordDto,
  UpdateRtcVideoRecordMetadataDto,
  UpdateRtcVideoRecordStatusDto,
  ValidateRtcTokenDto,
} from './dto/rtc.dto';
import { RTCRoom, RTCToken } from './rtc.interface';
import { RTCService } from './rtc.service';
import { RTCVideoRecord } from './rtc-video-record.entity';

@ApiTags('rtc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rtc')
export class RtcAppController {
  constructor(private readonly rtcService: RTCService) {}

  @Post('rooms')
  @ApiOperation({ summary: 'Create RTC room' })
  @ApiBody({ type: CreateRtcRoomDto })
  @ApiResponse({ status: 201, description: 'Room created', type: RTCRoom })
  @ApiResponse({
    status: 400,
    description: 'Provider routing conflict or provider failure',
    type: RtcProviderOperationErrorDto,
  })
  async createRoom(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateRtcRoomDto,
  ): Promise<RTCRoom> {
    return this.rtcService.createRoom(
      user.id,
      dto.type,
      dto.participants,
      dto.name,
      dto.channelId,
      dto.provider,
      dto.aiMetadata,
    );
  }

  @Put('rooms/:id/end')
  @ApiOperation({ summary: 'End RTC room' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  async endRoom(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<boolean> {
    return this.rtcService.endRoom(id, user.id);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get RTC room detail' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, type: RTCRoom })
  async getRoomById(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<RTCRoom | null> {
    const room = await this.rtcService.getRoomById(id);
    if (!room) {
      return null;
    }
    if (!room.participants.includes(user.id)) {
      throw new ForbiddenException('No permission to view this room');
    }
    return room;
  }

  @Get('rooms/user/:userId')
  @ApiOperation({ summary: 'Get user RTC rooms' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, type: [RTCRoom] })
  async getRoomsByUserId(
    @CurrentUser() user: UserEntity,
    @Param('userId') userId: string,
  ): Promise<RTCRoom[]> {
    if (user.id !== userId) {
      throw new ForbiddenException('No permission to query other user rooms');
    }
    return this.rtcService.getRoomsByUserId(userId);
  }

  @Post('tokens')
  @ApiOperation({ summary: 'Generate RTC token' })
  @ApiBody({ type: GenerateRtcTokenDto })
  @ApiResponse({ status: 201, type: RTCToken })
  @ApiResponse({
    status: 400,
    description: 'Provider routing conflict or provider failure',
    type: RtcProviderOperationErrorDto,
  })
  async generateToken(
    @CurrentUser() user: UserEntity,
    @Body() dto: GenerateRtcTokenDto,
  ): Promise<RTCToken> {
    const targetUserId = dto.userId || user.id;
    if (targetUserId !== user.id) {
      throw new ForbiddenException(
        'No permission to generate token for other users',
      );
    }
    return this.rtcService.generateToken(
      dto.roomId,
      targetUserId,
      dto.channelId,
      dto.provider,
      dto.role,
      dto.expireSeconds,
    );
  }

  @Post('tokens/validate')
  @ApiOperation({ summary: 'Validate RTC token (POST body, standard)' })
  @ApiBody({ type: ValidateRtcTokenDto })
  @ApiOkResponse({ type: RtcTokenValidationResultDto })
  async validateToken(
    @CurrentUser() user: UserEntity,
    @Body() dto: ValidateRtcTokenDto,
  ): Promise<RtcTokenValidationResultDto> {
    return this.validateTokenForUser(user, dto.token);
  }

  @Post('rooms/:id/participants')
  @ApiOperation({ summary: 'Add room participant (creator only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiBody({ type: AddRtcParticipantDto })
  async addParticipant(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() dto: AddRtcParticipantDto,
  ): Promise<boolean> {
    return this.rtcService.addParticipant(id, dto.userId, user.id);
  }

  @Delete('rooms/:id/participants/:userId')
  @ApiOperation({ summary: 'Remove room participant (creator or self)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiParam({ name: 'userId', description: 'Participant user ID' })
  async removeParticipant(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<boolean> {
    return this.rtcService.removeParticipant(id, userId, user.id);
  }

  @Get('providers/capabilities')
  @ApiOperation({ summary: 'Get RTC provider capabilities for SDK dynamic integration' })
  @ApiResponse({ status: 200, type: RtcProviderCapabilitiesResponseDto })
  async getProviderCapabilities(): Promise<RtcProviderCapabilitiesResponseDto> {
    return this.rtcService.getProviderCapabilities();
  }

  @Post('rooms/:roomId/recordings/start')
  @ApiOperation({ summary: 'Start cloud recording task for a room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiBody({ type: StartRtcRecordingDto })
  async startRoomRecording(
    @CurrentUser() user: UserEntity,
    @Param('roomId') roomId: string,
    @Body() dto: StartRtcRecordingDto,
  ): Promise<RTCVideoRecord> {
    await this.assertRoomParticipant(roomId, user.id);
    return this.rtcService.startRoomRecording(roomId, user.id, {
      taskId: dto.taskId,
      metadata: dto.metadata,
    });
  }

  @Post('rooms/:roomId/recordings/stop')
  @ApiOperation({ summary: 'Stop cloud recording task for a room' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiBody({ type: StopRtcRecordingDto })
  async stopRoomRecording(
    @CurrentUser() user: UserEntity,
    @Param('roomId') roomId: string,
    @Body() dto: StopRtcRecordingDto,
  ): Promise<RTCVideoRecord | null> {
    await this.assertRoomParticipant(roomId, user.id);
    return this.rtcService.stopRoomRecording(roomId, user.id, {
      recordId: dto.recordId,
      taskId: dto.taskId,
      metadata: dto.metadata,
    });
  }

  @Post('video-records')
  @ApiOperation({ summary: 'Create RTC video record' })
  @ApiBody({ type: CreateRtcVideoRecordDto })
  async createVideoRecord(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateRtcVideoRecordDto,
  ): Promise<RTCVideoRecord> {
    const room = await this.rtcService.getRoomById(dto.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (!room.participants.includes(user.id)) {
      throw new ForbiddenException(
        'No permission to create records for this room',
      );
    }

    const targetUserId = dto.userId || user.id;
    if (dto.userId && dto.userId !== user.id) {
      throw new ForbiddenException(
        'No permission to create records for other users',
      );
    }
    return this.rtcService.createVideoRecord({
      ...dto,
      userId: targetUserId,
    });
  }

  @Get('video-records/:id')
  @ApiOperation({ summary: 'Get RTC video record detail' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  async getVideoRecord(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<RTCVideoRecord | null> {
    const record = await this.rtcService.getVideoRecord(id);
    if (!record) {
      return null;
    }
    await this.assertCanReadRecord(user.id, record);
    return record;
  }

  @Get('rooms/:roomId/video-records')
  @ApiOperation({ summary: 'Get room video records' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  async getVideoRecordsByRoomId(
    @CurrentUser() user: UserEntity,
    @Param('roomId') roomId: string,
  ): Promise<RTCVideoRecord[]> {
    await this.assertRoomParticipant(roomId, user.id);
    return this.rtcService.getVideoRecordsByRoomId(roomId);
  }

  @Get('users/:userId/video-records')
  @ApiOperation({ summary: 'Get user video records' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getVideoRecordsByUserId(
    @CurrentUser() user: UserEntity,
    @Param('userId') userId: string,
  ): Promise<RTCVideoRecord[]> {
    if (user.id !== userId) {
      throw new ForbiddenException(
        'No permission to view other user records',
      );
    }
    return this.rtcService.getVideoRecordsByUserId(userId);
  }

  @Put('video-records/:id/status')
  @ApiOperation({ summary: 'Update video record status' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiBody({ type: UpdateRtcVideoRecordStatusDto })
  async updateVideoRecordStatus(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() dto: UpdateRtcVideoRecordStatusDto,
  ): Promise<RTCVideoRecord | null> {
    const record = await this.rtcService.getVideoRecord(id);
    if (!record) {
      return null;
    }
    await this.assertCanWriteRecord(user.id, record);
    return this.rtcService.updateVideoRecordStatus(
      id,
      dto.status,
      dto.errorMessage,
    );
  }

  @Put('video-records/:id/metadata')
  @ApiOperation({ summary: 'Update video record metadata' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiBody({ type: UpdateRtcVideoRecordMetadataDto })
  async updateVideoRecordMetadata(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() dto: UpdateRtcVideoRecordMetadataDto,
  ): Promise<RTCVideoRecord | null> {
    const record = await this.rtcService.getVideoRecord(id);
    if (!record) {
      return null;
    }
    await this.assertCanWriteRecord(user.id, record);
    return this.rtcService.updateVideoRecordMetadata(id, dto.metadata);
  }

  @Post('video-records/:id/sync')
  @ApiOperation({ summary: 'Sync video record state from cloud provider task' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  @ApiBody({ type: SyncRtcVideoRecordDto })
  async syncVideoRecord(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() dto: SyncRtcVideoRecordDto,
  ): Promise<RTCVideoRecord | null> {
    const record = await this.rtcService.getVideoRecord(id);
    if (!record) {
      return null;
    }
    await this.assertCanWriteRecord(user.id, record);
    return this.rtcService.syncVideoRecord(id, {
      roomId: dto.roomId,
      taskId: dto.taskId,
      operatorId: user.id,
    });
  }

  @Delete('video-records/:id')
  @ApiOperation({ summary: 'Delete video record (soft delete)' })
  @ApiParam({ name: 'id', description: 'Record ID' })
  async deleteVideoRecord(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<boolean> {
    const record = await this.rtcService.getVideoRecord(id);
    if (!record) {
      return false;
    }
    await this.assertCanWriteRecord(user.id, record);
    return this.rtcService.deleteVideoRecord(id);
  }

  @Get('video-records')
  @ApiOperation({ summary: 'List all video records' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  async getVideoRecords(
    @CurrentUser() user: UserEntity,
    @Query() query: ListRtcVideoRecordQueryDto,
  ): Promise<RTCVideoRecord[]> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.rtcService.getVideoRecordsByUserId(user.id, limit, offset, {
      status: query.status,
      syncStatus: query.syncStatus,
    });
  }

  private async validateTokenForUser(
    user: UserEntity,
    token: string | undefined,
  ): Promise<RtcTokenValidationResultDto> {
    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      return { valid: false };
    }

    const rtcToken = await this.rtcService.validateToken(normalizedToken);
    if (!rtcToken) {
      return { valid: false };
    }

    if (!hasAdminAccess(user) && rtcToken.userId !== user.id) {
      const room = await this.rtcService.getRoomById(rtcToken.roomId);
      const isRoomParticipant = !!room?.participants.includes(user.id);
      if (!isRoomParticipant) {
        throw new ForbiddenException('No permission to validate this RTC token');
      }
    }

    return {
      valid: true,
      roomId: rtcToken.roomId,
      userId: rtcToken.userId,
      provider: rtcToken.provider,
      channelId: rtcToken.channelId,
      role: rtcToken.role,
      expiresAt: rtcToken.expiresAt,
    };
  }

  private async assertRoomParticipant(
    roomId: string,
    userId: string,
  ): Promise<RTCRoom> {
    const room = await this.rtcService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (!room.participants.includes(userId)) {
      throw new ForbiddenException('No permission to access room records');
    }
    return room;
  }

  private async assertCanReadRecord(
    userId: string,
    record: RTCVideoRecord,
  ): Promise<void> {
    if (record.userId && record.userId === userId) {
      return;
    }
    await this.assertRoomParticipant(record.roomId, userId);
  }

  private async assertCanWriteRecord(
    userId: string,
    record: RTCVideoRecord,
  ): Promise<void> {
    if (record.userId && record.userId === userId) {
      return;
    }
    const room = await this.rtcService.getRoomById(record.roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.creatorId !== userId) {
      throw new ForbiddenException('No permission to modify this record');
    }
  }
}
