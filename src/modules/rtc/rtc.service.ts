import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, ObjectLiteral, Repository } from 'typeorm';
import { PrometheusService } from '../../common/metrics/prometheus.service';
import { WukongIMService } from '../wukongim/wukongim.service';
import { RTCChannelEntity } from './rtc-channel.entity';
import { RTCRoom as RTCRoomEntity } from './rtc-room.entity';
import { RTCToken as RTCTokenEntity } from './rtc-token.entity';
import { RTCVideoRecord } from './rtc-video-record.entity';
import { RTCCallSession } from './rtc-call-session.entity';
import { RTCCallParticipant } from './rtc-call-participant.entity';
import {
  RTCManager,
  RTCRoom,
  RTCToken,
} from './rtc.interface';
import {
  RTCChannelBase,
  RTCControlPlaneSignalSummary,
  rtcChannelFactory,
} from './channels/rtc-channel.base';
import {
  RTCChannel,
  RTCChannelRecordingTask,
  RTCChannelStartRecordingRequest,
  RTCChannelStopRecordingRequest,
  RTCChannelConfig,
  RTCChannelToken,
} from './channels/rtc-channel.interface';
import {
  RTC_AI_EXTENSION,
  RTC_DEFAULT_PROVIDER,
  RTCProviderType,
  normalizeRtcProvider,
} from './rtc.constants';
import { RtcAiExtension } from './rtc-ai-extension.interface';
import { AlibabaRTCChannel } from './channels/alibaba';
import { VolcengineRTCChannel } from './channels/volcengine';
import { LiveKitRTCChannel } from './channels/livekit';
import { TencentRTCChannel } from './channels/tencent';
import {
  RtcConnectionInfoRequestDto,
  RtcConnectionInfoResponseDto,
} from './dto/rtc.dto';

interface CachedChannelClient {
  updatedAt: number;
  channel: RTCChannel;
}

interface RTCProviderErrorContext {
  provider: string;
  operation: 'createRoom' | 'generateToken' | 'validateToken';
  code: string;
  statusCode: number;
  retryable: boolean;
  message: string;
}

interface RTCVideoRecordQueryFilter {
  status?: 'recording' | 'completed' | 'failed' | 'processing';
  syncStatus?: 'pending' | 'synced' | 'failed';
}

interface RTCProviderOperationEvent {
  timestamp: number;
  status: 'success' | 'failure';
  durationMs: number;
  retryable: boolean;
  controlPlaneInvocations: number;
  controlPlaneRetries: number;
  controlPlaneCircuitOpenShortCircuits: number;
  controlPlaneUnsafeIdempotencyCalls: number;
  errorCode?: string;
  errorMessage?: string;
}

interface RTCProviderErrorCounter {
  code: string;
  count: number;
}

interface RTCProviderControlPlaneSignalMetrics {
  invocations: number;
  retries: number;
  circuitOpenShortCircuits: number;
  unsafeIdempotencyCalls: number;
}

interface RTCProviderOperationAggregate {
  provider: RTCProviderType;
  operation: 'createRoom' | 'generateToken' | 'validateToken';
  total: number;
  success: number;
  failure: number;
  retryableFailure: number;
  totalDurationMs: number;
  controlPlaneInvocations: number;
  controlPlaneRetries: number;
  controlPlaneCircuitOpenShortCircuits: number;
  controlPlaneUnsafeIdempotencyCalls: number;
  lastStatus: 'success' | 'failure';
  lastDurationMs: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  updatedAt: Date;
}

export interface RTCProviderOperationStat {
  provider: RTCProviderType;
  operation: 'createRoom' | 'generateToken' | 'validateToken';
  total: number;
  success: number;
  failure: number;
  retryableFailure: number;
  avgDurationMs: number;
  controlPlaneInvocations: number;
  controlPlaneRetries: number;
  controlPlaneCircuitOpenShortCircuits: number;
  controlPlaneUnsafeIdempotencyCalls: number;
  lastStatus: 'success' | 'failure';
  lastDurationMs: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  topErrors: RTCProviderErrorCounter[];
  updatedAt: Date;
}

interface RTCProviderOperationStatQuery {
  provider?: string;
  operation?: 'createRoom' | 'generateToken' | 'validateToken';
  windowMinutes?: number;
  topErrorLimit?: number;
}

interface RTCProviderHealthQuery {
  provider?: string;
  operation?: 'createRoom' | 'generateToken' | 'validateToken';
  windowMinutes?: number;
  topErrorLimit?: number;
  minSamples?: number;
  controlPlaneMinSamples?: number;
  degradedFailureRate?: number;
  unhealthyFailureRate?: number;
  degradedLatencyMs?: number;
  unhealthyLatencyMs?: number;
  degradedControlPlaneRetryRate?: number;
  unhealthyControlPlaneRetryRate?: number;
  degradedControlPlaneCircuitOpenRate?: number;
  unhealthyControlPlaneCircuitOpenRate?: number;
}

interface RTCProviderHealthDefaults {
  windowMinutes: number;
  topErrorLimit: number;
  minSamples: number;
  controlPlaneMinSamples: number;
  degradedFailureRate: number;
  unhealthyFailureRate: number;
  degradedLatencyMs: number;
  unhealthyLatencyMs: number;
  degradedControlPlaneRetryRate: number;
  unhealthyControlPlaneRetryRate: number;
  degradedControlPlaneCircuitOpenRate: number;
  unhealthyControlPlaneCircuitOpenRate: number;
}

type RTCProviderHealthReason =
  | 'insufficient_samples'
  | 'high_failure_rate'
  | 'high_latency'
  | 'high_control_plane_retry_rate'
  | 'high_control_plane_circuit_open_rate';

interface RTCProviderStatsHistoryDefaults {
  maxEvents: number;
  maxAgeMs: number;
}

export interface RTCProviderHealthItem {
  provider: RTCProviderType;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  healthReasons: RTCProviderHealthReason[];
  total: number;
  success: number;
  failure: number;
  retryableFailure: number;
  failureRate: number;
  retryableFailureRate: number;
  avgDurationMs: number;
  controlPlaneInvocations: number;
  controlPlaneRetries: number;
  controlPlaneCircuitOpenShortCircuits: number;
  controlPlaneUnsafeIdempotencyCalls: number;
  controlPlaneRetryRate: number;
  controlPlaneCircuitOpenRate: number;
  controlPlaneSignalsEvaluated: boolean;
  topErrors: RTCProviderErrorCounter[];
  updatedAt?: Date;
}

export interface RTCProviderHealthReport {
  generatedAt: Date;
  windowMinutes: number;
  operation?: 'createRoom' | 'generateToken' | 'validateToken';
  recommendedPrimary?: RTCProviderType;
  fallbackOrder: RTCProviderType[];
  providers: RTCProviderHealthItem[];
}

export interface RTCProviderCapabilityItem {
  provider: RTCProviderType;
  configured: boolean;
  channelId?: string;
  supportsRecording: boolean;
  tokenStrategies: string[];
  supportsControlPlaneDelegate: boolean;
}

export interface RTCProviderCapabilitiesReport {
  defaultProvider: RTCProviderType;
  recommendedPrimary?: RTCProviderType;
  fallbackOrder: RTCProviderType[];
  activeProviders: RTCProviderType[];
  providers: RTCProviderCapabilityItem[];
}

const RTC_PROVIDER_STATIC_CAPABILITIES: Record<
  RTCProviderType,
  Pick<RTCProviderCapabilityItem, 'supportsRecording' | 'tokenStrategies' | 'supportsControlPlaneDelegate'>
> = {
  volcengine: {
    supportsRecording: true,
    tokenStrategies: ['delegate', 'openapi', 'local'],
    supportsControlPlaneDelegate: true,
  },
  tencent: {
    supportsRecording: false,
    tokenStrategies: ['usersig'],
    supportsControlPlaneDelegate: true,
  },
  alibaba: {
    supportsRecording: false,
    tokenStrategies: ['app-auth'],
    supportsControlPlaneDelegate: true,
  },
  livekit: {
    supportsRecording: false,
    tokenStrategies: ['signed-token'],
    supportsControlPlaneDelegate: true,
  },
};

@Injectable()
export class RTCService implements RTCManager {
  private readonly logger = new Logger(RTCService.name);
  private readonly channelCache = new Map<string, CachedChannelClient>();
  private readonly providerOperationStats = new Map<string, RTCProviderOperationAggregate>();
  private readonly providerOperationHistory = new Map<string, RTCProviderOperationEvent[]>();
  private readonly providerOperationErrorCounters = new Map<string, Map<string, number>>();
  private readonly providerStatsHistoryDefaults: RTCProviderStatsHistoryDefaults;
  private readonly providerHealthDefaults: RTCProviderHealthDefaults;
  private readonly healthBasedRoutingEnabled: boolean;
  private readonly healthRoutingMinSamples: number;
  private readonly defaultProvider: RTCProviderType;

  constructor(
    @InjectRepository(RTCRoomEntity)
    private readonly rtcRoomRepository: Repository<RTCRoomEntity>,
    @InjectRepository(RTCTokenEntity)
    private readonly rtcTokenRepository: Repository<RTCTokenEntity>,
    @InjectRepository(RTCChannelEntity)
    private readonly rtcChannelRepository: Repository<RTCChannelEntity>,
    @InjectRepository(RTCVideoRecord)
    private readonly rtcVideoRecordRepository: Repository<RTCVideoRecord>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @Optional()
    private readonly wukongIMService?: WukongIMService,
    @Optional()
    @Inject(RTC_AI_EXTENSION)
    private readonly aiExtension?: RtcAiExtension,
    @Optional()
    private readonly prometheusService?: PrometheusService,
  ) {
    this.defaultProvider = this.readDefaultProvider();
    this.providerStatsHistoryDefaults = this.readProviderStatsHistoryDefaults();
    this.providerHealthDefaults = this.readProviderHealthDefaults();
    this.healthBasedRoutingEnabled = this.readConfigBoolean(
      'RTC_ENABLE_HEALTH_BASED_ROUTING',
      false,
    );
    this.healthRoutingMinSamples = this.readConfigBoundedInteger(
      'RTC_HEALTH_ROUTING_MIN_SAMPLES',
      20,
      1,
      1000,
    );
    this.registerProviders();
  }

  async createRoom(
    creatorId: string,
    type: 'p2p' | 'group',
    participants: string[],
    name?: string,
    channelId?: string,
    provider?: string,
    aiMetadata?: Record<string, any>,
  ): Promise<RTCRoom> {
    const normalizedParticipants = this.normalizeParticipants([...participants, creatorId]);
    this.validateRoomParticipants(type, normalizedParticipants);
    const channelEntity = await this.resolveChannelEntity({
      channelId,
      provider,
      operation: 'createRoom',
    });
    if (provider && !channelEntity) {
      throw new NotFoundException(
        `No active RTC channel configured for provider: ${this.normalizeProviderOrThrow(provider)}`,
      );
    }
    this.assertRouteConsistency({
      requestedChannelId: channelId,
      requestedProvider: provider,
      resolvedChannel: channelEntity,
    });

    const savedRoom = await this.dataSource.transaction(async (manager) => {
      const roomRepo = manager.getRepository(RTCRoomEntity);
      let room = roomRepo.create({
        name,
        type,
        creatorId,
        participants: normalizedParticipants,
        status: 'active',
        channelId: channelEntity?.id,
        provider: channelEntity ? normalizeRtcProvider(channelEntity.provider) : undefined,
        aiEnabled: !!aiMetadata,
        aiMetadata,
      });
      room = await roomRepo.save(room);

      if (channelEntity) {
        const channel = await this.getChannelClient(channelEntity);
        const provider = normalizeRtcProvider(channelEntity.provider);
        let externalRoomId: string | undefined;
        const providerStartedAt = Date.now();
        const providerCall = await RTCChannelBase.captureControlPlaneSignals(
          () => channel.createRoom(room.id, name, type),
        );
        if (providerCall.ok) {
          const channelRoomInfo = providerCall.result;
          this.recordProviderOperationSuccess(
            provider,
            'createRoom',
            Date.now() - providerStartedAt,
            providerCall.signals,
          );
          externalRoomId = channelRoomInfo.roomId;
          room.externalRoomId = externalRoomId;
          try {
            room = await roomRepo.save(room);
          } catch (error) {
            if (externalRoomId) {
              try {
                await channel.destroyRoom(externalRoomId);
              } catch (cleanupError) {
                this.logger.error(
                  `Failed to cleanup external RTC room after local persistence failure: ${externalRoomId}`,
                  cleanupError,
                );
              }
            }
            this.logger.error(
              `Failed to persist external RTC room id after provider creation: ${provider}/${externalRoomId}`,
              error,
            );
            throw error;
          }
        } else {
          throw this.createProviderOperationException(
            provider,
            'createRoom',
            providerCall.error,
            Date.now() - providerStartedAt,
            providerCall.signals,
          );
        }
      }

      return room;
    });

    const result = this.mapToRTCRoom(savedRoom);
    try {
      await this.ensureActiveCallSession(savedRoom, creatorId);
    } catch (error) {
      this.logger.error(`Failed to initialize RTC call session for room ${savedRoom.id}`, error);
    }
    await this.callAiExtension('onRoomCreated', {
      room: result,
      operatorId: creatorId,
    });
    return result;
  }

  async endRoom(roomId: string, operatorId?: string): Promise<boolean> {
    const room = await this.rtcRoomRepository.findOne({
      where: { id: roomId, isDeleted: false },
    });
    if (!room || room.status === 'ended') {
      return false;
    }
    if (operatorId && room.creatorId !== operatorId) {
      throw new ForbiddenException('Only room creator can end the call');
    }

    if (room.channelId) {
      try {
        const channel = await this.getChannelClientById(room.channelId);
        if (channel) {
          await channel.destroyRoom(room.externalRoomId || room.id);
        }
      } catch (error) {
        this.logger.error(`Failed to destroy room ${room.id} in RTC provider`, error);
      }
    }

    room.status = 'ended';
    room.endedAt = new Date();
    const saved = await this.rtcRoomRepository.save(room);
    try {
      await this.endActiveCallSession(saved.id, 'room_ended', operatorId || room.creatorId);
    } catch (error) {
      this.logger.error(`Failed to close RTC call session for room ${saved.id}`, error);
    }

    await this.callAiExtension('onRoomEnded', {
      room: this.mapToRTCRoom(saved),
      operatorId,
    });
    return true;
  }

