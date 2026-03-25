import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RTCRoom, RTCToken } from '../rtc.interface';

const RTC_ROOM_TYPES = ['p2p', 'group'] as const;
const RTC_VIDEO_RECORD_STATUS = ['recording', 'completed', 'failed', 'processing'] as const;
const RTC_VIDEO_RECORD_SYNC_STATUS = ['pending', 'synced', 'failed'] as const;
const RTC_PROVIDER_OPERATIONS = ['createRoom', 'generateToken', 'validateToken'] as const;
const RTC_PROVIDER_HEALTH_STATUS = ['healthy', 'degraded', 'unhealthy', 'unknown'] as const;
const RTC_PROVIDER_HEALTH_REASONS = [
  'insufficient_samples',
  'high_failure_rate',
  'high_latency',
  'high_control_plane_retry_rate',
  'high_control_plane_circuit_open_rate',
] as const;
const RTC_PROVIDER_VALUES = ['volcengine', 'tencent', 'alibaba', 'livekit'] as const;
const RTC_SIGNALING_TRANSPORT_VALUES = ['WUKONGIM_EVENT'] as const;
const RTC_REALTIME_TRANSPORT_VALUES = ['WUKONGIM'] as const;
const RTC_SIGNALING_EVENT_TYPE_VALUES = ['RTC_SIGNAL'] as const;
const RTC_SIGNALING_NAMESPACE_VALUES = ['rtc'] as const;
const RTC_SIGNALING_CONVERSATION_TYPE_VALUES = ['GROUP'] as const;
const RTC_SIGNALING_DIRECT_TYPES = ['offer', 'answer', 'ice-candidate'] as const;
const RTC_SIGNALING_BROADCAST_TYPES = ['join', 'leave', 'publish', 'unpublish'] as const;

export class CreateRtcRoomDto {
  @ApiProperty({ enum: RTC_ROOM_TYPES, default: 'p2p' })
  @IsEnum(RTC_ROOM_TYPES)
  type: 'p2p' | 'group' = 'p2p';

  @ApiProperty({ type: [String], description: 'Participants. Creator will be auto included.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  participants: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Explicit channel ID (higher priority than provider)' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({
    enum: RTC_PROVIDER_VALUES,
    description: 'Preferred provider: volcengine/tencent/alibaba/livekit',
  })
  @IsOptional()
  @IsIn(RTC_PROVIDER_VALUES)
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Optional metadata used by future AI assistant orchestration' })
  @IsOptional()
  @IsObject()
  aiMetadata?: Record<string, any>;
}

export class GenerateRtcTokenDto {
  @ApiProperty()
  @IsString()
  roomId: string;

  @ApiPropertyOptional({ description: 'Optional, defaults to current user' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ enum: RTC_PROVIDER_VALUES })
  @IsOptional()
  @IsIn(RTC_PROVIDER_VALUES)
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Role used by cloud provider ACL' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  role?: string;

  @ApiPropertyOptional({ minimum: 60, maximum: 86400, default: 7200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expireSeconds?: number;
}

export class RtcConnectionInfoRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ enum: RTC_PROVIDER_VALUES })
  @IsOptional()
  @IsIn(RTC_PROVIDER_VALUES)
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Role used by cloud provider ACL' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  role?: string;

  @ApiPropertyOptional({ minimum: 60, maximum: 86400, default: 7200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expireSeconds?: number;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether WuKongIM realtime token should be included in the response',
  })
  @IsOptional()
  @IsBoolean()
  includeRealtimeToken?: boolean;
}

export class RtcConnectionConversationTargetDto {
  @ApiProperty({ enum: RTC_SIGNALING_CONVERSATION_TYPE_VALUES, default: 'GROUP' })
  conversationType: 'GROUP';

