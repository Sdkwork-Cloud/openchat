import axios from 'axios';
import { AlibabaRTCChannel } from './alibaba';
import { VolcengineRTCChannel } from './volcengine';
import { LiveKitRTCChannel } from './livekit';
import { RTCChannelConfig } from './rtc-channel.interface';
import { TencentRTCChannel } from './tencent';
import { RTCChannelBase } from './rtc-channel.base';
import { deflateSync, inflateSync } from 'zlib';

describe('RTC channel token security', () => {
  const baseConfig = {
    appId: 'app-id',
    appKey: 'app-key',
    appSecret: 'super-secret-signing-key',
    region: 'cn',
    endpoint: 'https://example.com',
  };

  afterEach(() => {
    jest.restoreAllMocks();
    ((RTCChannelBase as any).controlPlaneCircuitState as Map<string, unknown>).clear();
  });

  it('should issue and validate local signed token for volcengine fallback mode', async () => {
    const channel = new VolcengineRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'volcengine',
      volcTokenMode: 'local',
    } as RTCChannelConfig);

    const token = await channel.generateToken('room-1', 'user-1', 'participant', 300);
    expect(token.token).toContain('rtc.volcengine.');
    expect(await channel.validateToken(token.token)).toBe(true);
  });

  it('should issue Tencent UserSig payload and validate successfully', async () => {
    const channel = new TencentRTCChannel();
    await channel.initialize({
      ...baseConfig,
      appId: '1400000001',
      provider: 'tencent',
    } as RTCChannelConfig);

    const token = await channel.generateToken('room-2', 'user-2', 'participant', 300);
    expect(token.token).not.toContain('rtc.tencent.');
    expect(await channel.validateToken(token.token)).toBe(true);

    const rawBase64 = token.token
      .replace(/\*/g, '+')
      .replace(/-/g, '/')
      .replace(/_/g, '=');
    const payload = JSON.parse(inflateSync(Buffer.from(rawBase64, 'base64')).toString('utf8'));
    expect(payload['TLS.ver']).toBe('2.0');
    expect(payload['TLS.sdkappid']).toBe(1400000001);
    expect(payload['TLS.identifier']).toBe('user-2');
  });

  it('should reject tampered Tencent UserSig', async () => {
    const channel = new TencentRTCChannel();
    await channel.initialize({
      ...baseConfig,
      appId: '1400000001',
      provider: 'tencent',
    } as RTCChannelConfig);

    const token = await channel.generateToken('room-2', 'user-2', 'participant', 300);
    const rawBase64 = token.token
      .replace(/\*/g, '+')
      .replace(/-/g, '/')
      .replace(/_/g, '=');
    const payload = JSON.parse(inflateSync(Buffer.from(rawBase64, 'base64')).toString('utf8'));
    payload['TLS.time'] = payload['TLS.time'] + 1;
    const tampered = deflateSync(Buffer.from(JSON.stringify(payload), 'utf8'))
      .toString('base64')
      .replace(/\+/g, '*')
      .replace(/\//g, '-')
      .replace(/=/g, '_');
    expect(await channel.validateToken(tampered)).toBe(false);
  });

  it('should include and validate userbuf when Tencent room restriction is enabled', async () => {
    const channel = new TencentRTCChannel();
    await channel.initialize({
      ...baseConfig,
      appId: '1400000001',
      provider: 'tencent',
      tencentEnableUserBuf: true,
    } as RTCChannelConfig);

    const token = await channel.generateToken('room-restrict-1', 'user-2', 'participant', 300);
    expect(await channel.validateToken(token.token)).toBe(true);

    const rawBase64 = token.token
      .replace(/\*/g, '+')
      .replace(/-/g, '/')
      .replace(/_/g, '=');
    const payload = JSON.parse(inflateSync(Buffer.from(rawBase64, 'base64')).toString('utf8'));
    expect(typeof payload['TLS.userbuf']).toBe('string');
    expect(payload['TLS.userbuf'].length).toBeGreaterThan(10);
  });

  it('should reject token validated by different provider channel', async () => {
    const volcengine = new VolcengineRTCChannel();
    const tencent = new TencentRTCChannel();

    await volcengine.initialize({
      ...baseConfig,
      provider: 'volcengine',
    } as RTCChannelConfig);
    await tencent.initialize({
      ...baseConfig,
      appId: '1400000001',
      provider: 'tencent',
    } as RTCChannelConfig);

    const token = await volcengine.generateToken('room-3', 'user-3', 'participant', 300);
    expect(await tencent.validateToken(token.token)).toBe(false);
  });

  it('should fail token generation in strict volcengine mode without official token source', async () => {
    const channel = new VolcengineRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'volcengine',
      volcTokenMode: 'openapi',
      allowLocalTokenFallback: false,
    } as RTCChannelConfig);

    await expect(
      channel.generateToken('room-strict', 'user-strict', 'participant', 300),
    ).rejects.toThrow();
  });

  it('should issue Alibaba RTC token payload and validate successfully', async () => {
    const channel = new AlibabaRTCChannel();
    await channel.initialize({
      ...baseConfig,
      appId: 'ali-app-id',
      appKey: 'ali-app-key',
      provider: 'alibaba',
    } as RTCChannelConfig);

    const token = await channel.generateToken('room-ali', 'user-ali', 'participant', 300);
    expect(await channel.validateToken(token.token)).toBe(true);

    const payload = JSON.parse(Buffer.from(token.token, 'base64').toString('utf8'));
    expect(payload.appid).toBe('ali-app-id');
    expect(payload.channelid).toBe('room-ali');
    expect(payload.userid).toBe('user-ali');
    expect(typeof payload.token).toBe('string');
  });

  it('should reject tampered Alibaba RTC token payload', async () => {
    const channel = new AlibabaRTCChannel();
    await channel.initialize({
      ...baseConfig,
      appId: 'ali-app-id',
      appKey: 'ali-app-key',
      provider: 'alibaba',
    } as RTCChannelConfig);

    const token = await channel.generateToken('room-ali-2', 'user-ali-2', 'participant', 300);
    const payload = JSON.parse(Buffer.from(token.token, 'base64').toString('utf8'));
    payload.userid = 'other-user';
    const tampered = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    expect(await channel.validateToken(tampered)).toBe(false);
  });

  it('should issue verifiable tokens for all supported providers', async () => {
    const channels = [
      { provider: 'alibaba' as const, channel: new AlibabaRTCChannel() },
      { provider: 'tencent' as const, channel: new TencentRTCChannel() },
      { provider: 'volcengine' as const, channel: new VolcengineRTCChannel() },
      { provider: 'livekit' as const, channel: new LiveKitRTCChannel() },
    ];

    for (const entry of channels) {
      await entry.channel.initialize({
        ...baseConfig,
        ...(entry.provider === 'tencent' ? { appId: '1400000001' } : {}),
        ...(entry.provider === 'alibaba' ? { appId: 'ali-app-id', appKey: 'ali-app-key' } : {}),
        ...(entry.provider === 'volcengine' ? { volcTokenMode: 'local' } : {}),
        provider: entry.provider,
      } as RTCChannelConfig);

      const token = await entry.channel.generateToken(
        `room-${entry.provider}`,
        `user-${entry.provider}`,
      );
      expect(await entry.channel.validateToken(token.token)).toBe(true);
    }
  });

  it('should keep local room participant state when control-plane delegate is disabled', async () => {
    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'noop',
    } as RTCChannelConfig);

    const room = await channel.createRoom('room-local-state', 'Local Room', 'group');
    expect(room.participants).toEqual([]);

    await channel.addParticipant('room-local-state', 'user-a');
    await channel.addParticipant('room-local-state', 'user-b');
    expect(await channel.getParticipants('room-local-state')).toEqual(['user-a', 'user-b']);

    const roomInfo = await channel.getRoomInfo('room-local-state');
    expect(roomInfo?.participants).toEqual(['user-a', 'user-b']);

    await channel.removeParticipant('room-local-state', 'user-a');
    expect(await channel.getParticipants('room-local-state')).toEqual(['user-b']);

    await channel.destroyRoom('room-local-state');
    expect(await channel.getRoomInfo('room-local-state')).toBeNull();
  });

  it('should fail fast in strict control-plane mode when delegate url is missing', async () => {
    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneStrict: true,
    } as RTCChannelConfig);

    await expect(channel.createRoom('room-strict-control')).rejects.toThrow(
      /control plane delegate URL is not configured/i,
    );
  });

  it('should call delegate control-plane endpoints when configured', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockResolvedValueOnce({
        data: {
          success: true,
          room: {
            roomId: 'room-delegate',
            roomName: 'Delegated Room',
            type: 'group',
            participants: ['user-1'],
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          success: true,
          participants: ['user-1', 'user-2'],
        },
      } as any);

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
      controlPlaneAuthToken: 'test-token',
    } as RTCChannelConfig);

    const room = await channel.createRoom('room-delegate', 'Delegated Room', 'group');
    expect(room.participants).toEqual(['user-1']);

    const participants = await channel.getParticipants('room-delegate');
    expect(participants).toEqual(['user-1', 'user-2']);

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://rtc-control.test/api/rooms',
      }),
    );
    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://rtc-control.test/api/rooms/room-delegate/participants',
      }),
    );
  });

  it('should parse nested delegate payload for room and participants', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            room: {
              roomId: 'room-nested',
              roomName: 'Nested Room',
              type: 'group',
              participants: ['user-n1'],
            },
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            participants: ['user-n1', 'user-n2'],
          },
        },
      } as any);

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
    } as RTCChannelConfig);

    const room = await channel.createRoom('room-nested', 'Nested Room', 'group');
    expect(room.roomId).toBe('room-nested');
    expect(room.participants).toEqual(['user-n1']);

    const participants = await channel.getParticipants('room-nested');
    expect(participants).toEqual(['user-n1', 'user-n2']);
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('should parse delegate alias fields and user object arrays', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockResolvedValueOnce({
        data: {
          code: 0,
          result: {
            room: {
              room_id: 'room-alias',
              room_name: 'Alias Room',
              room_type: 'group',
              users: [{ user_id: 'user-a1' }, { id: 'user-a2' }],
            },
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          code: '0',
          result: {
            participantIds: [{ uid: 'user-a1' }, { userId: 'user-a3' }],
          },
        },
      } as any);

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
    } as RTCChannelConfig);

    const room = await channel.createRoom('room-alias', 'Alias Room', 'group');
    expect(room.roomId).toBe('room-alias');
    expect(room.participants).toEqual(['user-a1', 'user-a2']);

    const participants = await channel.getParticipants('room-alias');
    expect(participants).toEqual(['user-a1', 'user-a3']);
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('should accept numeric ids, nested user objects and room type aliases in delegate payload', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockResolvedValueOnce({
        data: {
          ret: 0,
          room: {
            id: 10001,
            name: 'Alias Numeric',
            roomType: 'conference',
            participants: [{ user: { id: 20001 } }, 20002],
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          status: 0,
          users: [{ user_id: 20003 }, { uid: '20004' }],
        },
      } as any);

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
    } as RTCChannelConfig);

    const room = await channel.createRoom('room-ignored', 'Alias Numeric', 'group');
    expect(room.roomId).toBe('10001');
    expect(room.type).toBe('group');
    expect(room.participants).toEqual(['20001', '20002']);

    const participants = await channel.getParticipants('10001');
    expect(participants).toEqual(['20003', '20004']);
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('should not keep stale local alias when delegate canonicalizes roomId', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockResolvedValueOnce({
        data: {
          success: true,
          room: {
            roomId: 'room-canonicalized',
            roomName: 'Canonicalized Room',
            type: 'group',
            participants: [],
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: { success: true },
      } as any)
      .mockRejectedValue(Object.assign(new Error('delegate unavailable'), {
        code: 'ENOTFOUND',
        isAxiosError: true,
      }));

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
      controlPlaneMaxRetries: 0,
    } as RTCChannelConfig);

    const created = await channel.createRoom('room-requested', 'Canonicalized Room', 'group');
    expect(created.roomId).toBe('room-canonicalized');

    await channel.destroyRoom('room-canonicalized');
    await expect(channel.getRoomInfo('room-requested')).resolves.toBeNull();
    expect(requestSpy).toHaveBeenCalledTimes(3);
  });

  it('should retry delegate request once and recover from transient timeout', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), {
        code: 'ECONNABORTED',
        isAxiosError: true,
      }))
      .mockResolvedValueOnce({
        data: {
          success: true,
          participants: ['user-r1', 'user-r2'],
        },
      } as any);

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
      controlPlaneMaxRetries: 1,
      controlPlaneRetryBaseDelayMs: 1,
      controlPlaneRetryMaxDelayMs: 1,
      controlPlaneRetryJitterRatio: 0,
    } as RTCChannelConfig);

    const participants = await channel.getParticipants('room-retry');
    expect(participants).toEqual(['user-r1', 'user-r2']);
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('should not retry createRoom by default because POST operations are unsafe', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockRejectedValue(Object.assign(new Error('network unavailable'), {
        code: 'ENOTFOUND',
        isAxiosError: true,
      }));

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
      controlPlaneMaxRetries: 3,
    } as RTCChannelConfig);

    const room = await channel.createRoom('room-unsafe-default', 'Unsafe Default', 'group');
    expect(room.roomId).toBe('room-unsafe-default');
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('should retry createRoom when unsafe operation retries are explicitly enabled', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), {
        code: 'ECONNABORTED',
        isAxiosError: true,
      }))
      .mockResolvedValueOnce({
        data: {
          success: true,
          room: {
            roomId: 'room-unsafe-enabled',
            roomName: 'Unsafe Enabled',
            type: 'group',
            participants: [],
          },
        },
      } as any);

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
      controlPlaneMaxRetries: 1,
      controlPlaneRetryUnsafeOperations: true,
      controlPlaneRetryBaseDelayMs: 1,
      controlPlaneRetryMaxDelayMs: 1,
      controlPlaneRetryJitterRatio: 0,
    } as RTCChannelConfig);

    const room = await channel.createRoom('room-unsafe-enabled', 'Unsafe Enabled', 'group');
    expect(room.roomId).toBe('room-unsafe-enabled');
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('should attach idempotency key header for unsafe control-plane operations', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockResolvedValue({
        data: {
          success: true,
          room: {
            roomId: 'room-idempotency',
            roomName: 'Idempotency',
            type: 'group',
            participants: [],
          },
        },
      } as any);

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
    } as RTCChannelConfig);

    await channel.createRoom('room-idempotency', 'Idempotency', 'group');
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': expect.stringMatching(/^livekit-createRoom:/),
        }),
      }),
    );
  });

  it('should reuse idempotency key across retries for unsafe operations', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), {
        code: 'ECONNABORTED',
        isAxiosError: true,
      }))
      .mockResolvedValueOnce({
        data: {
          success: true,
          room: {
            roomId: 'room-idempotency-retry',
            roomName: 'Idempotency Retry',
            type: 'group',
            participants: [],
          },
        },
      } as any);

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
      controlPlaneRetryUnsafeOperations: true,
      controlPlaneMaxRetries: 1,
      controlPlaneRetryBaseDelayMs: 1,
      controlPlaneRetryMaxDelayMs: 1,
      controlPlaneRetryJitterRatio: 0,
      controlPlaneIdempotencyHeader: 'X-Idempotency-Key',
    } as RTCChannelConfig);

    await channel.createRoom('room-idempotency-retry', 'Idempotency Retry', 'group');
    expect(requestSpy).toHaveBeenCalledTimes(2);

    const firstCall = requestSpy.mock.calls[0][0] as Record<string, any>;
    const secondCall = requestSpy.mock.calls[1][0] as Record<string, any>;
    const firstKey = firstCall.headers['X-Idempotency-Key'];
    const secondKey = secondCall.headers['X-Idempotency-Key'];
    expect(typeof firstKey).toBe('string');
    expect(firstKey.length).toBeGreaterThan(16);
    expect(secondKey).toBe(firstKey);
  });

  it('should open circuit and short-circuit subsequent calls in non-strict mode', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockRejectedValue(Object.assign(new Error('network unavailable'), {
        code: 'ENOTFOUND',
        isAxiosError: true,
      }));

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
      controlPlaneMaxRetries: 0,
      controlPlaneCircuitBreakerFailureThreshold: 1,
      controlPlaneCircuitBreakerOpenMs: 60000,
    } as RTCChannelConfig);

    expect(await channel.getParticipants('room-circuit-open')).toEqual([]);
    expect(await channel.getParticipants('room-circuit-open')).toEqual([]);
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('should isolate circuit breaker state across different delegate base URLs', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockRejectedValueOnce(Object.assign(new Error('network unavailable'), {
        code: 'ENOTFOUND',
        isAxiosError: true,
      }))
      .mockResolvedValueOnce({
        data: {
          success: true,
          participants: ['user-isolated'],
        },
      } as any);

    const channelA = new LiveKitRTCChannel();
    await channelA.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control-a.test/api',
      controlPlaneMaxRetries: 0,
      controlPlaneCircuitBreakerFailureThreshold: 1,
      controlPlaneCircuitBreakerOpenMs: 60000,
    } as RTCChannelConfig);

    const channelB = new LiveKitRTCChannel();
    await channelB.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneBaseUrl: 'https://rtc-control-b.test/api',
      controlPlaneMaxRetries: 0,
      controlPlaneCircuitBreakerFailureThreshold: 1,
      controlPlaneCircuitBreakerOpenMs: 60000,
    } as RTCChannelConfig);

    expect(await channelA.getParticipants('room-circuit-scope-a')).toEqual([]);
    expect(await channelB.getParticipants('room-circuit-scope-b')).toEqual(['user-isolated']);
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('should throw immediately when strict mode hits an open circuit', async () => {
    const requestSpy = jest.spyOn(axios, 'request')
      .mockRejectedValue(Object.assign(new Error('network unavailable'), {
        code: 'ENOTFOUND',
        isAxiosError: true,
      }));

    const channel = new LiveKitRTCChannel();
    await channel.initialize({
      ...baseConfig,
      provider: 'livekit',
      controlPlaneMode: 'delegate',
      controlPlaneStrict: true,
      controlPlaneBaseUrl: 'https://rtc-control.test/api',
      controlPlaneMaxRetries: 0,
      controlPlaneCircuitBreakerFailureThreshold: 1,
      controlPlaneCircuitBreakerOpenMs: 60000,
    } as RTCChannelConfig);

    await expect(channel.getParticipants('room-circuit-strict')).rejects.toThrow(/network unavailable/i);
    await expect(channel.getParticipants('room-circuit-strict')).rejects.toThrow(/circuit is open/i);
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });
});