  async getRoomById(roomId: string): Promise<RTCRoom | null> {
    const room = await this.rtcRoomRepository.findOne({
      where: { id: roomId, isDeleted: false },
    });
    return room ? this.mapToRTCRoom(room) : null;
  }

  async getRoomsByUserId(userId: string): Promise<RTCRoom[]> {
    const rooms = await this.rtcRoomRepository
      .createQueryBuilder('room')
      .where('room.is_deleted = false')
      .andWhere('room.participants ? :userId', { userId })
      .orderBy('room.started_at', 'DESC')
      .getMany();

    return rooms.map((room) => this.mapToRTCRoom(room));
  }

  async generateToken(
    roomId: string,
    userId: string,
    channelId?: string,
    provider?: string,
    role?: string,
    expireSeconds?: number,
  ): Promise<RTCToken> {
    const room = await this.rtcRoomRepository.findOne({
      where: { id: roomId, isDeleted: false },
    });
    if (!room || room.status !== 'active') {
      throw new NotFoundException('Room not found or inactive');
    }

    const participants = this.parseParticipants(room.participants);
    if (!participants.includes(userId)) {
      throw new ForbiddenException('User is not a participant of this room');
    }

    const expectedProvider = provider
      || room.provider
      || (this.healthBasedRoutingEnabled ? undefined : this.defaultProvider);
    const normalizedExpectedProvider = this.safeNormalizeProvider(
      expectedProvider || this.defaultProvider,
    );
    const channelEntity = await this.resolveChannelEntity({
      channelId: channelId || room.channelId,
      provider: expectedProvider,
      operation: 'generateToken',
    });
    if (!channelEntity && (channelId || provider || room.channelId || room.provider)) {
      throw new NotFoundException('RTC channel not configured or inactive');
    }
    this.assertRouteConsistency({
      requestedChannelId: channelId,
      requestedProvider: provider,
      roomChannelId: room.channelId || undefined,
      roomProvider: room.provider || undefined,
      resolvedChannel: channelEntity,
    });

    let generatedToken: RTCChannelToken;
    if (channelEntity) {
      const channel = await this.getChannelClient(channelEntity);
      const provider = normalizeRtcProvider(channelEntity.provider);
      const providerStartedAt = Date.now();
      const providerCall = await RTCChannelBase.captureControlPlaneSignals(async () => {
        await channel.addParticipant(room.externalRoomId || room.id, userId);
        return channel.generateToken(
          room.externalRoomId || room.id,
          userId,
          role,
          expireSeconds,
        );
      });
      if (providerCall.ok) {
        generatedToken = providerCall.result;
        this.recordProviderOperationSuccess(
          provider,
          'generateToken',
          Date.now() - providerStartedAt,
          providerCall.signals,
        );
      } else {
        throw this.createProviderOperationException(
          provider,
          'generateToken',
          providerCall.error,
          Date.now() - providerStartedAt,
          providerCall.signals,
        );
      }
    } else {
      const now = new Date();
      const seconds = Math.max(expireSeconds || 7200, 60);
      generatedToken = {
        token: `rtc_token_${roomId}_${userId}_${Date.now()}_${randomBytes(16).toString('hex')}`,
        expiresAt: new Date(now.getTime() + seconds * 1000),
        roomId,
        userId,
        role: role || 'participant',
        issuer: 'local',
      };
    }

    const tokenMetadata: Record<string, any> = { ...generatedToken };
    tokenMetadata.audit = {
      issuedAt: new Date().toISOString(),
      providerRequested: provider,
      channelIdRequested: channelId,
      roomProviderPinned: room.provider,
      roomChannelIdPinned: room.channelId,
      resolvedProvider: channelEntity
        ? normalizeRtcProvider(channelEntity.provider)
        : normalizedExpectedProvider,
      resolvedChannelId: channelEntity?.id,
      tokenIssuer: generatedToken.issuer || (channelEntity ? 'provider' : 'local'),
      tokenType: generatedToken.tokenType || (channelEntity ? 'provider-native' : 'local-random'),
      validationMode: channelEntity ? 'provider+db' : 'db-only',
    };
    delete tokenMetadata.token;
    const saved = await this.rtcTokenRepository.save(
      this.rtcTokenRepository.create({
        roomId,
        userId,
        channelId: channelEntity?.id,
        provider: channelEntity
          ? normalizeRtcProvider(channelEntity.provider)
          : normalizedExpectedProvider,
        token: generatedToken.token,
        role: role || (generatedToken.role as string | undefined) || 'participant',
        metadata: tokenMetadata,
        expiresAt: generatedToken.expiresAt,
      }),
    );

    await this.callAiExtension('onTokenIssued', {
      room: this.mapToRTCRoom(room),
      token: saved,
      provider: saved.provider || this.defaultProvider,
    });

    return saved;
  }

  async getClientConnectionInfo(
    roomId: string,
    userId: string,
    options: RtcConnectionInfoRequestDto = {},
  ): Promise<RtcConnectionInfoResponseDto> {
    const room = await this.rtcRoomRepository.findOne({
      where: { id: roomId, isDeleted: false },
    });
    if (!room || room.status !== 'active') {
      throw new NotFoundException('Room not found or inactive');
    }

    const participants = this.parseParticipants(room.participants);
    if (!participants.includes(userId)) {
      throw new ForbiddenException('User is not a participant of this room');
    }

    const rtcToken = await this.generateToken(
      roomId,
      userId,
      options.channelId,
      options.provider,
      options.role,
      options.expireSeconds,
    );

    const channelEntity = await this.resolveChannelEntity({
      channelId: rtcToken.channelId || room.channelId || options.channelId,
      provider: rtcToken.provider || room.provider || options.provider,
      operation: 'generateToken',
    });
    if (!channelEntity) {
      throw new BadRequestException(
        'RTC connection info requires an active RTC channel configuration',
      );
    }

    const realtimeConfig = this.wukongIMService?.getConnectionConfig(userId);
    if (!realtimeConfig?.wsUrl) {
      throw new BadRequestException(
        'WuKongIM realtime bootstrap config is unavailable',
      );
    }

    const realtimeToken = options.includeRealtimeToken === false
      ? undefined
      : await this.wukongIMService?.getUserToken(userId);
    const providerRoomId = room.externalRoomId || room.id;

    return {
      room: this.mapToRTCRoom(room),
      rtcToken,
      providerConfig: {
        provider: this.safeNormalizeProvider(
          rtcToken.provider || channelEntity.provider,
        ),
        channelId: rtcToken.channelId || room.channelId || channelEntity.id,
        appId: channelEntity.appId,
        providerRoomId,
        businessRoomId: room.id,
        userId,
        token: rtcToken.token,
        role: rtcToken.role,
        expiresAt: rtcToken.expiresAt,
        endpoint: channelEntity.endpoint || undefined,
        region: channelEntity.region || undefined,
        extras: this.sanitizeRtcClientExtraConfig(channelEntity.extraConfig),
      },
      signaling: {
        transport: 'WUKONGIM_EVENT',
        eventType: 'RTC_SIGNAL',
        namespace: 'rtc',
        roomId: room.id,
        directTargetField: 'toUserId',
        broadcastConversation: {
          conversationType: 'GROUP',
          targetId: room.id,
        },
        directSignalTypes: ['offer', 'answer', 'ice-candidate'],
        broadcastSignalTypes: ['join', 'leave', 'publish', 'unpublish'],
      },
      realtime: {
        transport: 'WUKONGIM',
        uid: realtimeConfig.uid,
        wsUrl: realtimeConfig.wsUrl,
        token: realtimeToken,
        apiUrl: realtimeConfig.apiUrl,
        managerUrl: realtimeConfig.managerUrl,
        tcpAddr: realtimeConfig.tcpAddr,
      },
    };
  }