  @ApiProperty({ description: 'Conversation targetId used for room-scoped broadcast events' })
  targetId: string;
}

export class RtcConnectionSignalingDto {
  @ApiProperty({ enum: RTC_SIGNALING_TRANSPORT_VALUES, default: 'WUKONGIM_EVENT' })
  transport: 'WUKONGIM_EVENT';

  @ApiProperty({ enum: RTC_SIGNALING_EVENT_TYPE_VALUES, default: 'RTC_SIGNAL' })
  eventType: 'RTC_SIGNAL';

  @ApiProperty({ enum: RTC_SIGNALING_NAMESPACE_VALUES, default: 'rtc' })
  namespace: 'rtc';

  @ApiProperty({ description: 'Business room id used for RTC signaling routing' })
  roomId: string;

  @ApiProperty({
    description: 'Field name used for direct peer routing when sending one-to-one RTC signaling events',
    default: 'toUserId',
  })
  directTargetField: string;

  @ApiProperty({ type: () => RtcConnectionConversationTargetDto })
  broadcastConversation: RtcConnectionConversationTargetDto;

  @ApiProperty({
    type: [String],
    enum: RTC_SIGNALING_DIRECT_TYPES,
    description: 'RTC signaling types that should be routed directly to a peer',
  })
  directSignalTypes: Array<'offer' | 'answer' | 'ice-candidate'>;

  @ApiProperty({
    type: [String],
    enum: RTC_SIGNALING_BROADCAST_TYPES,
    description: 'RTC signaling/event types that should be broadcast to the room conversation',
  })
  broadcastSignalTypes: Array<'join' | 'leave' | 'publish' | 'unpublish'>;
}

export class RtcConnectionRealtimeDto {
  @ApiProperty({ enum: RTC_REALTIME_TRANSPORT_VALUES, default: 'WUKONGIM' })
  transport: 'WUKONGIM';

  @ApiProperty()
  uid: string;

  @ApiProperty()
  wsUrl: string;

  @ApiPropertyOptional()
  token?: string;

  @ApiPropertyOptional()
  apiUrl?: string;

  @ApiPropertyOptional()
  managerUrl?: string;

  @ApiPropertyOptional()
  tcpAddr?: string;
}

export class RtcConnectionProviderConfigDto {
  @ApiProperty({ enum: RTC_PROVIDER_VALUES })
  provider: 'volcengine' | 'tencent' | 'alibaba' | 'livekit';

  @ApiPropertyOptional()
  channelId?: string;

  @ApiProperty({ description: 'Provider client appId/sdkAppId/serverUrl identity exposed to the client SDK' })
  appId: string;

  @ApiProperty({ description: 'Provider-side room identifier used by the RTC media SDK when joining the room' })
  providerRoomId: string;

  @ApiProperty({ description: 'Business room identifier used by OpenChat app APIs and signaling' })
  businessRoomId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  token: string;

  @ApiPropertyOptional()
  role?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  expiresAt?: Date;

  @ApiPropertyOptional()
  endpoint?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional({
    description: 'Sanitized client-safe provider extension configuration for future SDK expansion',
  })
  extras?: Record<string, any>;
}

export class RtcConnectionInfoResponseDto {
  @ApiProperty({ type: () => RTCRoom })
  room: RTCRoom;

  @ApiProperty({ type: () => RTCToken })
  rtcToken: RTCToken;

  @ApiProperty({ type: () => RtcConnectionProviderConfigDto })
  providerConfig: RtcConnectionProviderConfigDto;

  @ApiProperty({ type: () => RtcConnectionSignalingDto })
  signaling: RtcConnectionSignalingDto;

  @ApiProperty({ type: () => RtcConnectionRealtimeDto })
  realtime: RtcConnectionRealtimeDto;
}

export class ValidateRtcTokenDto {
  @ApiProperty({ description: 'RTC token to validate' })
  @IsString()
  @MaxLength(4096)
  token: string;
}

export class RtcTokenValidationResultDto {
  @ApiProperty({ description: 'Whether token is valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Room ID bound in token' })
  roomId?: string;

