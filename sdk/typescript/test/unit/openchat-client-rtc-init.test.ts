import { OpenChatClient } from '../../src/openchat-client';
import { ApiService } from '../../src/services/api-service';
import { RTCManager } from '../../src/rtc/rtc-manager';
import { OpenChatSDKConfig, RTCProviderCapabilitiesResponse } from '../../src/types';
import { RTCManagerConfig, RTCProviderType } from '../../src/rtc/types';

const testConfig: OpenChatSDKConfig = {
  server: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    maxRetries: 3,
  },
  im: {
    wsUrl: 'ws://localhost:3000/ws',
  },
  auth: {
    uid: 'test-user-1',
    token: 'test-token-123',
  },
};

const runtimeKeys = ['TRTC', 'LivekitClient', 'AliRTC', 'AliRTCSdk'] as const;
const runtimeSnapshot: Record<(typeof runtimeKeys)[number], any> = {
  TRTC: (globalThis as any).TRTC,
  LivekitClient: (globalThis as any).LivekitClient,
  AliRTC: (globalThis as any).AliRTC,
  AliRTCSdk: (globalThis as any).AliRTCSdk,
};

function resetRuntimeGlobals(): void {
  for (const key of runtimeKeys) {
    if (typeof runtimeSnapshot[key] === 'undefined') {
      delete (globalThis as any)[key];
    } else {
      (globalThis as any)[key] = runtimeSnapshot[key];
    }
  }
}

function buildCapabilities(
  data: Partial<RTCProviderCapabilitiesResponse>,
): RTCProviderCapabilitiesResponse {
  return {
    defaultProvider: 'volcengine',
    fallbackOrder: ['volcengine'],
    activeProviders: ['volcengine'],
    providers: [],
    ...data,
  };
}

describe('OpenChatClient RTC init provider routing', () => {
  let initializeSpy: jest.SpyInstance<Promise<void>, [config: RTCManagerConfig]>;
  let capabilitiesSpy: jest.SpyInstance<Promise<RTCProviderCapabilitiesResponse>, []>;

  beforeEach(() => {
    resetRuntimeGlobals();
    initializeSpy = jest
      .spyOn(RTCManager.prototype, 'initialize')
      .mockResolvedValue(undefined);
    capabilitiesSpy = jest
      .spyOn(ApiService.prototype, 'getRTCProviderCapabilities')
      .mockResolvedValue(
        buildCapabilities({}),
      );
  });

  afterEach(() => {
    resetRuntimeGlobals();
    jest.restoreAllMocks();
  });

  test('应在推荐provider运行时依赖缺失时自动回退到可用provider', async () => {
    capabilitiesSpy.mockResolvedValue(
      buildCapabilities({
        defaultProvider: 'tencent',
        recommendedPrimary: 'tencent',
        fallbackOrder: ['tencent', 'volcengine'],
        activeProviders: ['tencent', 'volcengine'],
      }),
    );

    const client = new OpenChatClient(testConfig);
    await client.rtc.init();

    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: RTCProviderType.VOLCENGINE }),
    );
  });

  test('应优先选择运行时依赖已就绪的推荐provider', async () => {
    (globalThis as any).TRTC = {};
    capabilitiesSpy.mockResolvedValue(
      buildCapabilities({
        defaultProvider: 'volcengine',
        recommendedPrimary: 'tencent',
        fallbackOrder: ['tencent', 'volcengine'],
        activeProviders: ['tencent', 'volcengine'],
      }),
    );

    const client = new OpenChatClient(testConfig);
    await client.rtc.init();

    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: RTCProviderType.TENCENT }),
    );
  });

  test('应按服务端fallbackOrder进行降级选路', async () => {
    (globalThis as any).LivekitClient = {};
    capabilitiesSpy.mockResolvedValue(
      buildCapabilities({
        defaultProvider: 'volcengine',
        fallbackOrder: ['livekit', 'volcengine'],
        activeProviders: ['volcengine'],
      }),
    );

    const client = new OpenChatClient(testConfig);
    await client.rtc.init();

    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: RTCProviderType.LIVEKIT }),
    );
  });

  test.each([
    { provider: RTCProviderType.TENCENT, runtimeKey: 'TRTC' },
    { provider: RTCProviderType.LIVEKIT, runtimeKey: 'LivekitClient' },
    { provider: RTCProviderType.ALIBABA, runtimeKey: 'AliRTC' },
  ])(
    '当推荐provider=$provider 且缺少运行时依赖($runtimeKey)时应回退',
    async ({ provider }) => {
      capabilitiesSpy.mockResolvedValue(
        buildCapabilities({
          defaultProvider: 'volcengine',
          recommendedPrimary: provider as any,
          fallbackOrder: [provider as any, 'volcengine'],
          activeProviders: [provider as any, 'volcengine'],
        }),
      );

      const client = new OpenChatClient(testConfig);
      await client.rtc.init();

      expect(initializeSpy).toHaveBeenCalledTimes(1);
      expect(initializeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ provider: RTCProviderType.VOLCENGINE }),
      );
    },
  );

  test('Alibaba 运行时依赖 AliRTCSdk 可被识别为就绪', async () => {
    (globalThis as any).AliRTCSdk = {};
    capabilitiesSpy.mockResolvedValue(
      buildCapabilities({
        defaultProvider: 'volcengine',
        recommendedPrimary: 'alibaba',
        fallbackOrder: ['alibaba', 'volcengine'],
        activeProviders: ['alibaba', 'volcengine'],
      }),
    );

    const client = new OpenChatClient(testConfig);
    await client.rtc.init();

    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: RTCProviderType.ALIBABA }),
    );
  });

  test('显式provider在运行时依赖缺失时应告警并继续初始化', async () => {
    const client = new OpenChatClient(testConfig);
    const warnSpy = jest.spyOn(client.getLogger(), 'warn').mockImplementation(() => undefined);

    await client.rtc.init({
      provider: RTCProviderType.TENCENT,
      providerConfig: {
        appId: 'test-app-id',
      },
    });

    expect(initializeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: RTCProviderType.TENCENT }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('runtime dependency is not ready'),
    );
    expect(capabilitiesSpy).not.toHaveBeenCalled();
  });
});