  async validateToken(token: string): Promise<RTCToken | null> {
    const rtcToken = await this.rtcTokenRepository.findOne({
      where: {
        token,
        isDeleted: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
    if (!rtcToken) {
      return null;
    }

    if (rtcToken.channelId || rtcToken.provider) {
      try {
        const channel = rtcToken.channelId
          ? await this.getChannelClientById(rtcToken.channelId)
          : await this.getChannelClientByProvider(rtcToken.provider);
        if (!channel) {
          const isLocalIssued = rtcToken.metadata && rtcToken.metadata.issuer === 'local';
          return isLocalIssued ? rtcToken : null;
        }
        const provider = this.safeNormalizeProvider(rtcToken.provider || this.defaultProvider);
        const providerStartedAt = Date.now();
        const providerCall = await RTCChannelBase.captureControlPlaneSignals(
          () => channel.validateToken(token),
        );
        const durationMs = Date.now() - providerStartedAt;
        if (!providerCall.ok) {
          const normalized = this.normalizeProviderError(provider, 'validateToken', providerCall.error);
          this.recordProviderOperationFailure(normalized, durationMs, providerCall.signals);
          this.logger.warn(
            `RTC token provider validation failed: ${normalized.provider}/${normalized.operation}/${normalized.code} - ${normalized.message}`,
          );
          return null;
        }
        if (!providerCall.result) {
          this.recordProviderOperationFailure({
            provider,
            operation: 'validateToken',
            code: 'TOKEN_INVALID',
            statusCode: 401,
            retryable: false,
            message: 'Provider rejected token',
          }, durationMs, providerCall.signals);
          return null;
        }
        this.recordProviderOperationSuccess(
          provider,
          'validateToken',
          durationMs,
          providerCall.signals,
        );
      } catch (error) {
        const provider = this.safeNormalizeProvider(rtcToken.provider || this.defaultProvider);
        const normalized = this.normalizeProviderError(provider, 'validateToken', error);
        this.recordProviderOperationFailure(normalized, 0);
        this.logger.warn(
          `RTC token provider validation failed: ${normalized.provider}/${normalized.operation}/${normalized.code} - ${normalized.message}`,
        );
        return null;
      }
    }

    return rtcToken;
  }

  async addParticipant(roomId: string, userId: string, operatorId?: string): Promise<boolean> {
    const room = await this.rtcRoomRepository.findOne({
      where: { id: roomId, isDeleted: false },
    });
    if (!room || room.status === 'ended') {
      return false;
    }
    if (operatorId && room.creatorId !== operatorId) {
      throw new ForbiddenException('Only room creator can add participants');
    }

    const participants = this.parseParticipants(room.participants);
    if (participants.includes(userId)) {
      return true;
    }
    participants.push(userId);
    room.participants = this.normalizeParticipants(participants);
    const saved = await this.rtcRoomRepository.save(room);

    if (saved.channelId) {
      try {
        const channel = await this.getChannelClientById(saved.channelId);
        if (channel) {
          await channel.addParticipant(saved.externalRoomId || saved.id, userId);
        }
      } catch (error) {
        this.logger.error(`Failed to add participant to RTC provider room ${saved.id}`, error);
      }
    }
    try {
      await this.upsertActiveCallParticipant(saved, userId, operatorId || room.creatorId);
    } catch (error) {
      this.logger.error(`Failed to sync RTC call participant join for room ${saved.id}`, error);
    }

    await this.callAiExtension('onParticipantJoined', {
      room: this.mapToRTCRoom(saved),
      userId,
      operatorId,
    });
    return true;
  }

  async removeParticipant(roomId: string, userId: string, operatorId?: string): Promise<boolean> {
    const room = await this.rtcRoomRepository.findOne({
      where: { id: roomId, isDeleted: false },
    });
    if (!room || room.status === 'ended') {
      return false;
    }
    if (operatorId && operatorId !== room.creatorId && operatorId !== userId) {
      throw new ForbiddenException('Only room creator or self can remove participant');
    }

    const participants = this.parseParticipants(room.participants);
    const index = participants.indexOf(userId);
    if (index < 0) {
      return true;
    }
    participants.splice(index, 1);
    const normalizedParticipants = this.normalizeParticipants(participants);
    room.participants = normalizedParticipants;
    const shouldEndRoom = normalizedParticipants.length === 0
      || (room.type === 'p2p' && normalizedParticipants.length < 2);
    if (shouldEndRoom) {
      room.status = 'ended';
      room.endedAt = new Date();
    }
    const saved = await this.rtcRoomRepository.save(room);

    if (saved.channelId) {
      try {
        const channel = await this.getChannelClientById(saved.channelId);
        if (channel) {
          const providerRoomId = saved.externalRoomId || saved.id;
          if (shouldEndRoom) {
            await channel.destroyRoom(providerRoomId);
          } else {
            await channel.removeParticipant(providerRoomId, userId);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to remove participant from RTC provider room ${saved.id}`, error);
      }
    }
    try {
      await this.markCallParticipantLeft(saved.id, userId, operatorId || userId, shouldEndRoom);
    } catch (error) {
      this.logger.error(`Failed to sync RTC call participant leave for room ${saved.id}`, error);
    }

    if (shouldEndRoom) {
      await this.callAiExtension('onRoomEnded', {
        room: this.mapToRTCRoom(saved),
        operatorId: operatorId || userId,
      });
    }

    await this.callAiExtension('onParticipantLeft', {
      room: this.mapToRTCRoom(saved),
      userId,
      operatorId,
    });
    return true;
  }

  private getOptionalRepository<T extends ObjectLiteral>(entity: new () => T): Repository<T> | null {
    const candidate = this.dataSource as unknown as {
      getRepository?: (target: new () => T) => Repository<T>;
    };
    if (!candidate || typeof candidate.getRepository !== 'function') {
      return null;
    }
    return candidate.getRepository(entity);
  }

  private async ensureActiveCallSession(room: RTCRoomEntity, initiatorUserId: string): Promise<void> {
    const sessionRepo = this.getOptionalRepository(RTCCallSession);
    const participantRepo = this.getOptionalRepository(RTCCallParticipant);
    if (!sessionRepo || !participantRepo) {
      return;
    }
    const normalizedParticipants = this.parseParticipants(room.participants);
    const now = new Date();
    let session = await sessionRepo.findOne({
      where: {
        roomId: room.id,
        isDeleted: false,
        status: In(['ringing', 'active']),
      },
      order: { createdAt: 'DESC' },
    });
    if (!session) {
      session = sessionRepo.create({
        roomId: room.id,
        channelId: room.channelId,
        provider: room.provider ? this.safeNormalizeProvider(room.provider) : undefined,
        initiatorUserId,
        externalSessionId: room.externalRoomId,
        status: 'active',
        startTime: room.startedAt || now,
        metadata: {
          source: 'room_create',
        },
      });
      session = await sessionRepo.save(session);
    }
    await this.ensureCallSessionParticipants(
      session,
      normalizedParticipants,
      initiatorUserId,
      room.type,
      participantRepo,
      now,
    );
  }

  private async ensureCallSessionParticipants(
    session: RTCCallSession,
    participants: string[],
    initiatorUserId: string,
    roomType: 'p2p' | 'group',
    participantRepo: Repository<RTCCallParticipant>,
    now: Date,
  ): Promise<void> {
    const existingList = await participantRepo.find({
      where: { sessionId: session.id, isDeleted: false },
    });
    const existingByUser = new Map(existingList.map((item) => [item.userId, item]));
    const toSave: RTCCallParticipant[] = [];

    for (const participantId of participants) {
      const isInitiator = participantId === initiatorUserId;
      const targetRole: RTCCallParticipant['role'] = isInitiator
        ? 'caller'
        : roomType === 'p2p'
          ? 'callee'
          : 'participant';
      const targetStatus: RTCCallParticipant['status'] = isInitiator ? 'joined' : 'invited';
      const existing = existingByUser.get(participantId);
      if (!existing) {
        toSave.push(participantRepo.create({
          sessionId: session.id,
          userId: participantId,
          role: targetRole,
          status: targetStatus,
          joinTime: isInitiator ? now : undefined,
          metadata: {
            source: 'session_bootstrap',
          },
        }));
        continue;
      }

      let changed = false;
      if (existing.role !== targetRole) {
        existing.role = targetRole;
        changed = true;
      }
      if (existing.status !== targetStatus) {
        existing.status = targetStatus;
        changed = true;
      }
      if (isInitiator && !existing.joinTime) {
        existing.joinTime = now;
        changed = true;
      }
      if (existing.leaveTime) {
        existing.leaveTime = undefined;
        changed = true;
      }
      if (existing.leaveReason) {
        existing.leaveReason = undefined;
        changed = true;
      }
      if (changed) {
        existing.metadata = this.mergeRecordMetadata(existing.metadata, {
          sessionBootstrapUpdatedAt: now.toISOString(),
        });
        toSave.push(existing);
      }
    }

    if (toSave.length > 0) {
      await participantRepo.save(toSave);
    }
  }

  private async getActiveCallSession(roomId: string): Promise<RTCCallSession | null> {
    const sessionRepo = this.getOptionalRepository(RTCCallSession);
    if (!sessionRepo) {
      return null;
    }
    return sessionRepo.findOne({
      where: {
        roomId,
        isDeleted: false,
        status: In(['ringing', 'active']),
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async upsertActiveCallParticipant(
    room: RTCRoomEntity,
    userId: string,
    operatorId: string,
  ): Promise<void> {
    const sessionRepo = this.getOptionalRepository(RTCCallSession);
    const participantRepo = this.getOptionalRepository(RTCCallParticipant);
    if (!sessionRepo || !participantRepo) {
      return;
    }

    let session = await this.getActiveCallSession(room.id);
    if (!session) {
      const now = new Date();
      session = await sessionRepo.save(sessionRepo.create({
        roomId: room.id,
        channelId: room.channelId,
        provider: room.provider ? this.safeNormalizeProvider(room.provider) : undefined,
        initiatorUserId: operatorId || room.creatorId,
        externalSessionId: room.externalRoomId,
        status: 'active',
        startTime: room.startedAt || now,
        metadata: {
          source: 'participant_join_recovery',
        },
      }));
    }

    const existing = await participantRepo.findOne({
      where: {
        sessionId: session.id,
        userId,
        isDeleted: false,
      },
    });
    const now = new Date();
    if (!existing) {
      await participantRepo.save(participantRepo.create({
        sessionId: session.id,
        userId,
        role: room.type === 'p2p' ? 'callee' : 'participant',
        status: 'joined',
        joinTime: now,
        metadata: {
          source: 'participant_join',
          operatorId,
        },
      }));
      return;
    }

    existing.status = 'joined';
    existing.joinTime = existing.joinTime || now;
    existing.leaveTime = undefined;
    existing.leaveReason = undefined;
    existing.metadata = this.mergeRecordMetadata(existing.metadata, {
      source: 'participant_join',
      operatorId,
      joinedAt: now.toISOString(),
    });
    await participantRepo.save(existing);
  }

  private async markCallParticipantLeft(
    roomId: string,
    userId: string,
    operatorId: string,
    endSession: boolean,
  ): Promise<void> {
    const sessionRepo = this.getOptionalRepository(RTCCallSession);
    const participantRepo = this.getOptionalRepository(RTCCallParticipant);
    if (!sessionRepo || !participantRepo) {
      return;
    }

    const session = await this.getActiveCallSession(roomId)
      || await sessionRepo.findOne({
        where: { roomId, isDeleted: false },
        order: { createdAt: 'DESC' },
      });
    if (!session) {
      return;
    }

    const now = new Date();
    const existing = await participantRepo.findOne({
      where: { sessionId: session.id, userId, isDeleted: false },
    });
    if (!existing) {
      await participantRepo.save(participantRepo.create({
        sessionId: session.id,
        userId,
        role: 'participant',
        status: 'left',
        leaveTime: now,
        leaveReason: endSession ? 'room_ended' : 'left',
        metadata: {
          source: 'participant_leave_recovery',
          operatorId,
        },
      }));
    } else {
      existing.status = 'left';
      existing.leaveTime = now;
      existing.leaveReason = endSession ? 'room_ended' : 'left';
      existing.metadata = this.mergeRecordMetadata(existing.metadata, {
        source: 'participant_leave',
        operatorId,
        leftAt: now.toISOString(),
      });
      await participantRepo.save(existing);
    }

    if (endSession && (session.status === 'active' || session.status === 'ringing')) {
      session.status = 'ended';
      session.endTime = now;
      session.endReason = 'room_ended';
      session.metadata = this.mergeRecordMetadata(session.metadata, {
        source: 'room_end',
        operatorId,
        endedAt: now.toISOString(),
      });
      await sessionRepo.save(session);
    }
  }

  private async endActiveCallSession(
    roomId: string,
    reason: string,
    operatorId: string,
  ): Promise<void> {
    const sessionRepo = this.getOptionalRepository(RTCCallSession);
    if (!sessionRepo) {
      return;
    }
    const active = await this.getActiveCallSession(roomId);
    if (!active) {
      return;
    }
    const now = new Date();
    active.status = 'ended';
    active.endTime = now;
    active.endReason = reason;
    active.metadata = this.mergeRecordMetadata(active.metadata, {
      source: 'room_end',
      operatorId,
      endedAt: now.toISOString(),
    });
    await sessionRepo.save(active);
  }

  async createChannel(config: {
    provider: string;
    appId: string;
    appKey: string;
    appSecret: string;
    region?: string;
    endpoint?: string;
    extraConfig?: Record<string, any>;
    isActive?: boolean;
  }): Promise<RTCChannelEntity> {
    const provider = this.normalizeProviderOrThrow(config.provider);
    this.ensureProviderSupported(provider);
    this.validateChannelConfig(provider, {
      appId: config.appId,
      appKey: config.appKey,
      appSecret: config.appSecret,
      extraConfig: config.extraConfig,
    });

    const providerCandidates = this.getProviderLookupValues(provider);
    const existing = await this.rtcChannelRepository
      .createQueryBuilder('channel')
      .where('channel.provider IN (:...providers)', { providers: providerCandidates })
      .orderBy('channel.updated_at', 'DESC')
      .getOne();

    if (existing) {
      existing.isDeleted = false;
      existing.provider = provider;
      existing.appId = config.appId;
      existing.appKey = config.appKey;
      existing.appSecret = config.appSecret;
      existing.region = config.region;
      existing.endpoint = config.endpoint;
      existing.extraConfig = config.extraConfig || {};
      existing.isActive = config.isActive ?? true;
      const updated = await this.rtcChannelRepository.save(existing);
      this.channelCache.delete(updated.id);
      return updated;
    }

    const created = await this.rtcChannelRepository.save(this.rtcChannelRepository.create({
      provider,
      appId: config.appId,
      appKey: config.appKey,
      appSecret: config.appSecret,
      region: config.region,
      endpoint: config.endpoint,
      extraConfig: config.extraConfig || {},
      isActive: config.isActive ?? true,
    }));
    return created;
  }

  async getChannels(): Promise<RTCChannelEntity[]> {
    return this.rtcChannelRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async getChannel(id: string): Promise<RTCChannelEntity | null> {
    return this.rtcChannelRepository.findOne({
      where: { id, isDeleted: false },
    });
  }

  async updateChannel(
    id: string,
    config: Partial<Omit<RTCChannelEntity, 'provider'>> & { provider?: string },
  ): Promise<RTCChannelEntity | null> {
    const channel = await this.rtcChannelRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!channel) {
      return null;
    }

    if (config.provider) {
      const provider = this.normalizeProviderOrThrow(config.provider);
      this.ensureProviderSupported(provider);
      channel.provider = provider;
    }
    if (config.appId !== undefined) {
      channel.appId = config.appId;
    }
    if (config.appKey !== undefined) {
      channel.appKey = config.appKey;
    }
    if (config.appSecret !== undefined) {
      channel.appSecret = config.appSecret;
    }
    if (config.region !== undefined) {
      channel.region = config.region;
    }
    if (config.endpoint !== undefined) {
      channel.endpoint = config.endpoint;
    }
    if (config.extraConfig !== undefined) {
      channel.extraConfig = config.extraConfig;
    }
    if (config.isActive !== undefined) {
      channel.isActive = config.isActive;
    }

    this.validateChannelConfig(this.safeNormalizeProvider(channel.provider), {
      appId: channel.appId,
      appKey: channel.appKey,
      appSecret: channel.appSecret,
      extraConfig: channel.extraConfig,
    });

    const saved = await this.rtcChannelRepository.save(channel);
    this.channelCache.delete(saved.id);
    return saved;
  }

  async deleteChannel(id: string): Promise<boolean> {
    const channel = await this.rtcChannelRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!channel) {
      return false;
    }

    channel.isDeleted = true;
    channel.isActive = false;
    await this.rtcChannelRepository.save(channel);
    this.channelCache.delete(id);
    return true;
  }

  async createVideoRecord(recordData: {
    roomId: string;
    channelId?: string;
    provider?: RTCProviderType;
    externalTaskId?: string;
    userId?: string;
    fileName?: string;
    filePath?: string;
    fileType?: string;
    fileSize?: number;
    startTime: Date;
    endTime?: Date;
    status?: 'recording' | 'completed' | 'failed' | 'processing';
    syncStatus?: 'pending' | 'synced' | 'failed';
    metadata?: Record<string, any>;
    errorMessage?: string;
    syncError?: string;
  }): Promise<RTCVideoRecord> {
    if (!recordData.startTime || Number.isNaN(recordData.startTime.getTime())) {
      throw new BadRequestException('Video record startTime is required');
    }
    if (recordData.endTime && recordData.endTime.getTime() <= recordData.startTime.getTime()) {
      throw new BadRequestException('Video record endTime must be greater than startTime');
    }
    if (recordData.fileSize !== undefined && recordData.fileSize < 0) {
      throw new BadRequestException('Video record fileSize must be non-negative');
    }

    const normalizedStatus = recordData.status || 'completed';
    if (normalizedStatus !== 'recording' && !recordData.endTime) {
      throw new BadRequestException('Video record endTime is required when status is not recording');
    }
    const normalizedSyncStatus = recordData.syncStatus
      || (recordData.externalTaskId ? 'pending' : 'synced');

    const room = await this.rtcRoomRepository.findOne({
      where: { id: recordData.roomId, isDeleted: false },
      select: ['id'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const record = this.rtcVideoRecordRepository.create({
      roomId: recordData.roomId,
      channelId: recordData.channelId,
      provider: recordData.provider,
      externalTaskId: recordData.externalTaskId,
      userId: recordData.userId,
      fileName: recordData.fileName,
      filePath: recordData.filePath,
      fileType: recordData.fileType,
      fileSize: recordData.fileSize,
      startTime: recordData.startTime,
      endTime: recordData.endTime,
      status: normalizedStatus,
      syncStatus: normalizedSyncStatus,
      metadata: recordData.metadata,
      errorMessage: recordData.errorMessage,
      syncError: recordData.syncError,
    });
    return this.rtcVideoRecordRepository.save(record);
  }

  async startRoomRecording(
    roomId: string,
    operatorId: string,
    options?: {
      taskId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<RTCVideoRecord> {
    const room = await this.rtcRoomRepository.findOne({
      where: { id: roomId, isDeleted: false },
    });
    if (!room || room.status !== 'active') {
      throw new NotFoundException('Room not found or inactive');
    }
    const participants = this.parseParticipants(room.participants);
    if (!participants.includes(operatorId)) {
      throw new ForbiddenException('Only room participants can start recording');
    }

    const channelEntity = await this.resolveChannelEntity({
      channelId: room.channelId,
      provider: room.provider || undefined,
      operation: 'createRoom',
    });
    if (!channelEntity) {
      throw new NotFoundException('Active RTC channel not found for this room');
    }
    const channel = await this.getChannelClient(channelEntity);
    if (typeof channel.startRecording !== 'function') {
      throw new BadRequestException('Current RTC provider does not support cloud recording');
    }

    const providerRoomId = room.externalRoomId || room.id;
    const request: RTCChannelStartRecordingRequest = {
      roomId: providerRoomId,
      userId: operatorId,
      roomType: room.type,
      taskId: options?.taskId,
      metadata: options?.metadata,
    };
    const task = await channel.startRecording(request);
    const existing = task.taskId
      ? await this.rtcVideoRecordRepository.findOne({
        where: {
          externalTaskId: task.taskId,
          isDeleted: false,
        },
      })
      : null;
    const target = existing || this.rtcVideoRecordRepository.create({
      roomId: room.id,
    });

    target.roomId = room.id;
    target.channelId = channelEntity.id;
    target.provider = normalizeRtcProvider(channelEntity.provider);
    target.externalTaskId = task.taskId;
    target.userId = operatorId;
    target.status = this.normalizeRecordStatus(task.status);
    target.syncStatus = 'pending';
    target.startTime = task.startTime || new Date();
    target.endTime = task.endTime;
    target.fileName = task.fileName || target.fileName;
    target.filePath = task.filePath || target.filePath;
    target.fileType = task.fileType || target.fileType;
    target.fileSize = task.fileSize ?? target.fileSize;
    target.errorMessage = undefined;
    target.syncError = undefined;
    target.metadata = this.mergeRecordMetadata(target.metadata, {
      recordingStart: {
        operatorId,
        requestedTaskId: options?.taskId,
        startedAt: new Date().toISOString(),
      },
      providerTask: task.metadata || null,
      userMetadata: options?.metadata || null,
    });
    target.lastSyncedAt = undefined;

    return this.rtcVideoRecordRepository.save(target);
  }

  async stopRoomRecording(
    roomId: string,
    operatorId: string,
    options: {
      recordId?: string;
      taskId?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<RTCVideoRecord | null> {
    const room = await this.rtcRoomRepository.findOne({
      where: { id: roomId, isDeleted: false },
    });
    if (!room) {
      return null;
    }
    const participants = this.parseParticipants(room.participants);
    if (!participants.includes(operatorId)) {
      throw new ForbiddenException('Only room participants can stop recording');
    }

    let record: RTCVideoRecord | null = null;
    if (options.recordId) {
      record = await this.rtcVideoRecordRepository.findOne({
        where: { id: options.recordId, roomId, isDeleted: false },
      });
    } else if (options.taskId) {
      record = await this.rtcVideoRecordRepository.findOne({
        where: { roomId, externalTaskId: options.taskId, isDeleted: false },
      });
    } else {
      record = await this.rtcVideoRecordRepository
        .createQueryBuilder('record')
        .where('record.room_id = :roomId', { roomId })
        .andWhere('record.is_deleted = false')
        .andWhere('record.status IN (:...statuses)', {
          statuses: ['recording', 'processing'],
        })
        .orderBy('record.start_time', 'DESC')
        .getOne();
    }
    if (!record) {
      return null;
    }

    const channelEntity = record.channelId
      ? await this.rtcChannelRepository.findOne({
        where: { id: record.channelId, isActive: true, isDeleted: false },
      })
      : await this.resolveChannelEntity({
        channelId: room.channelId,
        provider: room.provider || record.provider || undefined,
        operation: 'createRoom',
      });
    if (!channelEntity) {
      throw new NotFoundException('Active RTC channel not found for this recording');
    }
    const channel = await this.getChannelClient(channelEntity);
    if (typeof channel.stopRecording !== 'function') {
      throw new BadRequestException('Current RTC provider does not support cloud recording');
    }

    const providerRoomId = room.externalRoomId || room.id;
    const resolvedTaskId = options.taskId || record.externalTaskId;
    if (!resolvedTaskId) {
      throw new BadRequestException('Recording taskId is required to stop cloud recording');
    }
    const request: RTCChannelStopRecordingRequest = {
      roomId: providerRoomId,
      taskId: resolvedTaskId,
      metadata: options.metadata,
    };
    const task = await channel.stopRecording(request);
    record.status = this.normalizeRecordStatus(task.status);
    record.syncStatus = 'pending';
    record.endTime = task.endTime || new Date();
    record.fileName = task.fileName || record.fileName;
    record.filePath = task.filePath || record.filePath;
    record.fileType = task.fileType || record.fileType;
    record.fileSize = task.fileSize ?? record.fileSize;
    record.externalTaskId = task.taskId || record.externalTaskId;
    record.channelId = channelEntity.id;
    record.provider = normalizeRtcProvider(channelEntity.provider);
    record.syncError = undefined;
    record.errorMessage = undefined;
    record.metadata = this.mergeRecordMetadata(record.metadata, {
      recordingStop: {
        operatorId,
        stoppedAt: new Date().toISOString(),
      },
      providerTask: task.metadata || null,
      userMetadata: options.metadata || null,
    });

    return this.rtcVideoRecordRepository.save(record);
  }

  async syncVideoRecord(
    id: string,
    options?: {
      roomId?: string;
      taskId?: string;
      operatorId?: string;
    },
  ): Promise<RTCVideoRecord | null> {
    const record = await this.rtcVideoRecordRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!record) {
      return null;
    }

    const room = await this.rtcRoomRepository.findOne({
      where: { id: options?.roomId || record.roomId, isDeleted: false },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    const taskId = options?.taskId || record.externalTaskId;
    if (!taskId) {
      throw new BadRequestException('sync requires provider taskId');
    }

    const channelEntity = record.channelId
      ? await this.rtcChannelRepository.findOne({
        where: { id: record.channelId, isActive: true, isDeleted: false },
      })
      : await this.resolveChannelEntity({
        channelId: room.channelId,
        provider: room.provider || record.provider || undefined,
        operation: 'createRoom',
      });
    if (!channelEntity) {
      throw new NotFoundException('Active RTC channel not found for this recording');
    }
    const channel = await this.getChannelClient(channelEntity);
    if (typeof channel.getRecordingTask !== 'function') {
      throw new BadRequestException('Current RTC provider does not support recording task sync');
    }

    try {
      const providerRoomId = room.externalRoomId || room.id;
      const task = await channel.getRecordingTask(providerRoomId, taskId);
      if (!task) {
        record.syncStatus = 'failed';
        record.syncError = 'Provider did not return recording task';
        record.lastSyncedAt = new Date();
        return this.rtcVideoRecordRepository.save(record);
      }
      this.applyRecordingTaskToRecord(record, task, channelEntity.id, channelEntity.provider);
      record.lastSyncedAt = new Date();
      record.syncStatus = task.status === 'completed' || task.status === 'failed'
        ? 'synced'
        : 'pending';
      record.syncError = undefined;
      record.metadata = this.mergeRecordMetadata(record.metadata, {
        sync: {
          operatorId: options?.operatorId,
          syncedAt: new Date().toISOString(),
          status: task.status,
        },
        providerTask: task.metadata || null,
      });
      return this.rtcVideoRecordRepository.save(record);
    } catch (error) {
      record.syncStatus = 'failed';
      record.syncError = error instanceof Error ? error.message : String(error);
      record.lastSyncedAt = new Date();
      await this.rtcVideoRecordRepository.save(record);
      throw error;
    }
  }

  async handleVolcengineRecordingWebhook(payload: Record<string, any>): Promise<{
    updated: boolean;
    recordId?: string;
    reason?: string;
  }> {
    const taskId = this.pickWebhookString(
      payload.taskId,
      payload.taskID,
      payload.TaskId,
      payload.TaskID,
      payload.data?.taskId,
      payload.data?.taskID,
      payload.data?.TaskID,
    );
    if (!taskId) {
      return { updated: false, reason: 'taskId_missing' };
    }

    let record = await this.rtcVideoRecordRepository.findOne({
      where: { externalTaskId: taskId, isDeleted: false },
    });
    if (!record) {
      return { updated: false, reason: 'record_not_found' };
    }

    const callbackStatus = this.normalizeWebhookStatus(
      this.pickWebhookString(
        payload.status,
        payload.Status,
        payload.event,
        payload.Event,
        payload.data?.status,
        payload.data?.Status,
      ),
      record.status,
    );
    record.status = callbackStatus;
    record.syncStatus = callbackStatus === 'completed' || callbackStatus === 'failed'
      ? 'synced'
      : 'pending';
    record.lastSyncedAt = new Date();
    record.metadata = this.mergeRecordMetadata(record.metadata, {
      callback: {
        receivedAt: new Date().toISOString(),
        payload,
      },
    });
    const callbackFilePath = this.pickWebhookString(
      payload.filePath,
      payload.fileUrl,
      payload.url,
      payload.FilePath,
      payload.FileUrl,
      payload.URL,
      payload.data?.filePath,
      payload.data?.fileUrl,
      payload.data?.url,
    );
    if (callbackFilePath) {
      record.filePath = callbackFilePath;
    }
    const callbackFileName = this.pickWebhookString(
      payload.fileName,
      payload.FileName,
      payload.data?.fileName,
      payload.data?.FileName,
    );
    if (callbackFileName) {
      record.fileName = callbackFileName;
    }
    const callbackFileType = this.pickWebhookString(
      payload.fileType,
      payload.FileType,
      payload.data?.fileType,
      payload.data?.FileType,
    );
    if (callbackFileType) {
      record.fileType = callbackFileType;
    }
    const callbackFileSize = this.pickWebhookNumber(
      payload.fileSize,
      payload.FileSize,
      payload.data?.fileSize,
      payload.data?.FileSize,
    );
    if (callbackFileSize !== undefined) {
      record.fileSize = callbackFileSize;
    }
    const callbackEndTime = this.pickWebhookDate(
      payload.endTime,
      payload.EndTime,
      payload.data?.endTime,
      payload.data?.EndTime,
    );
    if (callbackEndTime) {
      record.endTime = callbackEndTime;
    } else if (record.status !== 'recording' && !record.endTime) {
      record.endTime = new Date();
    }

    if (record.provider === 'volcengine' && record.channelId && record.roomId) {
      try {
        record = (await this.syncVideoRecord(record.id, { taskId })) || record;
      } catch (error) {
        this.logger.warn(`RTC webhook sync fallback failed: ${String(error)}`);
      }
    } else {
      record = await this.rtcVideoRecordRepository.save(record);
    }

    return {
      updated: true,
      recordId: record.id,
    };
  }

  async getVideoRecord(id: string): Promise<RTCVideoRecord | null> {
    return this.rtcVideoRecordRepository.findOne({
      where: { id, isDeleted: false },
    });
  }

  async getVideoRecordsByRoomId(roomId: string): Promise<RTCVideoRecord[]> {
    return this.rtcVideoRecordRepository.find({
      where: { roomId, isDeleted: false },
      order: { startTime: 'DESC' },
    });
  }

  async getVideoRecordsByUserId(
    userId: string,
    limit?: number,
    offset?: number,
    filter?: RTCVideoRecordQueryFilter,
  ): Promise<RTCVideoRecord[]> {
    const hasPagination = limit !== undefined || offset !== undefined;
    const safeLimit = hasPagination ? Math.max(1, Math.min(limit ?? 50, 200)) : undefined;
    const safeOffset = hasPagination ? Math.max(0, offset ?? 0) : undefined;
    const queryBuilder = this.rtcVideoRecordRepository
      .createQueryBuilder('record')
      .where('record.user_id = :userId', { userId })
      .andWhere('record.is_deleted = false')
      .orderBy('record.start_time', 'DESC');
    if (filter?.status) {
      queryBuilder.andWhere('record.status = :status', { status: filter.status });
    }
    if (filter?.syncStatus) {
      queryBuilder.andWhere('record.sync_status = :syncStatus', {
        syncStatus: filter.syncStatus,
      });
    }
    if (safeLimit !== undefined) {
      queryBuilder.take(safeLimit);
    }
    if (safeOffset !== undefined) {
      queryBuilder.skip(safeOffset);
    }
    return queryBuilder.getMany();
  }

  async updateVideoRecordStatus(
    id: string,
    status: 'recording' | 'completed' | 'failed' | 'processing',
    errorMessage?: string,
  ): Promise<RTCVideoRecord | null> {
    const record = await this.rtcVideoRecordRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!record) {
      return null;
    }
    record.status = status;
    if (status !== 'failed') {
      record.errorMessage = undefined;
    } else if (errorMessage) {
      record.errorMessage = errorMessage;
    }
    return this.rtcVideoRecordRepository.save(record);
  }

  async updateVideoRecordMetadata(
    id: string,
    metadata: Record<string, any>,
  ): Promise<RTCVideoRecord | null> {
    const record = await this.rtcVideoRecordRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!record) {
      return null;
    }
    record.metadata = metadata;
    return this.rtcVideoRecordRepository.save(record);
  }

  async deleteVideoRecord(id: string): Promise<boolean> {
    const record = await this.rtcVideoRecordRepository.findOne({
      where: { id, isDeleted: false },
      select: ['id', 'isDeleted'],
    });
    if (!record) {
      return false;
    }
    record.isDeleted = true;
    await this.rtcVideoRecordRepository.save(record);
    return true;
  }

  async getVideoRecords(limit: number = 50, offset: number = 0): Promise<RTCVideoRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    return this.rtcVideoRecordRepository.find({
      where: { isDeleted: false },
      order: { startTime: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });
  }

  getProviderOperationStats(query?: RTCProviderOperationStatQuery): RTCProviderOperationStat[] {
    const normalizedQuery = this.normalizeProviderOperationStatQuery(query);
    if (normalizedQuery.windowMinutes) {
      return this.getProviderOperationStatsInWindow(normalizedQuery);
    }

    return Array.from(this.providerOperationStats.entries())
      .map(([key, item]) => this.toProviderOperationStat(
        key,
        item,
        normalizedQuery.topErrorLimit,
      ))
      .filter((item) => this.matchesProviderOperationFilter(item, normalizedQuery))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  getProviderHealthReport(query?: RTCProviderHealthQuery): RTCProviderHealthReport {
    return this.buildProviderHealthReport(query, true);
  }

  async getProviderCapabilities(): Promise<RTCProviderCapabilitiesReport> {
    const activeChannels = await this.rtcChannelRepository.find({
      where: {
        isActive: true,
        isDeleted: false,
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    const channelByProvider = new Map<RTCProviderType, RTCChannelEntity>();
    for (const channel of activeChannels) {
      const provider = this.safeNormalizeProvider(channel.provider);
      if (!channelByProvider.has(provider)) {
        channelByProvider.set(provider, channel);
      }
    }

    const health = this.getProviderHealthReport({
      operation: 'generateToken',
      windowMinutes: this.providerHealthDefaults.windowMinutes,
      topErrorLimit: this.providerHealthDefaults.topErrorLimit,
      minSamples: this.healthRoutingMinSamples,
      controlPlaneMinSamples: this.providerHealthDefaults.controlPlaneMinSamples,
      degradedFailureRate: this.providerHealthDefaults.degradedFailureRate,
      unhealthyFailureRate: this.providerHealthDefaults.unhealthyFailureRate,
      degradedLatencyMs: this.providerHealthDefaults.degradedLatencyMs,
      unhealthyLatencyMs: this.providerHealthDefaults.unhealthyLatencyMs,
      degradedControlPlaneRetryRate: this.providerHealthDefaults.degradedControlPlaneRetryRate,
      unhealthyControlPlaneRetryRate: this.providerHealthDefaults.unhealthyControlPlaneRetryRate,
      degradedControlPlaneCircuitOpenRate: this.providerHealthDefaults.degradedControlPlaneCircuitOpenRate,
      unhealthyControlPlaneCircuitOpenRate: this.providerHealthDefaults.unhealthyControlPlaneCircuitOpenRate,
    });

    const providers = this.getCandidateProvidersForHealth(new Map())
      .map((provider): RTCProviderCapabilityItem => {
        const channel = channelByProvider.get(provider);
        const staticCapability = RTC_PROVIDER_STATIC_CAPABILITIES[provider];
        return {
          provider,
          configured: !!channel,
          channelId: channel?.id,
          supportsRecording: staticCapability.supportsRecording,
          tokenStrategies: [...staticCapability.tokenStrategies],
          supportsControlPlaneDelegate: staticCapability.supportsControlPlaneDelegate,
        };
      });

    return {
      defaultProvider: this.defaultProvider,
      recommendedPrimary: health.recommendedPrimary,
      fallbackOrder: health.fallbackOrder,
      activeProviders: providers
        .filter((item) => item.configured)
        .map((item) => item.provider),
      providers,
    };
  }

  private buildProviderHealthReport(
    query?: RTCProviderHealthQuery,
    emitMetrics: boolean = true,
  ): RTCProviderHealthReport {
    const normalized = this.normalizeProviderHealthQuery(query);
    const operationStats = this.getProviderOperationStats({
      provider: normalized.provider,
      operation: normalized.operation,
      windowMinutes: normalized.windowMinutes,
      topErrorLimit: Math.max(normalized.topErrorLimit, 10),
    });
    const statsByProvider = new Map<RTCProviderType, RTCProviderOperationStat[]>();
    for (const item of operationStats) {
      const list = statsByProvider.get(item.provider) || [];
      list.push(item);
      statsByProvider.set(item.provider, list);
    }

    const providers = this.getCandidateProvidersForHealth(statsByProvider);
    const healthItems = providers.map((provider) => this.buildProviderHealthItem(
      provider,
      statsByProvider.get(provider) || [],
      normalized,
    ));
    const sorted = healthItems.sort((left, right) => this.compareProviderHealth(left, right));
    if (emitMetrics) {
      this.publishProviderHealthMetrics(sorted);
    }

    return {
      generatedAt: new Date(),
      windowMinutes: normalized.windowMinutes,
      operation: normalized.operation,
      recommendedPrimary: this.pickRecommendedPrimary(sorted, this.defaultProvider),
      fallbackOrder: sorted.map((item) => item.provider),
      providers: sorted,
    };
  }

  private mapToRTCRoom(entity: RTCRoomEntity): RTCRoom {
    return {
      id: entity.id,
      uuid: entity.uuid,
      name: entity.name,
      type: entity.type,
      creatorId: entity.creatorId,
      participants: this.parseParticipants(entity.participants),
      status: entity.status,
      channelId: entity.channelId,
      provider: entity.provider ? this.safeNormalizeProvider(entity.provider) : undefined,
      externalRoomId: entity.externalRoomId,
      aiEnabled: entity.aiEnabled,
      aiMetadata: entity.aiMetadata,
      startedAt: entity.startedAt,
      endedAt: entity.endedAt,
    };
  }

  private parseParticipants(raw: unknown): string[] {
    if (Array.isArray(raw)) {
      return this.normalizeParticipants(raw.filter((item) => typeof item === 'string') as string[]);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return this.normalizeParticipants(parsed.filter((item) => typeof item === 'string') as string[]);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse room participants: ${String(error)}`);
      }
    }
    return [];
  }

  private normalizeParticipants(participants: string[]): string[] {
    return [...new Set(
      participants
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    )];
  }

  private normalizeRecordStatus(
    status: RTCChannelRecordingTask['status'] | string | undefined,
  ): 'recording' | 'processing' | 'completed' | 'failed' {
    const normalized = String(status || '').trim().toLowerCase();
    if (!normalized) {
      return 'processing';
    }
    if (normalized === 'recording') {
      return 'recording';
    }
    if (normalized === 'completed') {
      return 'completed';
    }
    if (normalized === 'failed') {
      return 'failed';
    }
    if (normalized === 'stopped') {
      return 'processing';
    }
    if (normalized.includes('record') || normalized.includes('running')) {
      return 'recording';
    }
    if (normalized.includes('complete') || normalized.includes('success') || normalized.includes('finish')) {
      return 'completed';
    }
    if (normalized.includes('fail') || normalized.includes('error')) {
      return 'failed';
    }
    return 'processing';
  }

  private applyRecordingTaskToRecord(
    record: RTCVideoRecord,
    task: RTCChannelRecordingTask,
    channelId: string,
    provider: string,
  ): void {
    record.channelId = channelId;
    record.provider = this.safeNormalizeProvider(provider);
    record.externalTaskId = task.taskId || record.externalTaskId;
    record.status = this.normalizeRecordStatus(task.status);
    record.startTime = task.startTime || record.startTime || new Date();
    if (task.endTime) {
      record.endTime = task.endTime;
    } else if (record.status !== 'recording' && !record.endTime) {
      record.endTime = new Date();
    }
    if (task.fileName) {
      record.fileName = task.fileName;
    }
    if (task.filePath) {
      record.filePath = task.filePath;
    }
    if (task.fileType) {
      record.fileType = task.fileType;
    }
    if (task.fileSize !== undefined) {
      record.fileSize = task.fileSize;
    }
  }

  private mergeRecordMetadata(
    existing: Record<string, any> | undefined,
    patch: Record<string, any>,
  ): Record<string, any> {
    return {
      ...(existing || {}),
      ...patch,
    };
  }

  private pickWebhookString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return undefined;
  }

  private pickWebhookNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  private pickWebhookDate(...values: unknown[]): Date | undefined {
    for (const value of values) {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
      }
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        const millis = value > 100000000000 ? value : value * 1000;
        const date = new Date(millis);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
      if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric > 0) {
          const millis = numeric > 100000000000 ? numeric : numeric * 1000;
          const numericDate = new Date(millis);
          if (!Number.isNaN(numericDate.getTime())) {
            return numericDate;
          }
        }
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  private normalizeWebhookStatus(
    input: string | undefined,
    fallback: RTCVideoRecord['status'],
  ): RTCVideoRecord['status'] {
    if (!input) {
      return fallback;
    }
    const normalized = input.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    if (normalized.includes('record') || normalized.includes('running') || normalized === 'start') {
      return 'recording';
    }
    if (normalized.includes('complete') || normalized.includes('success') || normalized.includes('finish')) {
      return 'completed';
    }
    if (normalized.includes('fail') || normalized.includes('error')) {
      return 'failed';
    }
    if (normalized.includes('stop') || normalized.includes('cancel') || normalized.includes('process')) {
      return 'processing';
    }
    return fallback;
  }

  private validateRoomParticipants(type: 'p2p' | 'group', participants: string[]): void {
    if (type === 'p2p' && participants.length !== 2) {
      throw new BadRequestException('P2P room must contain exactly 2 participants');
    }
    if (type === 'group' && participants.length < 2) {
      throw new BadRequestException('Group room must contain at least 2 participants');
    }
  }

  private readDefaultProvider(): RTCProviderType {
    const raw = this.configService.get<string>('RTC_DEFAULT_PROVIDER') || RTC_DEFAULT_PROVIDER;
    return this.normalizeProviderOrThrow(raw);
  }

  private readProviderStatsHistoryDefaults(): RTCProviderStatsHistoryDefaults {
    const maxEvents = this.readConfigBoundedInteger(
      'RTC_PROVIDER_STATS_HISTORY_MAX_EVENTS',
      5000,
      1,
      100000,
    );
    const maxAgeMinutes = this.readConfigBoundedInteger(
      'RTC_PROVIDER_STATS_HISTORY_MAX_AGE_MINUTES',
      24 * 60,
      1,
      7 * 24 * 60,
    );
    return {
      maxEvents,
      maxAgeMs: maxAgeMinutes * 60 * 1000,
    };
  }

  private readProviderHealthDefaults(): RTCProviderHealthDefaults {
    const defaults: RTCProviderHealthDefaults = {
      windowMinutes: this.readConfigBoundedInteger(
        'RTC_PROVIDER_HEALTH_WINDOW_MINUTES',
        60,
        1,
        1440,
      ),
      topErrorLimit: this.readConfigBoundedInteger(
        'RTC_PROVIDER_HEALTH_TOP_ERROR_LIMIT',
        3,
        1,
        10,
      ),
      minSamples: this.readConfigBoundedInteger(
        'RTC_PROVIDER_HEALTH_MIN_SAMPLES',
        5,
        1,
        1000,
      ),
      controlPlaneMinSamples: this.readConfigBoundedInteger(
        'RTC_PROVIDER_HEALTH_CONTROL_PLANE_MIN_SAMPLES',
        5,
        1,
        1000,
      ),
      degradedFailureRate: this.readConfigBoundedNumber(
        'RTC_PROVIDER_HEALTH_DEGRADED_FAILURE_RATE',
        0.15,
        0,
        1,
      ),
      unhealthyFailureRate: this.readConfigBoundedNumber(
        'RTC_PROVIDER_HEALTH_UNHEALTHY_FAILURE_RATE',
        0.35,
        0,
        1,
      ),
      degradedLatencyMs: this.readConfigBoundedNumber(
        'RTC_PROVIDER_HEALTH_DEGRADED_LATENCY_MS',
        250,
        1,
        10000,
      ),
      unhealthyLatencyMs: this.readConfigBoundedNumber(
        'RTC_PROVIDER_HEALTH_UNHEALTHY_LATENCY_MS',
        700,
        1,
        20000,
      ),
      degradedControlPlaneRetryRate: this.readConfigBoundedNumber(
        'RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_RETRY_RATE',
        0.25,
        0,
        1,
      ),
      unhealthyControlPlaneRetryRate: this.readConfigBoundedNumber(
        'RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_RETRY_RATE',
        0.5,
        0,
        1,
      ),
      degradedControlPlaneCircuitOpenRate: this.readConfigBoundedNumber(
        'RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_CIRCUIT_OPEN_RATE',
        0.05,
        0,
        1,
      ),
      unhealthyControlPlaneCircuitOpenRate: this.readConfigBoundedNumber(
        'RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_CIRCUIT_OPEN_RATE',
        0.2,
        0,
        1,
      ),
    };

    if (defaults.degradedFailureRate >= defaults.unhealthyFailureRate) {
      throw new Error(
        'Invalid RTC provider health defaults: RTC_PROVIDER_HEALTH_DEGRADED_FAILURE_RATE must be smaller than RTC_PROVIDER_HEALTH_UNHEALTHY_FAILURE_RATE',
      );
    }
    if (defaults.degradedLatencyMs >= defaults.unhealthyLatencyMs) {
      throw new Error(
        'Invalid RTC provider health defaults: RTC_PROVIDER_HEALTH_DEGRADED_LATENCY_MS must be smaller than RTC_PROVIDER_HEALTH_UNHEALTHY_LATENCY_MS',
      );
    }
    if (defaults.degradedControlPlaneRetryRate >= defaults.unhealthyControlPlaneRetryRate) {
      throw new Error(
        'Invalid RTC provider health defaults: RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_RETRY_RATE must be smaller than RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_RETRY_RATE',
      );
    }
    if (defaults.degradedControlPlaneCircuitOpenRate >= defaults.unhealthyControlPlaneCircuitOpenRate) {
      throw new Error(
        'Invalid RTC provider health defaults: RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_CIRCUIT_OPEN_RATE must be smaller than RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_CIRCUIT_OPEN_RATE',
      );
    }

    return defaults;
  }

  private readConfigBoundedInteger(
    key: string,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    return this.readBoundedInteger(this.configService.get(key), defaultValue, min, max);
  }

  private readConfigBoundedNumber(
    key: string,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    return this.readBoundedNumber(this.configService.get(key), defaultValue, min, max);
  }

  private readConfigBoolean(key: string, defaultValue: boolean): boolean {
    const raw = this.configService.get(key);
    if (typeof raw === 'boolean') {
      return raw;
    }
    if (typeof raw === 'number') {
      return raw !== 0;
    }
    if (typeof raw !== 'string') {
      return defaultValue;
    }
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
      return false;
    }
    return defaultValue;
  }

  private registerProviders(): void {
    try {
      this.registerProvider('volcengine', VolcengineRTCChannel);
      this.registerProvider('tencent', TencentRTCChannel);
      this.registerProvider('alibaba', AlibabaRTCChannel);
      this.registerProvider('livekit', LiveKitRTCChannel);
      this.logger.log(
        `RTC providers registered: ${JSON.stringify(rtcChannelFactory.getSupportedProviders())}`,
      );
    } catch (error) {
      this.logger.error('Failed to register RTC providers', error);
    }
  }

  private registerProvider(provider: string, providerClass: new () => RTCChannel): void {
    const supported = rtcChannelFactory.getSupportedProviders();
    if (!supported.includes(provider)) {
      rtcChannelFactory.registerProvider(provider as RTCProviderType, providerClass);
    }
  }

  private ensureProviderSupported(provider: RTCProviderType): void {
    const supported = rtcChannelFactory.getSupportedProviders();
    if (!supported.includes(provider)) {
      throw new BadRequestException(`RTC provider not supported: ${provider}`);
    }
  }

  private normalizeProviderOrThrow(provider: string): RTCProviderType {
    try {
      return normalizeRtcProvider(provider);
    } catch {
      throw new BadRequestException(`Unsupported RTC provider: ${provider}`);
    }
  }

  private safeNormalizeProvider(provider: string): RTCProviderType {
    try {
      return normalizeRtcProvider(provider);
    } catch {
      return this.defaultProvider;
    }
  }

  private getProviderLookupValues(provider: RTCProviderType): string[] {
    return [provider];
  }

  private async resolveChannelEntity(options: {
    channelId?: string;
    provider?: string;
    operation?: 'createRoom' | 'generateToken' | 'validateToken';
  }): Promise<RTCChannelEntity | null> {
    if (options.channelId) {
      const byId = await this.rtcChannelRepository.findOne({
        where: { id: options.channelId, isActive: true, isDeleted: false },
      });
      if (!byId) {
        throw new NotFoundException('RTC channel not found');
      }
      return byId;
    }

    if (options.provider) {
      const normalized = this.normalizeProviderOrThrow(options.provider);
      const providers = this.getProviderLookupValues(normalized);
      const byProvider = await this.rtcChannelRepository
        .createQueryBuilder('channel')
        .where('channel.is_active = :isActive', { isActive: true })
        .andWhere('channel.is_deleted = false')
        .andWhere('channel.provider IN (:...providers)', { providers })
        .orderBy('channel.updated_at', 'DESC')
        .getOne();
      if (!byProvider) {
        return null;
      }
      return byProvider;
    }

    const preferredProvider = this.resolvePreferredProviderByHealth(options.operation);
    if (preferredProvider) {
      const preferredProviders = this.getProviderLookupValues(preferredProvider);
      const preferredChannel = await this.rtcChannelRepository
        .createQueryBuilder('channel')
        .where('channel.is_active = :isActive', { isActive: true })
        .andWhere('channel.is_deleted = false')
        .andWhere('channel.provider IN (:...providers)', { providers: preferredProviders })
        .orderBy('channel.updated_at', 'DESC')
        .getOne();
      if (preferredChannel) {
        return preferredChannel;
      }
    }

    const defaultProviders = this.getProviderLookupValues(this.defaultProvider);
    const defaultChannel = await this.rtcChannelRepository
      .createQueryBuilder('channel')
      .where('channel.is_active = :isActive', { isActive: true })
      .andWhere('channel.is_deleted = false')
      .andWhere('channel.provider IN (:...providers)', { providers: defaultProviders })
      .orderBy('channel.updated_at', 'DESC')
      .getOne();
    if (defaultChannel) {
      return defaultChannel;
    }

    return this.rtcChannelRepository
      .createQueryBuilder('channel')
      .where('channel.is_active = :isActive', { isActive: true })
      .andWhere('channel.is_deleted = false')
      .orderBy('channel.updated_at', 'DESC')
      .getOne();
  }

  private resolvePreferredProviderByHealth(
    operation?: 'createRoom' | 'generateToken' | 'validateToken',
  ): RTCProviderType | undefined {
    if (!this.healthBasedRoutingEnabled || !operation) {
      return undefined;
    }
    const report = this.buildProviderHealthReport({
      operation,
      windowMinutes: this.providerHealthDefaults.windowMinutes,
      topErrorLimit: this.providerHealthDefaults.topErrorLimit,
      minSamples: this.healthRoutingMinSamples,
      controlPlaneMinSamples: this.providerHealthDefaults.controlPlaneMinSamples,
      degradedFailureRate: this.providerHealthDefaults.degradedFailureRate,
      unhealthyFailureRate: this.providerHealthDefaults.unhealthyFailureRate,
      degradedLatencyMs: this.providerHealthDefaults.degradedLatencyMs,
      unhealthyLatencyMs: this.providerHealthDefaults.unhealthyLatencyMs,
      degradedControlPlaneRetryRate: this.providerHealthDefaults.degradedControlPlaneRetryRate,
      unhealthyControlPlaneRetryRate: this.providerHealthDefaults.unhealthyControlPlaneRetryRate,
      degradedControlPlaneCircuitOpenRate: this.providerHealthDefaults.degradedControlPlaneCircuitOpenRate,
      unhealthyControlPlaneCircuitOpenRate: this.providerHealthDefaults.unhealthyControlPlaneCircuitOpenRate,
    }, false);

    return report.recommendedPrimary;
  }

  private toChannelConfig(entity: RTCChannelEntity): RTCChannelConfig {
    const provider = this.normalizeProviderOrThrow(entity.provider);
    return {
      provider,
      appId: entity.appId,
      appKey: entity.appKey,
      appSecret: entity.appSecret,
      region: entity.region,
      endpoint: entity.endpoint,
      ...entity.extraConfig,
    };
  }

  private async getChannelClient(channelEntity: RTCChannelEntity): Promise<RTCChannel> {
    const cache = this.channelCache.get(channelEntity.id);
    const updatedAt = channelEntity.updatedAt?.getTime() || 0;
    if (cache && cache.updatedAt === updatedAt) {
      return cache.channel;
    }

    const provider = this.normalizeProviderOrThrow(channelEntity.provider);
    const channel = rtcChannelFactory.createChannel(provider);
    await channel.initialize(this.toChannelConfig(channelEntity));
    this.channelCache.set(channelEntity.id, {
      updatedAt,
      channel,
    });
    return channel;
  }

  private async getChannelClientById(channelId: string): Promise<RTCChannel | null> {
    const channelEntity = await this.rtcChannelRepository.findOne({
      where: { id: channelId, isActive: true, isDeleted: false },
    });
    if (!channelEntity) {
      return null;
    }
    return this.getChannelClient(channelEntity);
  }

  private async getChannelClientByProvider(provider: string | undefined): Promise<RTCChannel | null> {
    if (!provider) {
      return null;
    }
    const channelEntity = await this.resolveChannelEntity({ provider });
    if (!channelEntity) {
      return null;
    }
    return this.getChannelClient(channelEntity);
  }

  private async callAiExtension(hook: keyof RtcAiExtension, payload: any): Promise<void> {
    const fn = this.aiExtension?.[hook];
    if (typeof fn !== 'function') {
      return;
    }
    try {
      await (fn as (context: any) => Promise<void> | void)(payload);
    } catch (error) {
      this.logger.warn(`RTC AI extension hook failed: ${String(hook)} -> ${String(error)}`);
    }
  }

  private createProviderOperationException(
    provider: RTCProviderType,
    operation: 'createRoom' | 'generateToken' | 'validateToken',
    error: unknown,
    durationMs?: number,
    controlPlaneSignals?: RTCControlPlaneSignalSummary,
  ): BadRequestException {
    const normalized = this.normalizeProviderError(provider, operation, error);
    this.recordProviderOperationFailure(
      normalized,
      durationMs || 0,
      controlPlaneSignals,
    );
    this.logger.warn(
      `RTC provider operation failed: ${normalized.provider}/${normalized.operation}/${normalized.code} - ${normalized.message}`,
    );
    return new BadRequestException({
      message: `RTC provider ${operation} failed`,
      provider: normalized.provider,
      operation: normalized.operation,
      providerStatusCode: normalized.statusCode,
      providerErrorCode: normalized.code,
      retryable: normalized.retryable,
      providerMessage: normalized.message,
    });
  }

  private recordProviderOperationSuccess(
    provider: RTCProviderType,
    operation: 'createRoom' | 'generateToken' | 'validateToken',
    durationMs: number,
    controlPlaneSignals?: RTCControlPlaneSignalSummary,
  ): void {
    const key = `${provider}:${operation}`;
    const previous = this.providerOperationStats.get(key);
    const safeDuration = Math.max(0, Math.floor(durationMs));
    const controlPlaneMetrics = this.toControlPlaneSignalMetrics(controlPlaneSignals);
    const next: RTCProviderOperationAggregate = {
      provider,
      operation,
      total: (previous?.total || 0) + 1,
      success: (previous?.success || 0) + 1,
      failure: previous?.failure || 0,
      retryableFailure: previous?.retryableFailure || 0,
      totalDurationMs: (previous?.totalDurationMs || 0) + safeDuration,
      controlPlaneInvocations: (previous?.controlPlaneInvocations || 0) + controlPlaneMetrics.invocations,
      controlPlaneRetries: (previous?.controlPlaneRetries || 0) + controlPlaneMetrics.retries,
      controlPlaneCircuitOpenShortCircuits:
        (previous?.controlPlaneCircuitOpenShortCircuits || 0) + controlPlaneMetrics.circuitOpenShortCircuits,
      controlPlaneUnsafeIdempotencyCalls:
        (previous?.controlPlaneUnsafeIdempotencyCalls || 0) + controlPlaneMetrics.unsafeIdempotencyCalls,
      lastStatus: 'success',
      lastDurationMs: safeDuration,
      lastErrorCode: undefined,
      lastErrorMessage: undefined,
      updatedAt: new Date(),
    };
    this.providerOperationStats.set(key, next);
    this.pushProviderOperationHistory(key, {
      timestamp: Date.now(),
      status: 'success',
      durationMs: safeDuration,
      retryable: false,
      controlPlaneInvocations: controlPlaneMetrics.invocations,
      controlPlaneRetries: controlPlaneMetrics.retries,
      controlPlaneCircuitOpenShortCircuits: controlPlaneMetrics.circuitOpenShortCircuits,
      controlPlaneUnsafeIdempotencyCalls: controlPlaneMetrics.unsafeIdempotencyCalls,
    });
    this.prometheusService?.incrementRtcProviderOperation(
      provider,
      operation,
      'success',
      false,
    );
    this.prometheusService?.observeRtcProviderOperationDuration(
      provider,
      operation,
      'success',
      safeDuration,
    );
    this.emitControlPlaneSignalMetrics(provider, operation, controlPlaneMetrics);
  }

  private recordProviderOperationFailure(
    context: RTCProviderErrorContext,
    durationMs: number,
    controlPlaneSignals?: RTCControlPlaneSignalSummary,
  ): void {
    const provider = this.safeNormalizeProvider(context.provider);
    const key = `${provider}:${context.operation}`;
    const previous = this.providerOperationStats.get(key);
    const safeDuration = Math.max(0, Math.floor(durationMs));
    const controlPlaneMetrics = this.toControlPlaneSignalMetrics(controlPlaneSignals);
    const next: RTCProviderOperationAggregate = {
      provider,
      operation: context.operation,
      total: (previous?.total || 0) + 1,
      success: previous?.success || 0,
      failure: (previous?.failure || 0) + 1,
      retryableFailure: (previous?.retryableFailure || 0) + (context.retryable ? 1 : 0),
      totalDurationMs: (previous?.totalDurationMs || 0) + safeDuration,
      controlPlaneInvocations: (previous?.controlPlaneInvocations || 0) + controlPlaneMetrics.invocations,
      controlPlaneRetries: (previous?.controlPlaneRetries || 0) + controlPlaneMetrics.retries,
      controlPlaneCircuitOpenShortCircuits:
        (previous?.controlPlaneCircuitOpenShortCircuits || 0) + controlPlaneMetrics.circuitOpenShortCircuits,
      controlPlaneUnsafeIdempotencyCalls:
        (previous?.controlPlaneUnsafeIdempotencyCalls || 0) + controlPlaneMetrics.unsafeIdempotencyCalls,
      lastStatus: 'failure',
      lastDurationMs: safeDuration,
      lastErrorCode: context.code,
      lastErrorMessage: context.message,
      updatedAt: new Date(),
    };
    this.providerOperationStats.set(key, next);
    this.pushProviderOperationHistory(key, {
      timestamp: Date.now(),
      status: 'failure',
      durationMs: safeDuration,
      retryable: context.retryable,
      controlPlaneInvocations: controlPlaneMetrics.invocations,
      controlPlaneRetries: controlPlaneMetrics.retries,
      controlPlaneCircuitOpenShortCircuits: controlPlaneMetrics.circuitOpenShortCircuits,
      controlPlaneUnsafeIdempotencyCalls: controlPlaneMetrics.unsafeIdempotencyCalls,
      errorCode: context.code,
      errorMessage: context.message,
    });
    this.incrementProviderErrorCounter(key, context.code);
    this.prometheusService?.incrementRtcProviderOperation(
      provider,
      context.operation,
      'failure',
      context.retryable,
    );
    this.prometheusService?.observeRtcProviderOperationDuration(
      provider,
      context.operation,
      'failure',
      safeDuration,
    );
    this.emitControlPlaneSignalMetrics(provider, context.operation, controlPlaneMetrics);
  }

  private toControlPlaneSignalMetrics(
    signals?: RTCControlPlaneSignalSummary,
  ): RTCProviderControlPlaneSignalMetrics {
    const normalizeCount = (value: unknown): number => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return 0;
      }
      return Math.max(0, Math.trunc(parsed));
    };

    return {
      invocations: normalizeCount(signals?.invocations),
      retries: normalizeCount(signals?.retries),
      circuitOpenShortCircuits: normalizeCount(signals?.circuitOpenShortCircuits),
      unsafeIdempotencyCalls: normalizeCount(signals?.unsafeIdempotencyCalls),
    };
  }

