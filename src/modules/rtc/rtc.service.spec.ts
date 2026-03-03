import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RTCChannelBase, rtcChannelFactory } from './channels/rtc-channel.base';
import { RTCService } from './rtc.service';

describe('RTCService', () => {
  const now = new Date();

  function createService(
    configOverrides: Record<string, unknown> = {},
    prometheusService?: {
      incrementRtcProviderOperation?: jest.Mock;
      observeRtcProviderOperationDuration?: jest.Mock;
      setRtcProviderHealth?: jest.Mock;
      incrementRtcControlPlaneSignal?: jest.Mock;
    },
  ) {
    const mockRoomRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockTokenRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const mockChannelRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockVideoRecordRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockDataSource = {
      transaction: jest.fn(),
    };
    const configValues: Record<string, unknown> = {
      RTC_DEFAULT_PROVIDER: 'volcengine',
      ...configOverrides,
    };
    const mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    const service = new RTCService(
      mockRoomRepository as any,
      mockTokenRepository as any,
      mockChannelRepository as any,
      mockVideoRecordRepository as any,
      mockDataSource as any,
      mockConfigService,
      undefined,
      prometheusService as any,
    );

    return {
      service,
      mockRoomRepository,
      mockTokenRepository,
      mockChannelRepository,
      mockVideoRecordRepository,
      mockDataSource,
      mockConfigService,
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should register canonical provider set without bytedance runtime provider', () => {
    createService();
    const providers = rtcChannelFactory.getSupportedProviders();
    expect(providers).toContain('volcengine');
    expect(providers).toContain('tencent');
    expect(providers).toContain('alibaba');
    expect(providers).toContain('livekit');
    expect(providers).not.toContain('bytedance');
  });

  it('should create external room using persisted local room id', async () => {
    const {
      service,
      mockRoomRepository,
      mockDataSource,
    } = createService();

    const roomAfterFirstSave = {
      id: '200',
      uuid: 'room-uuid',
      name: 'Team Call',
      type: 'group' as const,
      creatorId: 'creator-1',
      participants: ['creator-1', 'member-1'],
      status: 'active' as const,
      channelId: '10',
      provider: 'volcengine',
      aiEnabled: false,
      startedAt: now,
    };
    const roomAfterSecondSave = {
      ...roomAfterFirstSave,
      externalRoomId: 'ext-room-200',
    };

    mockRoomRepository.create.mockReturnValue(roomAfterFirstSave);
    mockRoomRepository.save
      .mockResolvedValueOnce(roomAfterFirstSave)
      .mockResolvedValueOnce(roomAfterSecondSave);
    mockDataSource.transaction.mockImplementation(async (callback: (manager: any) => Promise<any>) => {
      return callback({
        getRepository: () => mockRoomRepository,
      });
    });

    const channelEntity = {
      id: '10',
      provider: 'volcengine',
      appId: 'app-id',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    };
    const mockChannel = {
      createRoom: jest.fn().mockResolvedValue({
        roomId: 'ext-room-200',
        type: 'group',
        participants: [],
      }),
    };

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue(channelEntity);
    jest.spyOn(service as any, 'getChannelClient').mockResolvedValue(mockChannel);

    const room = await service.createRoom(
      'creator-1',
      'group',
      ['member-1'],
      'Team Call',
      '10',
      'volcengine',
    );

    expect(mockChannel.createRoom).toHaveBeenCalledWith('200', 'Team Call', 'group');
    expect(room.externalRoomId).toBe('ext-room-200');
  });

  it('should reject room creation when requested provider mismatches resolved channel provider', async () => {
    const {
      service,
    } = createService();

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue({
      id: '19',
      provider: 'tencent',
      appId: '1400000001',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    });

    await expect(
      service.createRoom(
        'creator-1',
        'group',
        ['member-1'],
        'Mismatched Provider Room',
        '19',
        'alibaba',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject non-canonical provider bytedance when generating token', async () => {
    const {
      service,
      mockRoomRepository,
    } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '300',
      uuid: 'room-300',
      type: 'group',
      creatorId: 'creator-1',
      participants: ['creator-1'],
      status: 'active',
      channelId: undefined,
      externalRoomId: 'ext-300',
      startedAt: now,
      isDeleted: false,
    });

    await expect(
      service.generateToken('300', 'creator-1', undefined, 'bytedance'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should map provider token generation errors to structured bad request', async () => {
    const {
      service,
      mockRoomRepository,
    } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '910',
      uuid: 'room-910',
      type: 'group',
      creatorId: 'user-910',
      participants: ['user-910'],
      status: 'active',
      channelId: '91',
      externalRoomId: 'ext-910',
      startedAt: now,
      isDeleted: false,
    });

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue({
      id: '91',
      provider: 'tencent',
      appId: '1400000001',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    });
    jest.spyOn(service as any, 'getChannelClient').mockResolvedValue({
      addParticipant: jest.fn().mockResolvedValue(true),
      generateToken: jest.fn().mockRejectedValue({
        code: 'RequestTimeout',
        message: 'upstream timeout',
        response: {
          status: 504,
          data: {
            Code: 'RequestTimeout',
            Message: 'upstream timeout',
          },
        },
      }),
    });

    let error: unknown;
    try {
      await service.generateToken('910', 'user-910');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(BadRequestException);
    const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
    expect(response).toMatchObject({
      provider: 'tencent',
      operation: 'generateToken',
      providerStatusCode: 504,
      providerErrorCode: 'RequestTimeout',
      retryable: true,
    });

    const stats = service.getProviderOperationStats();
    expect(stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'tencent',
          operation: 'generateToken',
          total: 1,
          success: 0,
          failure: 1,
          retryableFailure: 1,
          lastErrorCode: 'RequestTimeout',
        }),
      ]),
    );
  });

  it('should merge captured control-plane signals into provider failure stats', async () => {
    const {
      service,
      mockRoomRepository,
    } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '915',
      uuid: 'room-915',
      type: 'group',
      creatorId: 'user-915',
      participants: ['user-915'],
      status: 'active',
      channelId: '95',
      externalRoomId: 'ext-915',
      startedAt: now,
      isDeleted: false,
    });

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue({
      id: '95',
      provider: 'volcengine',
      appId: 'app-id',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    });
    jest.spyOn(service as any, 'getChannelClient').mockResolvedValue({
      addParticipant: jest.fn(),
      generateToken: jest.fn(),
    });
    jest.spyOn(RTCChannelBase, 'captureControlPlaneSignals').mockResolvedValue({
      ok: false,
      error: new Error('delegate timeout'),
      signals: {
        invocations: 2,
        retries: 1,
        circuitOpenShortCircuits: 1,
        unsafeIdempotencyCalls: 1,
        operations: {},
      },
    } as any);

    await expect(service.generateToken('915', 'user-915')).rejects.toBeInstanceOf(BadRequestException);

    const stats = service.getProviderOperationStats({
      provider: 'volcengine',
      operation: 'generateToken',
    });
    expect(stats).toHaveLength(1);
    expect(stats[0]).toEqual(expect.objectContaining({
      provider: 'volcengine',
      operation: 'generateToken',
      total: 1,
      failure: 1,
      controlPlaneInvocations: 2,
      controlPlaneRetries: 1,
      controlPlaneCircuitOpenShortCircuits: 1,
      controlPlaneUnsafeIdempotencyCalls: 1,
    }));
  });

  it('should map provider room creation errors to structured bad request', async () => {
    const {
      service,
      mockRoomRepository,
      mockDataSource,
    } = createService();

    const savedRoom = {
      id: '920',
      uuid: 'room-920',
      name: 'Provider Fail Room',
      type: 'group' as const,
      creatorId: 'creator-920',
      participants: ['creator-920', 'member-920'],
      status: 'active' as const,
      channelId: '92',
      provider: 'tencent',
      aiEnabled: false,
      startedAt: now,
    };
    mockRoomRepository.create.mockReturnValue(savedRoom);
    mockRoomRepository.save.mockResolvedValue(savedRoom);
    mockDataSource.transaction.mockImplementation(async (callback: (manager: any) => Promise<any>) => {
      return callback({
        getRepository: () => mockRoomRepository,
      });
    });

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue({
      id: '92',
      provider: 'tencent',
      appId: '1400000001',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    });
    jest.spyOn(service as any, 'getChannelClient').mockResolvedValue({
      createRoom: jest.fn().mockRejectedValue({
        response: {
          status: 503,
          data: {
            ResponseMetadata: {
              Error: {
                Code: 'VolcUnavailable',
                Message: 'provider unavailable',
              },
            },
          },
        },
      }),
    });

    let error: unknown;
    try {
      await service.createRoom(
        'creator-920',
        'group',
        ['member-920'],
        'Provider Fail Room',
        '92',
        'tencent',
      );
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(BadRequestException);
    const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
    expect(response).toMatchObject({
      provider: 'tencent',
      operation: 'createRoom',
      providerStatusCode: 503,
      providerErrorCode: 'VolcUnavailable',
      retryable: true,
      providerMessage: 'provider unavailable',
    });

    const stats = service.getProviderOperationStats();
    expect(stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'tencent',
          operation: 'createRoom',
          total: 1,
          success: 0,
          failure: 1,
          retryableFailure: 1,
          lastErrorCode: 'VolcUnavailable',
        }),
      ]),
    );
  });

  it('should compute provider operation stats with window and top error filters', async () => {
    const { service } = createService();

    (service as any).recordProviderOperationFailure({
      provider: 'tencent',
      operation: 'generateToken',
      code: 'RequestTimeout',
      statusCode: 504,
      retryable: true,
      message: 'timeout',
    }, 30);
    (service as any).recordProviderOperationFailure({
      provider: 'tencent',
      operation: 'generateToken',
      code: 'RequestTimeout',
      statusCode: 504,
      retryable: true,
      message: 'timeout',
    }, 20);
    (service as any).recordProviderOperationFailure({
      provider: 'tencent',
      operation: 'generateToken',
      code: 'RateLimit',
      statusCode: 429,
      retryable: true,
      message: 'rate limited',
    }, 10);
    (service as any).recordProviderOperationSuccess('tencent', 'generateToken', 40);

    const key = 'tencent:generateToken';
    const history = (service as any).providerOperationHistory.get(key);
    expect(history).toBeDefined();
    history[0].timestamp = Date.now() - 2 * 60 * 60 * 1000;

    const stats = service.getProviderOperationStats({
      provider: 'tencent',
      operation: 'generateToken',
      windowMinutes: 60,
      topErrorLimit: 2,
    });

    expect(stats).toHaveLength(1);
    expect(stats[0]).toEqual(expect.objectContaining({
      provider: 'tencent',
      operation: 'generateToken',
      total: 3,
      success: 1,
      failure: 2,
      retryableFailure: 2,
      avgDurationMs: 23,
    }));
    expect(stats[0].topErrors).toEqual([
      { code: 'RateLimit', count: 1 },
      { code: 'RequestTimeout', count: 1 },
    ]);
  });

  it('should expose control-plane reliability counters in provider stats and health report', async () => {
    const { service } = createService();

    (service as any).recordProviderOperationSuccess(
      'volcengine',
      'createRoom',
      120,
      {
        invocations: 2,
        retries: 1,
        circuitOpenShortCircuits: 0,
        unsafeIdempotencyCalls: 1,
        operations: {},
      },
    );
    (service as any).recordProviderOperationFailure(
      {
        provider: 'volcengine',
        operation: 'createRoom',
        code: 'RequestTimeout',
        statusCode: 504,
        retryable: true,
        message: 'timeout',
      },
      80,
      {
        invocations: 1,
        retries: 1,
        circuitOpenShortCircuits: 1,
        unsafeIdempotencyCalls: 1,
        operations: {},
      },
    );

    const stats = service.getProviderOperationStats({
      provider: 'volcengine',
      operation: 'createRoom',
    });
    expect(stats).toHaveLength(1);
    expect(stats[0]).toEqual(expect.objectContaining({
      provider: 'volcengine',
      operation: 'createRoom',
      total: 2,
      success: 1,
      failure: 1,
      controlPlaneInvocations: 3,
      controlPlaneRetries: 2,
      controlPlaneCircuitOpenShortCircuits: 1,
      controlPlaneUnsafeIdempotencyCalls: 2,
    }));

    const report = service.getProviderHealthReport({
      provider: 'volcengine',
      operation: 'createRoom',
      minSamples: 1,
      windowMinutes: 60,
    });
    const volcengine = report.providers.find((item) => item.provider === 'volcengine');
    expect(volcengine).toEqual(expect.objectContaining({
      total: 2,
      controlPlaneInvocations: 3,
      controlPlaneRetries: 2,
      controlPlaneCircuitOpenShortCircuits: 1,
      controlPlaneUnsafeIdempotencyCalls: 2,
    }));
  });

  it('should reject provider stats query with unsupported operation', async () => {
    const { service } = createService();
    expect(() => service.getProviderOperationStats({
      operation: 'invalid-operation' as any,
    })).toThrow(BadRequestException);
  });

  it('should compute provider health report and recommend healthiest provider', async () => {
    const { service } = createService();

    for (let i = 0; i < 6; i += 1) {
      (service as any).recordProviderOperationSuccess('volcengine', 'generateToken', 80);
    }
    for (let i = 0; i < 4; i += 1) {
      (service as any).recordProviderOperationFailure({
        provider: 'tencent',
        operation: 'generateToken',
        code: 'RequestTimeout',
        statusCode: 504,
        retryable: true,
        message: 'timeout',
      }, 400);
    }
    (service as any).recordProviderOperationSuccess('tencent', 'generateToken', 350);

    const report = service.getProviderHealthReport({
      windowMinutes: 60,
      minSamples: 5,
      topErrorLimit: 2,
      degradedFailureRate: 0.2,
      unhealthyFailureRate: 0.5,
      degradedLatencyMs: 120,
      unhealthyLatencyMs: 300,
    });

    expect(report.recommendedPrimary).toBe('volcengine');
    expect(report.fallbackOrder[0]).toBe('volcengine');

    const volcengine = report.providers.find((item) => item.provider === 'volcengine');
    const tencent = report.providers.find((item) => item.provider === 'tencent');
    expect(volcengine).toEqual(expect.objectContaining({
      status: 'healthy',
      total: 6,
      failureRate: 0,
      avgDurationMs: 80,
    }));
    expect(tencent).toEqual(expect.objectContaining({
      status: 'unhealthy',
      total: 5,
      failure: 4,
      failureRate: 0.8,
      avgDurationMs: 390,
    }));
    expect(tencent?.topErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RequestTimeout',
          count: 4,
        }),
      ]),
    );
  });

  it('should downgrade provider health when control-plane retry/circuit-open rates are high', async () => {
    const { service } = createService({
      RTC_ENABLE_HEALTH_BASED_ROUTING: 'true',
      RTC_HEALTH_ROUTING_MIN_SAMPLES: '1',
    });

    for (let i = 0; i < 3; i += 1) {
      (service as any).recordProviderOperationSuccess(
        'volcengine',
        'generateToken',
        70,
        {
          invocations: 10,
          retries: 7,
          circuitOpenShortCircuits: 3,
          unsafeIdempotencyCalls: 0,
          operations: {},
        },
      );
      (service as any).recordProviderOperationSuccess(
        'tencent',
        'generateToken',
        90,
        {
          invocations: 10,
          retries: 0,
          circuitOpenShortCircuits: 0,
          unsafeIdempotencyCalls: 0,
          operations: {},
        },
      );
    }

    const report = service.getProviderHealthReport({
      operation: 'generateToken',
      windowMinutes: 60,
      minSamples: 1,
      controlPlaneMinSamples: 1,
      degradedControlPlaneRetryRate: 0.2,
      unhealthyControlPlaneRetryRate: 0.6,
      degradedControlPlaneCircuitOpenRate: 0.05,
      unhealthyControlPlaneCircuitOpenRate: 0.2,
    });

    const volcengine = report.providers.find((item) => item.provider === 'volcengine');
    const tencent = report.providers.find((item) => item.provider === 'tencent');

    expect(volcengine).toEqual(expect.objectContaining({
      status: 'unhealthy',
      failureRate: 0,
      controlPlaneInvocations: 30,
      controlPlaneRetries: 21,
      controlPlaneCircuitOpenShortCircuits: 9,
      controlPlaneRetryRate: 0.7,
      controlPlaneCircuitOpenRate: 0.3,
      controlPlaneSignalsEvaluated: true,
    }));
    expect(volcengine?.healthReasons).toEqual(
      expect.arrayContaining([
        'high_control_plane_retry_rate',
        'high_control_plane_circuit_open_rate',
      ]),
    );
    expect(tencent).toEqual(expect.objectContaining({
      status: 'healthy',
      controlPlaneRetryRate: 0,
      controlPlaneCircuitOpenRate: 0,
      healthReasons: [],
      controlPlaneSignalsEvaluated: true,
    }));
    expect(report.recommendedPrimary).toBe('tencent');

    const preferred = (service as any).resolvePreferredProviderByHealth('generateToken');
    expect(preferred).toBe('tencent');
  });

  it('should reject provider health query with invalid thresholds', async () => {
    const { service } = createService();
    expect(() => service.getProviderHealthReport({
      degradedFailureRate: 0.6,
      unhealthyFailureRate: 0.5,
    })).toThrow(BadRequestException);
    expect(() => service.getProviderHealthReport({
      degradedLatencyMs: 800,
      unhealthyLatencyMs: 700,
    })).toThrow(BadRequestException);
    expect(() => service.getProviderHealthReport({
      degradedControlPlaneRetryRate: 0.7,
      unhealthyControlPlaneRetryRate: 0.6,
    })).toThrow(BadRequestException);
    expect(() => service.getProviderHealthReport({
      degradedControlPlaneCircuitOpenRate: 0.3,
      unhealthyControlPlaneCircuitOpenRate: 0.2,
    })).toThrow(BadRequestException);
  });

  it('should use configured provider health defaults when query omits thresholds', async () => {
    const { service } = createService({
      RTC_PROVIDER_HEALTH_WINDOW_MINUTES: '120',
      RTC_PROVIDER_HEALTH_TOP_ERROR_LIMIT: '6',
      RTC_PROVIDER_HEALTH_MIN_SAMPLES: '8',
      RTC_PROVIDER_HEALTH_DEGRADED_FAILURE_RATE: '0.2',
      RTC_PROVIDER_HEALTH_UNHEALTHY_FAILURE_RATE: '0.5',
      RTC_PROVIDER_HEALTH_DEGRADED_LATENCY_MS: '300',
      RTC_PROVIDER_HEALTH_UNHEALTHY_LATENCY_MS: '900',
    });

    for (let i = 0; i < 8; i += 1) {
      (service as any).recordProviderOperationSuccess('volcengine', 'generateToken', 260);
    }

    const report = service.getProviderHealthReport();
    const volcengine = report.providers.find((item) => item.provider === 'volcengine');

    expect(report.windowMinutes).toBe(120);
    expect(volcengine).toEqual(expect.objectContaining({
      total: 8,
      avgDurationMs: 260,
      status: 'healthy',
    }));
  });

  it('should enforce configured provider stats history max events', async () => {
    const { service } = createService({
      RTC_PROVIDER_STATS_HISTORY_MAX_EVENTS: '2',
    });

    (service as any).recordProviderOperationSuccess('tencent', 'generateToken', 10);
    (service as any).recordProviderOperationSuccess('tencent', 'generateToken', 20);
    (service as any).recordProviderOperationSuccess('tencent', 'generateToken', 30);

    const history = (service as any).providerOperationHistory.get('tencent:generateToken');
    expect(history).toHaveLength(2);
    expect(history[0].durationMs).toBe(20);
    expect(history[1].durationMs).toBe(30);
  });

  it('should publish provider operation and health metrics to Prometheus service', async () => {
    const prometheusService = {
      incrementRtcProviderOperation: jest.fn(),
      observeRtcProviderOperationDuration: jest.fn(),
      setRtcProviderHealth: jest.fn(),
      incrementRtcControlPlaneSignal: jest.fn(),
    };
    const { service } = createService({}, prometheusService);

    (service as any).recordProviderOperationSuccess('volcengine', 'generateToken', 120, {
      invocations: 2,
      retries: 1,
      circuitOpenShortCircuits: 0,
      unsafeIdempotencyCalls: 1,
      operations: {},
    });
    (service as any).recordProviderOperationFailure({
      provider: 'tencent',
      operation: 'generateToken',
      code: 'RequestTimeout',
      statusCode: 504,
      retryable: true,
      message: 'upstream timeout',
    }, 80, {
      invocations: 1,
      retries: 0,
      circuitOpenShortCircuits: 1,
      unsafeIdempotencyCalls: 0,
      operations: {},
    });

    const report = service.getProviderHealthReport({
      operation: 'generateToken',
      windowMinutes: 60,
      minSamples: 1,
    });

    expect(prometheusService.incrementRtcProviderOperation).toHaveBeenCalledWith(
      'volcengine',
      'generateToken',
      'success',
      false,
    );
    expect(prometheusService.incrementRtcProviderOperation).toHaveBeenCalledWith(
      'tencent',
      'generateToken',
      'failure',
      true,
    );
    expect(prometheusService.observeRtcProviderOperationDuration).toHaveBeenCalledWith(
      'volcengine',
      'generateToken',
      'success',
      120,
    );
    expect(prometheusService.observeRtcProviderOperationDuration).toHaveBeenCalledWith(
      'tencent',
      'generateToken',
      'failure',
      80,
    );
    expect(prometheusService.incrementRtcControlPlaneSignal).toHaveBeenCalledWith(
      'volcengine',
      'generateToken',
      'invocation',
      2,
    );
    expect(prometheusService.incrementRtcControlPlaneSignal).toHaveBeenCalledWith(
      'volcengine',
      'generateToken',
      'retry',
      1,
    );
    expect(prometheusService.incrementRtcControlPlaneSignal).toHaveBeenCalledWith(
      'volcengine',
      'generateToken',
      'unsafe_idempotency',
      1,
    );
    expect(prometheusService.incrementRtcControlPlaneSignal).toHaveBeenCalledWith(
      'tencent',
      'generateToken',
      'circuit_open_short_circuit',
      1,
    );
    expect(prometheusService.setRtcProviderHealth).toHaveBeenCalled();
    expect(prometheusService.setRtcProviderHealth).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({
        retryRate: expect.any(Number),
        circuitOpenRate: expect.any(Number),
      }),
    );
    const providers = (prometheusService.setRtcProviderHealth as jest.Mock).mock.calls.map(
      (call) => call[0],
    );
    expect(providers).toContain('volcengine');
    expect(providers).toContain('tencent');
    expect(report.providers.length).toBeGreaterThan(0);
  });

  it('should reject addParticipant when operator is not creator', async () => {
    const { service, mockRoomRepository } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '400',
      uuid: 'room-400',
      type: 'group',
      creatorId: 'creator-only',
      participants: ['creator-only'],
      status: 'active',
      startedAt: now,
      isDeleted: false,
    });

    await expect(
      service.addParticipant('400', 'new-member', 'another-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should end p2p room and destroy provider room when participant leaves', async () => {
    const { service, mockRoomRepository } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '401',
      uuid: 'room-401',
      type: 'p2p',
      creatorId: 'creator-401',
      participants: ['creator-401', 'member-401'],
      status: 'active',
      channelId: 'chan-401',
      externalRoomId: 'ext-room-401',
      startedAt: now,
      isDeleted: false,
    });
    mockRoomRepository.save.mockImplementation(async (payload: any) => payload);

    const mockChannel = {
      destroyRoom: jest.fn().mockResolvedValue(true),
      removeParticipant: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(service as any, 'getChannelClientById').mockResolvedValue(mockChannel);

    const ok = await service.removeParticipant('401', 'member-401', 'creator-401');
    expect(ok).toBe(true);
    expect(mockRoomRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '401',
        status: 'ended',
      }),
    );
    expect(mockChannel.destroyRoom).toHaveBeenCalledWith('ext-room-401');
    expect(mockChannel.removeParticipant).not.toHaveBeenCalled();
  });

  it('should keep group room active and only remove participant in provider when members remain', async () => {
    const { service, mockRoomRepository } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '402',
      uuid: 'room-402',
      type: 'group',
      creatorId: 'creator-402',
      participants: ['creator-402', 'member-402-a', 'member-402-b'],
      status: 'active',
      channelId: 'chan-402',
      externalRoomId: 'ext-room-402',
      startedAt: now,
      isDeleted: false,
    });
    mockRoomRepository.save.mockImplementation(async (payload: any) => payload);

    const mockChannel = {
      destroyRoom: jest.fn().mockResolvedValue(true),
      removeParticipant: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(service as any, 'getChannelClientById').mockResolvedValue(mockChannel);

    const ok = await service.removeParticipant('402', 'member-402-a', 'creator-402');
    expect(ok).toBe(true);
    expect(mockRoomRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '402',
        status: 'active',
      }),
    );
    expect(mockChannel.removeParticipant).toHaveBeenCalledWith('ext-room-402', 'member-402-a');
    expect(mockChannel.destroyRoom).not.toHaveBeenCalled();
  });

  it('should fallback to default volcengine provider when room does not pin provider', async () => {
    const {
      service,
      mockRoomRepository,
      mockTokenRepository,
    } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '500',
      uuid: 'room-500',
      type: 'group',
      creatorId: 'user-500',
      participants: ['user-500'],
      status: 'active',
      startedAt: now,
      isDeleted: false,
    });

    const resolveSpy = jest
      .spyOn(service as any, 'resolveChannelEntity')
      .mockResolvedValue(null);

    mockTokenRepository.save.mockImplementation(async (payload: any) => ({
      ...payload,
      id: 'token-500',
      uuid: 'token-500-uuid',
      createdAt: now,
    }));

    const token = await service.generateToken('500', 'user-500');

    expect(resolveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'volcengine',
      }),
    );
    expect(token.provider).toBe('volcengine');
  });

  it('should resolve preferred provider by health when health-based routing is enabled', async () => {
    const { service } = createService({
      RTC_ENABLE_HEALTH_BASED_ROUTING: 'true',
      RTC_HEALTH_ROUTING_MIN_SAMPLES: '1',
    });

    for (let i = 0; i < 5; i += 1) {
      (service as any).recordProviderOperationSuccess('tencent', 'generateToken', 60);
    }
    for (let i = 0; i < 5; i += 1) {
      (service as any).recordProviderOperationFailure({
        provider: 'volcengine',
        operation: 'generateToken',
        code: 'RequestTimeout',
        statusCode: 504,
        retryable: true,
        message: 'timeout',
      }, 400);
    }

    const preferred = (service as any).resolvePreferredProviderByHealth('generateToken');
    expect(preferred).toBe('tencent');
  });

  it('should avoid provider with high control-plane circuit-open rate in health routing', async () => {
    const { service } = createService({
      RTC_ENABLE_HEALTH_BASED_ROUTING: 'true',
      RTC_HEALTH_ROUTING_MIN_SAMPLES: '1',
      RTC_PROVIDER_HEALTH_CONTROL_PLANE_MIN_SAMPLES: '1',
      RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_CIRCUIT_OPEN_RATE: '0.2',
      RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_CIRCUIT_OPEN_RATE: '0.4',
    });

    for (let i = 0; i < 5; i += 1) {
      (service as any).recordProviderOperationSuccess('volcengine', 'generateToken', 60, {
        invocations: 1,
        retries: 0,
        circuitOpenShortCircuits: 1,
        unsafeIdempotencyCalls: 0,
        operations: {},
      });
    }
    for (let i = 0; i < 5; i += 1) {
      (service as any).recordProviderOperationSuccess('tencent', 'generateToken', 80, {
        invocations: 1,
        retries: 0,
        circuitOpenShortCircuits: 0,
        unsafeIdempotencyCalls: 0,
        operations: {},
      });
    }

    const preferred = (service as any).resolvePreferredProviderByHealth('generateToken');
    expect(preferred).toBe('tencent');
  });

  it('should avoid forcing default provider lookup when health-based routing is enabled', async () => {
    const {
      service,
      mockRoomRepository,
      mockTokenRepository,
    } = createService({
      RTC_ENABLE_HEALTH_BASED_ROUTING: 'true',
      RTC_HEALTH_ROUTING_MIN_SAMPLES: '1',
    });

    mockRoomRepository.findOne.mockResolvedValue({
      id: '510',
      uuid: 'room-510',
      type: 'group',
      creatorId: 'user-510',
      participants: ['user-510'],
      status: 'active',
      startedAt: now,
      isDeleted: false,
    });

    const resolveSpy = jest
      .spyOn(service as any, 'resolveChannelEntity')
      .mockResolvedValue(null);

    mockTokenRepository.save.mockImplementation(async (payload: any) => ({
      ...payload,
      id: 'token-510',
      uuid: 'token-510-uuid',
      createdAt: now,
    }));

    const token = await service.generateToken('510', 'user-510');
    expect(resolveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: undefined,
        operation: 'generateToken',
      }),
    );
    expect(token.provider).toBe('volcengine');
  });

  it('should reject room creation when explicit provider has no active channel', async () => {
    const {
      service,
      mockDataSource,
    } = createService();

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue(null);
    mockDataSource.transaction.mockImplementation(async (callback: (manager: any) => Promise<any>) => {
      return callback({
        getRepository: () => ({
          create: jest.fn(),
          save: jest.fn(),
        }),
      });
    });

    await expect(
      service.createRoom('creator-1', 'group', ['member-1'], 'Team Call', undefined, 'tencent'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should reject token generation when room is pinned to provider but no active channel', async () => {
    const { service, mockRoomRepository } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '900',
      uuid: 'room-900',
      type: 'group',
      creatorId: 'user-900',
      participants: ['user-900'],
      status: 'active',
      provider: 'tencent',
      startedAt: now,
      isDeleted: false,
    });

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue(null);

    await expect(
      service.generateToken('900', 'user-900'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should reject token generation when requested provider mismatches room bound provider', async () => {
    const { service, mockRoomRepository } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '901',
      uuid: 'room-901',
      type: 'group',
      creatorId: 'user-901',
      participants: ['user-901'],
      status: 'active',
      channelId: '91',
      provider: 'tencent',
      externalRoomId: 'ext-901',
      startedAt: now,
      isDeleted: false,
    });

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue({
      id: '91',
      provider: 'tencent',
      appId: '1400000001',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    });

    await expect(
      service.generateToken('901', 'user-901', undefined, 'alibaba'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject token generation when requested channelId mismatches room bound channelId', async () => {
    const { service, mockRoomRepository } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '902',
      uuid: 'room-902',
      type: 'group',
      creatorId: 'user-902',
      participants: ['user-902'],
      status: 'active',
      channelId: 'room-channel-902',
      provider: 'volcengine',
      externalRoomId: 'ext-902',
      startedAt: now,
      isDeleted: false,
    });

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue({
      id: 'other-channel',
      provider: 'volcengine',
      appId: 'app-id',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    });

    await expect(
      service.generateToken('902', 'user-902', 'other-channel'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject video record with invalid timeline window', async () => {
    const { service } = createService();

    await expect(
      service.createVideoRecord({
        roomId: '1',
        fileName: 'record.mp4',
        filePath: '/tmp/record.mp4',
        fileType: 'video/mp4',
        fileSize: 1024,
        startTime: new Date(now.getTime() + 1000),
        endTime: now,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should cleanup external room when persisting externalRoomId fails', async () => {
    const {
      service,
      mockRoomRepository,
      mockDataSource,
    } = createService();

    const firstSavedRoom = {
      id: '210',
      uuid: 'room-210',
      name: 'Compensated Call',
      type: 'group' as const,
      creatorId: 'creator-1',
      participants: ['creator-1', 'member-1'],
      status: 'active' as const,
      channelId: '11',
      provider: 'volcengine',
      aiEnabled: false,
      startedAt: now,
    };

    mockRoomRepository.create.mockReturnValue(firstSavedRoom);
    mockRoomRepository.save
      .mockResolvedValueOnce(firstSavedRoom)
      .mockRejectedValueOnce(new Error('save external room id failed'));

    mockDataSource.transaction.mockImplementation(async (callback: (manager: any) => Promise<any>) => {
      return callback({
        getRepository: () => mockRoomRepository,
      });
    });

    const channelEntity = {
      id: '11',
      provider: 'volcengine',
      appId: 'app-id',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    };

    const mockChannel = {
      createRoom: jest.fn().mockResolvedValue({
        roomId: 'ext-room-210',
        type: 'group',
        participants: [],
      }),
      destroyRoom: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue(channelEntity);
    jest.spyOn(service as any, 'getChannelClient').mockResolvedValue(mockChannel);

    await expect(
      service.createRoom('creator-1', 'group', ['member-1'], 'Compensated Call', '11', 'volcengine'),
    ).rejects.toThrow('save external room id failed');
    expect(mockChannel.destroyRoom).toHaveBeenCalledWith('ext-room-210');
  });

  it('should accept local issued token when provider channel is unavailable', async () => {
    const { service, mockTokenRepository } = createService();

    mockTokenRepository.findOne.mockResolvedValue({
      id: 'token-local-1',
      token: 'rtc_token_local',
      provider: 'volcengine',
      metadata: { issuer: 'local' },
      expiresAt: new Date(now.getTime() + 3600 * 1000),
      isDeleted: false,
      createdAt: now,
    });

    jest.spyOn(service as any, 'getChannelClientByProvider').mockResolvedValue(null);

    const validated = await service.validateToken('rtc_token_local');
    expect(validated).not.toBeNull();
    expect(validated?.id).toBe('token-local-1');
  });

  it('should reject provider token when channel is unavailable and token is not local issued', async () => {
    const { service, mockTokenRepository } = createService();

    mockTokenRepository.findOne.mockResolvedValue({
      id: 'token-cloud-1',
      token: 'rtc_token_cloud',
      provider: 'volcengine',
      metadata: {},
      expiresAt: new Date(now.getTime() + 3600 * 1000),
      isDeleted: false,
      createdAt: now,
    });

    jest.spyOn(service as any, 'getChannelClientByProvider').mockResolvedValue(null);

    const validated = await service.validateToken('rtc_token_cloud');
    expect(validated).toBeNull();
  });

  it('should start room recording and persist pending provider task record', async () => {
    const {
      service,
      mockRoomRepository,
      mockVideoRecordRepository,
    } = createService();

    mockRoomRepository.findOne.mockResolvedValue({
      id: '930',
      uuid: 'room-930',
      type: 'group',
      creatorId: 'user-930',
      participants: ['user-930'],
      status: 'active',
      channelId: '93',
      provider: 'volcengine',
      externalRoomId: 'ext-930',
      startedAt: now,
      isDeleted: false,
    });
    mockVideoRecordRepository.findOne.mockResolvedValue(null);
    mockVideoRecordRepository.create.mockImplementation((payload: any) => payload);
    mockVideoRecordRepository.save.mockImplementation(async (payload: any) => ({
      id: 'record-930',
      ...payload,
    }));

    jest.spyOn(service as any, 'resolveChannelEntity').mockResolvedValue({
      id: '93',
      provider: 'volcengine',
      appId: '1000001',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      updatedAt: now,
    });
    jest.spyOn(service as any, 'getChannelClient').mockResolvedValue({
      startRecording: jest.fn().mockResolvedValue({
        taskId: 'task-930',
        roomId: 'ext-930',
        status: 'recording',
        startTime: now,
      }),
    });

    const record = await service.startRoomRecording('930', 'user-930', {
      metadata: { scenario: 'unit-test' },
    });

    expect(record.externalTaskId).toBe('task-930');
    expect(record.status).toBe('recording');
    expect(record.syncStatus).toBe('pending');
  });

  it('should sync provider task result into local video record', async () => {
    const {
      service,
      mockRoomRepository,
      mockChannelRepository,
      mockVideoRecordRepository,
    } = createService();

    mockVideoRecordRepository.findOne.mockResolvedValue({
      id: 'record-sync-1',
      roomId: '940',
      channelId: '94',
      provider: 'volcengine',
      externalTaskId: 'task-sync-1',
      status: 'processing',
      syncStatus: 'pending',
      metadata: {},
      isDeleted: false,
    });
    mockRoomRepository.findOne.mockResolvedValue({
      id: '940',
      uuid: 'room-940',
      type: 'group',
      creatorId: 'user-940',
      participants: ['user-940'],
      status: 'active',
      channelId: '94',
      provider: 'volcengine',
      externalRoomId: 'ext-940',
      startedAt: now,
      isDeleted: false,
    });
    mockChannelRepository.findOne.mockResolvedValue({
      id: '94',
      provider: 'volcengine',
      appId: '1000001',
      appKey: 'app-key',
      appSecret: 'app-secret',
      extraConfig: {},
      isActive: true,
      isDeleted: false,
      updatedAt: now,
    });
    mockVideoRecordRepository.save.mockImplementation(async (payload: any) => payload);

    jest.spyOn(service as any, 'getChannelClient').mockResolvedValue({
      getRecordingTask: jest.fn().mockResolvedValue({
        taskId: 'task-sync-1',
        roomId: 'ext-940',
        status: 'completed',
        endTime: new Date(now.getTime() + 10_000),
        filePath: 's3://bucket/final.mp4',
        fileName: 'final.mp4',
        fileType: 'video/mp4',
        fileSize: 10240,
      }),
    });

    const synced = await service.syncVideoRecord('record-sync-1', { operatorId: 'user-940' });

    expect(synced).not.toBeNull();
    expect(synced?.status).toBe('completed');
    expect(synced?.syncStatus).toBe('synced');
    expect(synced?.filePath).toBe('s3://bucket/final.mp4');
  });

  it('should process volcengine recording webhook by task id', async () => {
    const {
      service,
      mockVideoRecordRepository,
    } = createService();

    mockVideoRecordRepository.findOne.mockResolvedValue({
      id: 'record-webhook-1',
      roomId: '950',
      channelId: '95',
      provider: 'volcengine',
      externalTaskId: 'task-webhook-1',
      status: 'processing',
      syncStatus: 'pending',
      metadata: {},
      isDeleted: false,
    });

    jest.spyOn(service, 'syncVideoRecord').mockResolvedValue({
      id: 'record-webhook-1',
      roomId: '950',
      channelId: '95',
      provider: 'volcengine',
      externalTaskId: 'task-webhook-1',
      status: 'completed',
      syncStatus: 'synced',
      metadata: {},
      isDeleted: false,
    } as any);

    const result = await service.handleVolcengineRecordingWebhook({
      taskId: 'task-webhook-1',
      status: 'completed',
      filePath: 'https://example.com/record.mp4',
    });

    expect(result.updated).toBe(true);
    expect(result.recordId).toBe('record-webhook-1');
  });
});