  @ApiPropertyOptional({ description: 'User ID bound in token' })
  userId?: string;

  @ApiPropertyOptional({ enum: RTC_PROVIDER_VALUES, description: 'Resolved RTC provider' })
  provider?: string;

  @ApiPropertyOptional({ description: 'Bound RTC channel ID' })
  channelId?: string;

  @ApiPropertyOptional({ description: 'Token role' })
  role?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Token expiration timestamp' })
  expiresAt?: Date;
}

export class AddRtcParticipantDto {
  @ApiProperty()
  @IsString()
  userId: string;
}

export class CreateRtcChannelDto {
  @ApiProperty({
    enum: RTC_PROVIDER_VALUES,
    description: 'Provider: volcengine/tencent/alibaba/livekit',
  })
  @IsIn(RTC_PROVIDER_VALUES)
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  appId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  appKey: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  appSecret: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  endpoint?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  extraConfig?: Record<string, any>;
}

export class UpdateRtcChannelDto {
  @ApiPropertyOptional({ enum: RTC_PROVIDER_VALUES })
  @IsOptional()
  @IsIn(RTC_PROVIDER_VALUES)
  @IsString()
  @MaxLength(50)
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  appSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  endpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  extraConfig?: Record<string, any>;
}

export class CreateRtcVideoRecordDto {
  @ApiProperty()
  @IsString()
  roomId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Optional when recording is still in progress' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({ description: 'Optional when recording is still in progress' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  filePath?: string;