  private emitControlPlaneSignalMetrics(
    provider: RTCProviderType,
    operation: 'createRoom' | 'generateToken' | 'validateToken',
    metrics: RTCProviderControlPlaneSignalMetrics,
  ): void {
    if (!this.prometheusService) {
      return;
    }
    if (metrics.invocations > 0) {
      this.prometheusService.incrementRtcControlPlaneSignal?.(
        provider,
        operation,
        'invocation',
        metrics.invocations,
      );
    }
    if (metrics.retries > 0) {
      this.prometheusService.incrementRtcControlPlaneSignal?.(
        provider,
        operation,
        'retry',
        metrics.retries,
      );
    }
    if (metrics.circuitOpenShortCircuits > 0) {
      this.prometheusService.incrementRtcControlPlaneSignal?.(
        provider,
        operation,
        'circuit_open_short_circuit',
        metrics.circuitOpenShortCircuits,
      );
    }
    if (metrics.unsafeIdempotencyCalls > 0) {
      this.prometheusService.incrementRtcControlPlaneSignal?.(
        provider,
        operation,
        'unsafe_idempotency',
        metrics.unsafeIdempotencyCalls,
      );
    }
  }

  private publishProviderHealthMetrics(items: RTCProviderHealthItem[]): void {
    if (!this.prometheusService) {
      return;
    }
    for (const item of items) {
      this.prometheusService.setRtcProviderHealth(
        item.provider,
        item.status,
        item.failureRate,
        item.avgDurationMs,
        item.total,
        {
          retryRate: item.controlPlaneRetryRate,
          circuitOpenRate: item.controlPlaneCircuitOpenRate,
          invocations: item.controlPlaneInvocations,
          retries: item.controlPlaneRetries,
          circuitOpenShortCircuits: item.controlPlaneCircuitOpenShortCircuits,
          unsafeIdempotencyCalls: item.controlPlaneUnsafeIdempotencyCalls,
        },
      );
    }
  }

