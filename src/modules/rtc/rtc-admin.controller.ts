import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { assertAdminAccess } from '../../common/auth/admin-access.util';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { UserEntity } from '../user/entities/user.entity';
import {
  CreateRtcChannelDto,
  RtcProviderHealthQueryDto,
  RtcProviderHealthReportDto,
  RtcProviderOperationStatDto,
  RtcProviderOperationStatsQueryDto,
  UpdateRtcChannelDto,
} from './dto/rtc.dto';
import { RTCChannelEntity } from './rtc-channel.entity';
import { RTCService } from './rtc.service';

@ApiTags('rtc-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rtc')
export class RtcAdminController {
  constructor(private readonly rtcService: RTCService) {}

  @Post('channels')
  @ApiOperation({ summary: 'Create or upsert RTC channel config' })
  @ApiBody({ type: CreateRtcChannelDto })
  @ApiResponse({ status: 201, type: RTCChannelEntity })
  async createChannel(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateRtcChannelDto,
  ): Promise<RTCChannelEntity> {
    this.assertAdmin(user);
    const channel = await this.rtcService.createChannel(dto);
    return this.maskChannelSecret(channel);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get all RTC channel configs' })
  @ApiResponse({ status: 200, type: [RTCChannelEntity] })
  async getChannels(
    @CurrentUser() user: UserEntity,
  ): Promise<RTCChannelEntity[]> {
    this.assertAdmin(user);
    const channels = await this.rtcService.getChannels();
    return channels.map((channel) => this.maskChannelSecret(channel));
  }

  @Get('providers/stats')
  @ApiOperation({ summary: 'Get RTC provider operation stats (admin only)' })
  @ApiQuery({ name: 'provider', required: false, description: 'Provider filter' })
  @ApiQuery({
    name: 'operation',
    required: false,
    description: 'Operation filter: createRoom/generateToken/validateToken',
  })
  @ApiQuery({ name: 'windowMinutes', required: false, description: 'Window minutes, e.g. 60' })
  @ApiQuery({ name: 'topErrorLimit', required: false, description: 'Top error code size, max 10' })
  @ApiResponse({ status: 200, type: [RtcProviderOperationStatDto] })
  async getProviderOperationStats(
    @CurrentUser() user: UserEntity,
    @Query() query: RtcProviderOperationStatsQueryDto,
  ): Promise<RtcProviderOperationStatDto[]> {
    this.assertAdmin(user);
    return this.rtcService.getProviderOperationStats(query);
  }

  @Get('providers/health')
  @ApiOperation({
    summary: 'Get RTC provider health report and routing recommendation (admin only)',
  })
  @ApiQuery({ name: 'provider', required: false, description: 'Provider filter' })
  @ApiQuery({
    name: 'operation',
    required: false,
    description: 'Operation filter: createRoom/generateToken/validateToken',
  })
  @ApiQuery({ name: 'windowMinutes', required: false, description: 'Window minutes, default 60' })
  @ApiQuery({ name: 'topErrorLimit', required: false, description: 'Top error code size, max 10' })
  @ApiQuery({
    name: 'minSamples',
    required: false,
    description: 'Minimum sample size to classify healthy/degraded/unhealthy',
  })
  @ApiQuery({
    name: 'controlPlaneMinSamples',
    required: false,
    description:
      'Minimum control-plane invocation samples before applying retry/circuit thresholds',
  })
  @ApiQuery({ name: 'degradedFailureRate', required: false, description: 'Failure rate threshold for degraded' })
  @ApiQuery({ name: 'unhealthyFailureRate', required: false, description: 'Failure rate threshold for unhealthy' })
  @ApiQuery({ name: 'degradedLatencyMs', required: false, description: 'Average latency threshold for degraded' })
  @ApiQuery({ name: 'unhealthyLatencyMs', required: false, description: 'Average latency threshold for unhealthy' })
  @ApiQuery({
    name: 'degradedControlPlaneRetryRate',
    required: false,
    description: 'Control-plane retry ratio threshold for degraded',
  })
  @ApiQuery({
    name: 'unhealthyControlPlaneRetryRate',
    required: false,
    description: 'Control-plane retry ratio threshold for unhealthy',
  })
  @ApiQuery({
    name: 'degradedControlPlaneCircuitOpenRate',
    required: false,
    description:
      'Control-plane circuit-open short-circuit ratio threshold for degraded',
  })
  @ApiQuery({
    name: 'unhealthyControlPlaneCircuitOpenRate',
    required: false,
    description:
      'Control-plane circuit-open short-circuit ratio threshold for unhealthy',
  })
  @ApiResponse({ status: 200, type: RtcProviderHealthReportDto })
  async getProviderHealthReport(
    @CurrentUser() user: UserEntity,
    @Query() query: RtcProviderHealthQueryDto,
  ): Promise<RtcProviderHealthReportDto> {
    this.assertAdmin(user);
    return this.rtcService.getProviderHealthReport(query);
  }

  @Get('channels/:id')
  @ApiOperation({ summary: 'Get RTC channel config' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiResponse({ status: 200, type: RTCChannelEntity })
  async getChannel(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<RTCChannelEntity | null> {
    this.assertAdmin(user);
    const channel = await this.rtcService.getChannel(id);
    if (!channel) {
      return null;
    }
    return this.maskChannelSecret(channel);
  }

  @Put('channels/:id')
  @ApiOperation({ summary: 'Update RTC channel config' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  @ApiBody({ type: UpdateRtcChannelDto })
  async updateChannel(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() config: UpdateRtcChannelDto,
  ): Promise<RTCChannelEntity | null> {
    this.assertAdmin(user);
    const channel = await this.rtcService.updateChannel(id, config);
    if (!channel) {
      return null;
    }
    return this.maskChannelSecret(channel);
  }

  @Delete('channels/:id')
  @ApiOperation({ summary: 'Delete RTC channel config (soft delete)' })
  @ApiParam({ name: 'id', description: 'Channel ID' })
  async deleteChannel(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<boolean> {
    this.assertAdmin(user);
    return this.rtcService.deleteChannel(id);
  }

  private maskChannelSecret(channel: RTCChannelEntity): RTCChannelEntity {
    const secret = channel.appSecret || '';
    const masked =
      secret.length <= 6
        ? '******'
        : `${secret.slice(0, 3)}******${secret.slice(secret.length - 3)}`;

    return Object.assign(new RTCChannelEntity(), channel, {
      appSecret: masked,
    });
  }

  private assertAdmin(user: UserEntity): void {
    assertAdminAccess(user);
  }
}