  @ApiPropertyOptional({ description: 'Optional when recording is still in progress' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fileType?: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Optional when recording is still in progress' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiProperty({ format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @ApiPropertyOptional({ format: 'date-time', description: 'Required when status is not recording' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @ApiPropertyOptional({ enum: RTC_VIDEO_RECORD_STATUS, default: 'completed' })
  @IsOptional()
  @IsEnum(RTC_VIDEO_RECORD_STATUS)
  status?: 'recording' | 'completed' | 'failed' | 'processing';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class StartRtcRecordingDto {
  @ApiPropertyOptional({ description: 'Optional preferred recording taskId. If omitted server will generate one.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  taskId?: string;

  @ApiPropertyOptional({ description: 'Optional recording metadata/context' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class StopRtcRecordingDto {
  @ApiPropertyOptional({ description: 'Record ID in local DB. Preferred when available.' })
  @IsOptional()
  @IsString()
  recordId?: string;

  @ApiPropertyOptional({ description: 'Provider recording taskId. Used when recordId is unknown.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  taskId?: string;

  @ApiPropertyOptional({ description: 'Optional stop metadata/context' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SyncRtcVideoRecordDto {
  @ApiPropertyOptional({ description: 'Optional roomId override used for provider sync fallback.' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Optional taskId override used for provider sync fallback.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  taskId?: string;
}

export class UpdateRtcVideoRecordStatusDto {
  @ApiProperty({ enum: RTC_VIDEO_RECORD_STATUS })
  @IsEnum(RTC_VIDEO_RECORD_STATUS)
  status: 'recording' | 'completed' | 'failed' | 'processing';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class UpdateRtcVideoRecordMetadataDto {
  @ApiProperty()
  @IsObject()
  metadata: Record<string, any>;
}

export class ListRtcVideoRecordQueryDto {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ enum: RTC_VIDEO_RECORD_STATUS })
  @IsOptional()
  @IsEnum(RTC_VIDEO_RECORD_STATUS)
  status?: 'recording' | 'completed' | 'failed' | 'processing';

  @ApiPropertyOptional({ enum: RTC_VIDEO_RECORD_SYNC_STATUS })
  @IsOptional()
  @IsEnum(RTC_VIDEO_RECORD_SYNC_STATUS)
  syncStatus?: 'pending' | 'synced' | 'failed';
}

export class RtcProviderOperationErrorDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty({ description: 'Normalized provider name' })
  provider: string;

  @ApiProperty({ enum: ['createRoom', 'generateToken', 'validateToken'] })
  operation: 'createRoom' | 'generateToken' | 'validateToken';

  @ApiProperty({ description: 'Observed upstream provider status code', example: 504 })
  providerStatusCode: number;

  @ApiProperty({ description: 'Provider-native error code', example: 'RequestTimeout' })
  providerErrorCode: string;

  @ApiProperty({ description: 'Whether client can retry safely' })
  retryable: boolean;

  @ApiProperty({ description: 'Provider-side error message' })
  providerMessage: string;
}

export class RtcProviderOperationStatDto {
  @ApiProperty()
  provider: string;

  @ApiProperty({ enum: RTC_PROVIDER_OPERATIONS })
  operation: 'createRoom' | 'generateToken' | 'validateToken';

  @ApiProperty()
  total: number;

  @ApiProperty()
  success: number;

  @ApiProperty()
  failure: number;

  @ApiProperty()
  retryableFailure: number;

  @ApiProperty()
  avgDurationMs: number;

  @ApiProperty({ description: 'Total control-plane delegate invocations observed in this provider operation' })
  controlPlaneInvocations: number;

  @ApiProperty({ description: 'Total control-plane retry attempts observed in this provider operation' })
  controlPlaneRetries: number;

  @ApiProperty({ description: 'Total short-circuited control-plane calls due to open circuit' })
  controlPlaneCircuitOpenShortCircuits: number;

  @ApiProperty({ description: 'Total unsafe control-plane calls with idempotency protection enabled' })
  controlPlaneUnsafeIdempotencyCalls: number;

  @ApiProperty({ enum: ['success', 'failure'] })
  lastStatus: 'success' | 'failure';

  @ApiProperty()
  lastDurationMs: number;

  @ApiPropertyOptional()
  lastErrorCode?: string;

  @ApiPropertyOptional()
  lastErrorMessage?: string;

  @ApiProperty({ type: () => [RtcProviderOperationErrorCountDto] })
  topErrors: RtcProviderOperationErrorCountDto[];

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class RtcProviderOperationErrorCountDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  count: number;
}

export class RtcProviderOperationStatsQueryDto {
  @ApiPropertyOptional({ enum: RTC_PROVIDER_VALUES, description: 'Filter by provider' })
  @IsOptional()
  @IsIn(RTC_PROVIDER_VALUES)
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ enum: RTC_PROVIDER_OPERATIONS })
  @IsOptional()
  @IsEnum(RTC_PROVIDER_OPERATIONS)
  operation?: 'createRoom' | 'generateToken' | 'validateToken';

  @ApiPropertyOptional({ minimum: 1, maximum: 1440, description: 'Time window in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  windowMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, description: 'Top-N error code count' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  topErrorLimit?: number;
}

export class RtcProviderCapabilityDto {
  @ApiProperty({ enum: RTC_PROVIDER_VALUES })
  provider: string;

  @ApiProperty({ description: 'Whether provider has active channel config' })
  configured: boolean;

  @ApiPropertyOptional({ description: 'Active channel ID for this provider' })
  channelId?: string;

  @ApiProperty({ description: 'Whether cloud recording is supported by current implementation' })
  supportsRecording: boolean;

  @ApiProperty({
    type: [String],
    description: 'Supported token strategy names',
    example: ['delegate', 'openapi', 'local'],
  })
  tokenStrategies: string[];

  @ApiProperty({ description: 'Whether control-plane delegate mode is supported' })
  supportsControlPlaneDelegate: boolean;
}

export class RtcProviderCapabilitiesResponseDto {
  @ApiProperty({ enum: RTC_PROVIDER_VALUES, description: 'Default provider configured on server' })
  defaultProvider: string;

  @ApiPropertyOptional({ enum: RTC_PROVIDER_VALUES, description: 'Recommended provider from health routing' })
  recommendedPrimary?: string;

  @ApiProperty({ type: [String], description: 'Fallback order by provider health score' })
  fallbackOrder: string[];

  @ApiProperty({ type: [String], description: 'Providers that currently have active channel configs' })
  activeProviders: string[];

  @ApiProperty({ type: () => [RtcProviderCapabilityDto] })
  providers: RtcProviderCapabilityDto[];
}

export class RtcProviderHealthItemDto {
  @ApiProperty()
  provider: string;

  @ApiProperty({ enum: RTC_PROVIDER_HEALTH_STATUS })
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

  @ApiProperty({
    type: [String],
    enum: RTC_PROVIDER_HEALTH_REASONS,
    description: 'Reasons that drove current health status',
  })
  healthReasons: string[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  success: number;

  @ApiProperty()
  failure: number;

  @ApiProperty()
  retryableFailure: number;

  @ApiProperty()
  failureRate: number;

  @ApiProperty()
  retryableFailureRate: number;

  @ApiProperty()
  avgDurationMs: number;

  @ApiProperty({ description: 'Total control-plane delegate invocations observed in this window' })
  controlPlaneInvocations: number;

  @ApiProperty({ description: 'Total control-plane retry attempts observed in this window' })
  controlPlaneRetries: number;

  @ApiProperty({ description: 'Total short-circuited control-plane calls due to open circuit in this window' })
  controlPlaneCircuitOpenShortCircuits: number;

  @ApiProperty({ description: 'Total unsafe control-plane calls with idempotency protection enabled in this window' })
  controlPlaneUnsafeIdempotencyCalls: number;

  @ApiProperty({ description: 'Control-plane retry ratio: controlPlaneRetries / controlPlaneInvocations' })
  controlPlaneRetryRate: number;

  @ApiProperty({ description: 'Control-plane circuit-open ratio: short-circuit count / controlPlaneInvocations' })
  controlPlaneCircuitOpenRate: number;

  @ApiProperty({ description: 'Whether control-plane thresholds are evaluated (requires controlPlaneMinSamples)' })
  controlPlaneSignalsEvaluated: boolean;

  @ApiProperty({ type: () => [RtcProviderOperationErrorCountDto] })
  topErrors: RtcProviderOperationErrorCountDto[];

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: Date;
}

export class RtcProviderHealthReportDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt: Date;

  @ApiProperty()
  windowMinutes: number;

  @ApiPropertyOptional({ enum: RTC_PROVIDER_OPERATIONS })
  operation?: 'createRoom' | 'generateToken' | 'validateToken';

  @ApiPropertyOptional()
  recommendedPrimary?: string;

  @ApiProperty({ type: [String] })
  fallbackOrder: string[];

  @ApiProperty({ type: () => [RtcProviderHealthItemDto] })
  providers: RtcProviderHealthItemDto[];
}

export class RtcProviderHealthQueryDto {
  @ApiPropertyOptional({ enum: RTC_PROVIDER_VALUES, description: 'Filter by provider' })
  @IsOptional()
  @IsIn(RTC_PROVIDER_VALUES)
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ enum: RTC_PROVIDER_OPERATIONS })
  @IsOptional()
  @IsEnum(RTC_PROVIDER_OPERATIONS)
  operation?: 'createRoom' | 'generateToken' | 'validateToken';

  @ApiPropertyOptional({ minimum: 1, maximum: 1440, default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  windowMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  topErrorLimit?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  minSamples?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  controlPlaneMinSamples?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  degradedFailureRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.35 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  unhealthyFailureRate?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10000, default: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000)
  degradedLatencyMs?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 20000, default: 700 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20000)
  unhealthyLatencyMs?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  degradedControlPlaneRetryRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  unhealthyControlPlaneRetryRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.05 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  degradedControlPlaneCircuitOpenRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  unhealthyControlPlaneCircuitOpenRate?: number;
}