  private pushProviderOperationHistory(key: string, event: RTCProviderOperationEvent): void {
    const history = this.providerOperationHistory.get(key) || [];
    history.push(event);
    const minTimestamp = Date.now() - this.providerStatsHistoryDefaults.maxAgeMs;
    while (history.length > 0) {
      const overflow = history.length > this.providerStatsHistoryDefaults.maxEvents;
      const expired = history[0].timestamp < minTimestamp;
      if (!overflow && !expired) {
        break;
      }
      history.shift();
    }
    this.providerOperationHistory.set(key, history);
  }

  private incrementProviderErrorCounter(key: string, code: string): void {
    const counters = this.providerOperationErrorCounters.get(key) || new Map<string, number>();
    counters.set(code, (counters.get(code) || 0) + 1);
    this.providerOperationErrorCounters.set(key, counters);
  }

  private getProviderOperationStatsInWindow(query: {
    provider?: RTCProviderType;
    operation?: 'createRoom' | 'generateToken' | 'validateToken';
    windowMinutes?: number;
    topErrorLimit: number;
  }): RTCProviderOperationStat[] {
    const cutoff = Date.now() - (query.windowMinutes || 0) * 60 * 1000;
    const aggregates = new Map<string, RTCProviderOperationAggregate>();
    const errorCountersByKey = new Map<string, Map<string, number>>();

    for (const [key, events] of this.providerOperationHistory.entries()) {
      const { provider, operation } = this.parseProviderOperationKey(key);
      if (!provider || !operation) {
        continue;
      }
      if (query.provider && query.provider !== provider) {
        continue;
      }
      if (query.operation && query.operation !== operation) {
        continue;
      }

      for (const event of events) {
        if (event.timestamp < cutoff) {
          continue;
        }
        const previous = aggregates.get(key);
        const next: RTCProviderOperationAggregate = {
          provider,
          operation,
          total: (previous?.total || 0) + 1,
          success: (previous?.success || 0) + (event.status === 'success' ? 1 : 0),
          failure: (previous?.failure || 0) + (event.status === 'failure' ? 1 : 0),
          retryableFailure: (previous?.retryableFailure || 0) + (event.status === 'failure' && event.retryable ? 1 : 0),
          totalDurationMs: (previous?.totalDurationMs || 0) + event.durationMs,
          controlPlaneInvocations: (previous?.controlPlaneInvocations || 0) + event.controlPlaneInvocations,
          controlPlaneRetries: (previous?.controlPlaneRetries || 0) + event.controlPlaneRetries,
          controlPlaneCircuitOpenShortCircuits:
            (previous?.controlPlaneCircuitOpenShortCircuits || 0)
            + event.controlPlaneCircuitOpenShortCircuits,
          controlPlaneUnsafeIdempotencyCalls:
            (previous?.controlPlaneUnsafeIdempotencyCalls || 0)
            + event.controlPlaneUnsafeIdempotencyCalls,
          lastStatus: event.status,
          lastDurationMs: event.durationMs,
          lastErrorCode: event.errorCode,
          lastErrorMessage: event.errorMessage,
          updatedAt: new Date(event.timestamp),
        };
        if (previous && previous.updatedAt.getTime() > event.timestamp) {
          next.lastStatus = previous.lastStatus;
          next.lastDurationMs = previous.lastDurationMs;
          next.lastErrorCode = previous.lastErrorCode;
          next.lastErrorMessage = previous.lastErrorMessage;
          next.updatedAt = previous.updatedAt;
        }
        aggregates.set(key, next);

        if (event.status === 'failure' && event.errorCode) {
          const counters = errorCountersByKey.get(key) || new Map<string, number>();
          counters.set(event.errorCode, (counters.get(event.errorCode) || 0) + 1);
          errorCountersByKey.set(key, counters);
        }
      }
    }

    return Array.from(aggregates.entries())
      .map(([key, item]) => this.toProviderOperationStat(
        key,
        item,
        query.topErrorLimit,
        errorCountersByKey.get(key),
      ))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  private toProviderOperationStat(
    key: string,
    aggregate: RTCProviderOperationAggregate,
    topErrorLimit: number,
    overrideErrorCounters?: Map<string, number>,
  ): RTCProviderOperationStat {
    const errorCounters = overrideErrorCounters || this.providerOperationErrorCounters.get(key);
    const topErrors = this.toTopErrorCounters(errorCounters, topErrorLimit);
    return {
      provider: aggregate.provider,
      operation: aggregate.operation,
      total: aggregate.total,
      success: aggregate.success,
      failure: aggregate.failure,
      retryableFailure: aggregate.retryableFailure,
      avgDurationMs: aggregate.total > 0
        ? Math.round(aggregate.totalDurationMs / aggregate.total)
        : 0,
      controlPlaneInvocations: aggregate.controlPlaneInvocations,
      controlPlaneRetries: aggregate.controlPlaneRetries,
      controlPlaneCircuitOpenShortCircuits: aggregate.controlPlaneCircuitOpenShortCircuits,
      controlPlaneUnsafeIdempotencyCalls: aggregate.controlPlaneUnsafeIdempotencyCalls,
      lastStatus: aggregate.lastStatus,
      lastDurationMs: aggregate.lastDurationMs,
      lastErrorCode: aggregate.lastErrorCode,
      lastErrorMessage: aggregate.lastErrorMessage,
      topErrors,
      updatedAt: new Date(aggregate.updatedAt),
    };
  }

  private toTopErrorCounters(
    counters: Map<string, number> | undefined,
    topErrorLimit: number,
  ): RTCProviderErrorCounter[] {
    if (!counters || counters.size === 0) {
      return [];
    }
    return Array.from(counters.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.code.localeCompare(right.code);
      })
      .slice(0, topErrorLimit);
  }

  private matchesProviderOperationFilter(
    stat: RTCProviderOperationStat,
    query: {
      provider?: RTCProviderType;
      operation?: 'createRoom' | 'generateToken' | 'validateToken';
      windowMinutes?: number;
      topErrorLimit: number;
    },
  ): boolean {
    if (query.provider && stat.provider !== query.provider) {
      return false;
    }
    if (query.operation && stat.operation !== query.operation) {
      return false;
    }
    return true;
  }

  private parseProviderOperationKey(key: string): {
    provider?: RTCProviderType;
    operation?: 'createRoom' | 'generateToken' | 'validateToken';
  } {
    const [providerRaw, operationRaw] = key.split(':', 2);
    if (!providerRaw || !operationRaw) {
      return {};
    }
    let provider: RTCProviderType;
    try {
      provider = this.normalizeProviderOrThrow(providerRaw);
    } catch {
      return {};
    }
    if (
      operationRaw !== 'createRoom' &&
      operationRaw !== 'generateToken' &&
      operationRaw !== 'validateToken'
    ) {
      return {};
    }
    return {
      provider,
      operation: operationRaw,
    };
  }

  private normalizeProviderOperationStatQuery(query?: RTCProviderOperationStatQuery): {
    provider?: RTCProviderType;
    operation?: 'createRoom' | 'generateToken' | 'validateToken';
    windowMinutes?: number;
    topErrorLimit: number;
  } {
    const provider = query?.provider
      ? this.normalizeProviderOrThrow(query.provider)
      : undefined;

    const operation = query?.operation;
    if (
      operation !== undefined &&
      operation !== 'createRoom' &&
      operation !== 'generateToken' &&
      operation !== 'validateToken'
    ) {
      throw new BadRequestException(`Unsupported RTC provider operation: ${String(operation)}`);
    }

    const topErrorLimitRaw = query?.topErrorLimit;
    const parsedTopErrorLimit = Number(topErrorLimitRaw);
    const topErrorLimit = Number.isInteger(parsedTopErrorLimit)
      ? Math.max(1, Math.min(parsedTopErrorLimit, 10))
      : 3;

    const windowMinutesRaw = query?.windowMinutes;
    const parsedWindowMinutes = Number(windowMinutesRaw);
    const windowMinutes = Number.isInteger(parsedWindowMinutes) && parsedWindowMinutes > 0
      ? Math.max(1, Math.min(parsedWindowMinutes, 24 * 60))
      : undefined;

    return {
      provider,
      operation,
      windowMinutes,
      topErrorLimit,
    };
  }

  private normalizeProviderHealthQuery(query?: RTCProviderHealthQuery): {
    provider?: RTCProviderType;
    operation?: 'createRoom' | 'generateToken' | 'validateToken';
    windowMinutes: number;
    topErrorLimit: number;
    minSamples: number;
    controlPlaneMinSamples: number;
    degradedFailureRate: number;
    unhealthyFailureRate: number;
    degradedLatencyMs: number;
    unhealthyLatencyMs: number;
    degradedControlPlaneRetryRate: number;
    unhealthyControlPlaneRetryRate: number;
    degradedControlPlaneCircuitOpenRate: number;
    unhealthyControlPlaneCircuitOpenRate: number;
  } {
    const defaults = this.providerHealthDefaults;
    const provider = query?.provider
      ? this.normalizeProviderOrThrow(query.provider)
      : undefined;

    const operation = query?.operation;
    if (
      operation !== undefined &&
      operation !== 'createRoom' &&
      operation !== 'generateToken' &&
      operation !== 'validateToken'
    ) {
      throw new BadRequestException(`Unsupported RTC provider operation: ${String(operation)}`);
    }

    const windowMinutes = this.readBoundedInteger(query?.windowMinutes, defaults.windowMinutes, 1, 1440);
    const topErrorLimit = this.readBoundedInteger(query?.topErrorLimit, defaults.topErrorLimit, 1, 10);
    const minSamples = this.readBoundedInteger(query?.minSamples, defaults.minSamples, 1, 1000);
    const controlPlaneMinSamples = this.readBoundedInteger(
      query?.controlPlaneMinSamples,
      defaults.controlPlaneMinSamples,
      1,
      1000,
    );
    const degradedFailureRate = this.readBoundedNumber(
      query?.degradedFailureRate,
      defaults.degradedFailureRate,
      0,
      1,
    );
    const unhealthyFailureRate = this.readBoundedNumber(
      query?.unhealthyFailureRate,
      defaults.unhealthyFailureRate,
      0,
      1,
    );
    const degradedLatencyMs = this.readBoundedNumber(
      query?.degradedLatencyMs,
      defaults.degradedLatencyMs,
      1,
      10000,
    );
    const unhealthyLatencyMs = this.readBoundedNumber(
      query?.unhealthyLatencyMs,
      defaults.unhealthyLatencyMs,
      1,
      20000,
    );
    const degradedControlPlaneRetryRate = this.readBoundedNumber(
      query?.degradedControlPlaneRetryRate,
      defaults.degradedControlPlaneRetryRate,
      0,
      1,
    );
    const unhealthyControlPlaneRetryRate = this.readBoundedNumber(
      query?.unhealthyControlPlaneRetryRate,
      defaults.unhealthyControlPlaneRetryRate,
      0,
      1,
    );
    const degradedControlPlaneCircuitOpenRate = this.readBoundedNumber(
      query?.degradedControlPlaneCircuitOpenRate,
      defaults.degradedControlPlaneCircuitOpenRate,
      0,
      1,
    );
    const unhealthyControlPlaneCircuitOpenRate = this.readBoundedNumber(
      query?.unhealthyControlPlaneCircuitOpenRate,
      defaults.unhealthyControlPlaneCircuitOpenRate,
      0,
      1,
    );

    if (degradedFailureRate >= unhealthyFailureRate) {
      throw new BadRequestException('degradedFailureRate must be smaller than unhealthyFailureRate');
    }
    if (degradedLatencyMs >= unhealthyLatencyMs) {
      throw new BadRequestException('degradedLatencyMs must be smaller than unhealthyLatencyMs');
    }
    if (degradedControlPlaneRetryRate >= unhealthyControlPlaneRetryRate) {
      throw new BadRequestException(
        'degradedControlPlaneRetryRate must be smaller than unhealthyControlPlaneRetryRate',
      );
    }
    if (degradedControlPlaneCircuitOpenRate >= unhealthyControlPlaneCircuitOpenRate) {
      throw new BadRequestException(
        'degradedControlPlaneCircuitOpenRate must be smaller than unhealthyControlPlaneCircuitOpenRate',
      );
    }

    return {
      provider,
      operation,
      windowMinutes,
      topErrorLimit,
      minSamples,
      controlPlaneMinSamples,
      degradedFailureRate,
      unhealthyFailureRate,
      degradedLatencyMs,
      unhealthyLatencyMs,
      degradedControlPlaneRetryRate,
      unhealthyControlPlaneRetryRate,
      degradedControlPlaneCircuitOpenRate,
      unhealthyControlPlaneCircuitOpenRate,
    };
  }

  private readBoundedInteger(
    value: unknown,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    const candidate = Number(value);
    if (!Number.isInteger(candidate)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(candidate, max));
  }

  private readBoundedNumber(
    value: unknown,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    const candidate = Number(value);
    if (!Number.isFinite(candidate)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(candidate, max));
  }

  private getCandidateProvidersForHealth(
    statsByProvider: Map<RTCProviderType, RTCProviderOperationStat[]>,
  ): RTCProviderType[] {
    const fromFactory = rtcChannelFactory
      .getSupportedProviders()
      .map((item) => {
        try {
          return this.normalizeProviderOrThrow(item);
        } catch {
          return undefined;
        }
      })
      .filter((item): item is RTCProviderType => !!item);

    return Array.from(new Set([
      ...fromFactory,
      ...Array.from(statsByProvider.keys()),
      this.defaultProvider,
    ]));
  }

  private buildProviderHealthItem(
    provider: RTCProviderType,
    stats: RTCProviderOperationStat[],
    query: {
      windowMinutes: number;
      topErrorLimit: number;
      minSamples: number;
      controlPlaneMinSamples: number;
      degradedFailureRate: number;
      unhealthyFailureRate: number;
      degradedLatencyMs: number;
      unhealthyLatencyMs: number;
      degradedControlPlaneRetryRate: number;
      unhealthyControlPlaneRetryRate: number;
      degradedControlPlaneCircuitOpenRate: number;
      unhealthyControlPlaneCircuitOpenRate: number;
    },
  ): RTCProviderHealthItem {
    const total = stats.reduce((sum, item) => sum + item.total, 0);
    const success = stats.reduce((sum, item) => sum + item.success, 0);
    const failure = stats.reduce((sum, item) => sum + item.failure, 0);
    const retryableFailure = stats.reduce((sum, item) => sum + item.retryableFailure, 0);
    const controlPlaneInvocations = stats.reduce((sum, item) => sum + item.controlPlaneInvocations, 0);
    const controlPlaneRetries = stats.reduce((sum, item) => sum + item.controlPlaneRetries, 0);
    const controlPlaneCircuitOpenShortCircuits = stats.reduce(
      (sum, item) => sum + item.controlPlaneCircuitOpenShortCircuits,
      0,
    );
    const controlPlaneUnsafeIdempotencyCalls = stats.reduce(
      (sum, item) => sum + item.controlPlaneUnsafeIdempotencyCalls,
      0,
    );
    const weightedDuration = stats.reduce((sum, item) => sum + item.avgDurationMs * item.total, 0);
    const avgDurationMs = total > 0 ? Math.round(weightedDuration / total) : 0;
    const failureRate = total > 0 ? Number((failure / total).toFixed(4)) : 0;
    const retryableFailureRate = total > 0 ? Number((retryableFailure / total).toFixed(4)) : 0;
    const controlPlaneRetryRate = controlPlaneInvocations > 0
      ? Number((controlPlaneRetries / controlPlaneInvocations).toFixed(4))
      : 0;
    const controlPlaneCircuitOpenRate = controlPlaneInvocations > 0
      ? Number((controlPlaneCircuitOpenShortCircuits / controlPlaneInvocations).toFixed(4))
      : 0;
    const topErrors = this.aggregateTopErrors(stats, query.topErrorLimit);
    const updatedAt = stats.reduce<Date | undefined>((latest, item) => {
      if (!latest || item.updatedAt.getTime() > latest.getTime()) {
        return item.updatedAt;
      }
      return latest;
    }, undefined);

    const controlPlaneSignalsEvaluated = controlPlaneInvocations >= query.controlPlaneMinSamples;
    const unhealthyReasons = new Set<RTCProviderHealthReason>();
    const degradedReasons = new Set<RTCProviderHealthReason>();

    if (failureRate >= query.unhealthyFailureRate) {
      unhealthyReasons.add('high_failure_rate');
    } else if (failureRate >= query.degradedFailureRate) {
      degradedReasons.add('high_failure_rate');
    }
    if (avgDurationMs >= query.unhealthyLatencyMs) {
      unhealthyReasons.add('high_latency');
    } else if (avgDurationMs >= query.degradedLatencyMs) {
      degradedReasons.add('high_latency');
    }
    if (controlPlaneSignalsEvaluated) {
      if (controlPlaneRetryRate >= query.unhealthyControlPlaneRetryRate) {
        unhealthyReasons.add('high_control_plane_retry_rate');
      } else if (controlPlaneRetryRate >= query.degradedControlPlaneRetryRate) {
        degradedReasons.add('high_control_plane_retry_rate');
      }

      if (controlPlaneCircuitOpenRate >= query.unhealthyControlPlaneCircuitOpenRate) {
        unhealthyReasons.add('high_control_plane_circuit_open_rate');
      } else if (controlPlaneCircuitOpenRate >= query.degradedControlPlaneCircuitOpenRate) {
        degradedReasons.add('high_control_plane_circuit_open_rate');
      }
    }

    let status: RTCProviderHealthItem['status'] = 'unknown';
    if (total < query.minSamples) {
      degradedReasons.clear();
      unhealthyReasons.clear();
      degradedReasons.add('insufficient_samples');
    } else if (unhealthyReasons.size > 0) {
      status = 'unhealthy';
    } else if (degradedReasons.size > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    const healthReasons = status === 'unhealthy'
      ? Array.from(unhealthyReasons)
      : Array.from(degradedReasons);

    return {
      provider,
      status,
      healthReasons,
      total,
      success,
      failure,
      retryableFailure,
      failureRate,
      retryableFailureRate,
      avgDurationMs,
      controlPlaneInvocations,
      controlPlaneRetries,
      controlPlaneCircuitOpenShortCircuits,
      controlPlaneUnsafeIdempotencyCalls,
      controlPlaneRetryRate,
      controlPlaneCircuitOpenRate,
      controlPlaneSignalsEvaluated,
      topErrors,
      updatedAt,
    };
  }

  private aggregateTopErrors(
    stats: RTCProviderOperationStat[],
    limit: number,
  ): RTCProviderErrorCounter[] {
    const counters = new Map<string, number>();
    for (const item of stats) {
      for (const entry of item.topErrors) {
        counters.set(entry.code, (counters.get(entry.code) || 0) + entry.count);
      }
    }
    return Array.from(counters.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.code.localeCompare(right.code);
      })
      .slice(0, limit);
  }

  private compareProviderHealth(
    left: RTCProviderHealthItem,
    right: RTCProviderHealthItem,
  ): number {
    const rank = (value: RTCProviderHealthItem['status']): number => {
      if (value === 'healthy') {
        return 0;
      }
      if (value === 'degraded') {
        return 1;
      }
      if (value === 'unknown') {
        return 2;
      }
      return 3;
    };
    const rankDiff = rank(left.status) - rank(right.status);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    if (left.failureRate !== right.failureRate) {
      return left.failureRate - right.failureRate;
    }
    if (left.controlPlaneCircuitOpenRate !== right.controlPlaneCircuitOpenRate) {
      return left.controlPlaneCircuitOpenRate - right.controlPlaneCircuitOpenRate;
    }
    if (left.controlPlaneRetryRate !== right.controlPlaneRetryRate) {
      return left.controlPlaneRetryRate - right.controlPlaneRetryRate;
    }
    if (left.avgDurationMs !== right.avgDurationMs) {
      return left.avgDurationMs - right.avgDurationMs;
    }
    if (left.provider === this.defaultProvider && right.provider !== this.defaultProvider) {
      return -1;
    }
    if (right.provider === this.defaultProvider && left.provider !== this.defaultProvider) {
      return 1;
    }
    return left.provider.localeCompare(right.provider);
  }

  private pickRecommendedPrimary(
    items: RTCProviderHealthItem[],
    defaultProvider: RTCProviderType,
  ): RTCProviderType | undefined {
    const healthy = items.find((item) => item.status === 'healthy');
    if (healthy) {
      return healthy.provider;
    }
    const degraded = items.find((item) => item.status === 'degraded');
    if (degraded) {
      return degraded.provider;
    }
    const defaultUnknown = items.find(
      (item) => item.provider === defaultProvider && item.status === 'unknown',
    );
    if (defaultUnknown) {
      return defaultUnknown.provider;
    }
    const unknown = items.find((item) => item.status === 'unknown');
    if (unknown) {
      return unknown.provider;
    }
    return undefined;
  }

  private normalizeProviderError(
    provider: RTCProviderType,
    operation: 'createRoom' | 'generateToken' | 'validateToken',
    error: unknown,
  ): RTCProviderErrorContext {
    const defaultCode = `${String(provider).toUpperCase()}_${operation.toUpperCase()}_FAILED`;
    const err = error as {
      code?: string;
      message?: string;
      response?: { status?: number; data?: unknown };
      status?: number;
      statusCode?: number;
    } | undefined;
    const statusCode = Number(err?.statusCode || err?.status || err?.response?.status || 400);
    const codeFromBody = this.extractStringField(err?.response?.data, 'Code')
      || this.extractStringField(err?.response?.data, 'code')
      || this.extractStringField(err?.response?.data, 'ErrorCode')
      || this.extractStringField(err?.response?.data, 'errorCode')
      || this.extractNestedStringField(err?.response?.data, ['ResponseMetadata', 'Error', 'Code'])
      || this.extractNestedStringField(err?.response?.data, ['responseMetadata', 'error', 'code'])
      || this.extractNestedStringField(err?.response?.data, ['ResponseMetadata', 'Error', 'CodeN']);
    const resolvedCode = (codeFromBody || err?.code || defaultCode).toString();
    const providerMessage = this.extractStringField(err?.response?.data, 'Message')
      || this.extractStringField(err?.response?.data, 'message')
      || this.extractNestedStringField(err?.response?.data, ['ResponseMetadata', 'Error', 'Message'])
      || this.extractNestedStringField(err?.response?.data, ['responseMetadata', 'error', 'message'])
      || err?.message
      || String(error);
    return {
      provider,
      operation,
      code: resolvedCode,
      statusCode: Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
        ? statusCode
        : 400,
      retryable: this.isRetryableProviderError(statusCode, resolvedCode),
      message: providerMessage,
    };
  }

  private extractStringField(input: unknown, key: string): string | undefined {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return undefined;
    }
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return undefined;
  }

  private extractNestedStringField(input: unknown, path: string[]): string | undefined {
    let current: unknown = input;
    for (const key of path) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    if (typeof current === 'string' && current.trim().length > 0) {
      return current.trim();
    }
    if (typeof current === 'number' && Number.isFinite(current)) {
      return String(current);
    }
    return undefined;
  }

  private isRetryableProviderError(statusCode: number, code: string): boolean {
    if (statusCode >= 500) {
      return true;
    }
    const retryableCodeKeywords = ['TIMEOUT', 'THROTTLE', 'RATE', 'UNAVAILABLE', 'INTERNAL', 'NETWORK'];
    const upperCode = code.toUpperCase();
    return retryableCodeKeywords.some((keyword) => upperCode.includes(keyword));
  }

  private assertRouteConsistency(args: {
    requestedChannelId?: string;
    requestedProvider?: string;
    roomChannelId?: string;
    roomProvider?: string;
    resolvedChannel?: RTCChannelEntity | null;
  }): void {
    const requestedChannelId = args.requestedChannelId?.trim();
    const roomChannelId = args.roomChannelId?.trim();
    const requestedProvider = args.requestedProvider
      ? this.normalizeProviderOrThrow(args.requestedProvider)
      : undefined;
    const roomProvider = args.roomProvider
      ? this.safeNormalizeProvider(args.roomProvider)
      : undefined;
    const resolvedProvider = args.resolvedChannel
      ? this.safeNormalizeProvider(args.resolvedChannel.provider)
      : undefined;

    if (
      requestedChannelId &&
      roomChannelId &&
      requestedChannelId !== roomChannelId
    ) {
      throw new BadRequestException('Requested channelId does not match room bound channelId');
    }

    if (
      requestedProvider &&
      roomProvider &&
      requestedProvider !== roomProvider
    ) {
      throw new BadRequestException('Requested provider does not match room bound provider');
    }

    if (
      requestedProvider &&
      resolvedProvider &&
      requestedProvider !== resolvedProvider
    ) {
      throw new BadRequestException('Requested provider does not match resolved channel provider');
    }

    if (
      roomProvider &&
      resolvedProvider &&
      roomProvider !== resolvedProvider
    ) {
      throw new BadRequestException('Room bound provider does not match resolved channel provider');
    }
  }

  private sanitizeRtcClientExtraConfig(
    value?: Record<string, any>,
  ): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const blockedKeyPatterns = [
      /appsecret/i,
      /secretaccesskey/i,
      /volcsecretaccesskey/i,
      /secretkey/i,
      /accesskeyid/i,
      /volcaccesskeyid/i,
      /sessiontoken/i,
      /securitytoken/i,
      /tokenissuer/i,
      /authorization/i,
      /storageconfig/i,
      /recordstartoptions/i,
      /recordstopoptions/i,
      /appkey/i,
    ];

    const sanitized: Record<string, any> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (blockedKeyPatterns.some((pattern) => pattern.test(key))) {
        continue;
      }

      if (
        typeof entry === 'string'
        || typeof entry === 'number'
        || typeof entry === 'boolean'
        || entry === null
      ) {
        sanitized[key] = entry;
        continue;
      }

      if (Array.isArray(entry)) {
        const items = entry.filter((item) => (
          typeof item === 'string'
          || typeof item === 'number'
          || typeof item === 'boolean'
          || item === null
        ));
        if (items.length > 0) {
          sanitized[key] = items;
        }
        continue;
      }

      if (typeof entry === 'object') {
        const nested = this.sanitizeRtcClientExtraConfig(
          entry as Record<string, any>,
        );
        if (Object.keys(nested).length > 0) {
          sanitized[key] = nested;
        }
      }
    }

    return sanitized;
  }

  private validateChannelConfig(
    provider: RTCProviderType,
    config: {
      appId?: string;
      appKey?: string;
      appSecret?: string;
      extraConfig?: Record<string, any>;
    },
  ): void {
    const appId = config.appId?.trim();
    const appKey = config.appKey?.trim();
    const appSecret = config.appSecret?.trim();
    if (!appId || !appKey || !appSecret) {
      throw new BadRequestException('RTC channel appId/appKey/appSecret are required');
    }

    if (provider === 'tencent') {
      const sdkAppId = Number(appId);
      if (!Number.isInteger(sdkAppId) || sdkAppId <= 0) {
        throw new BadRequestException('Tencent RTC appId must be a positive integer SDKAppID');
      }
      const privilegeKeys = [
        'tencentHostPrivilegeMap',
        'tencentParticipantPrivilegeMap',
        'tencentAudiencePrivilegeMap',
      ];
      for (const key of privilegeKeys) {
        const value = config.extraConfig?.[key];
        if (value === undefined) {
          continue;
        }
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffffffff) {
          throw new BadRequestException(`Tencent RTC ${key} must be uint32`);
        }
      }
    }

    if (provider === 'alibaba' && appKey.length === 0) {
      throw new BadRequestException('Alibaba RTC appKey is required');
    }

    if (provider === 'volcengine') {
      const tokenMode = String(
        config.extraConfig?.volcTokenMode || config.extraConfig?.tokenMode || 'auto',
      ).toLowerCase();
      const allowLocalFallback = config.extraConfig?.allowLocalTokenFallback;
      if (tokenMode === 'openapi' && allowLocalFallback === false) {
        const accessKeyId = config.extraConfig?.accessKeyId || config.extraConfig?.volcAccessKeyId;
        const secretAccessKey =
          config.extraConfig?.secretAccessKey ||
          config.extraConfig?.volcSecretAccessKey ||
          config.extraConfig?.secretKey;
        if (!accessKeyId || !secretAccessKey) {
          throw new BadRequestException(
            'Volcengine openapi mode requires accessKeyId and secretAccessKey when local fallback is disabled',
          );
        }
        const numericAppId = Number(appId);
        if (!Number.isInteger(numericAppId) || numericAppId <= 0) {
          throw new BadRequestException(
            'Volcengine openapi mode requires numeric appId when local fallback is disabled',
          );
        }
      }
    }
  }
}
