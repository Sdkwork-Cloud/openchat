import { OpenChatWukongimAdapter } from '../../sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/src';
import { createRuntimeFromModuleExport } from '../../sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/src/runtime';

type Handler<T = unknown> = (payload?: T) => void;

class FakeChatManager {
  private readonly listeners = new Set<Handler>();

  addMessageListener(listener: Handler): void {
    this.listeners.add(listener);
  }

  removeMessageListener(listener: Handler): void {
    this.listeners.delete(listener);
  }

  emit(message: unknown): void {
    for (const listener of this.listeners) {
      listener(message);
    }
  }
}

class FakeConnectManager {
  private readonly listeners = new Set<
    (status: number, reasonCode?: number, connectionInfo?: unknown) => void
  >();

  addConnectStatusListener(
    listener: (status: number, reasonCode?: number, connectionInfo?: unknown) => void,
  ): void {
    this.listeners.add(listener);
  }

  removeConnectStatusListener(
    listener: (status: number, reasonCode?: number, connectionInfo?: unknown) => void,
  ): void {
    this.listeners.delete(listener);
  }

  emit(status: number, reasonCode?: number): void {
    for (const listener of this.listeners) {
      listener(status, reasonCode);
    }
  }
}

class FakeEventManager {
  private readonly listeners = new Set<Handler>();

  addEventListener(listener: Handler): void {
    this.listeners.add(listener);
  }

  removeEventListener(listener: Handler): void {
    this.listeners.delete(listener);
  }

  emit(event: unknown): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

class FakeWKSDK {
  static readonly sharedInstance = new FakeWKSDK();

  static shared(): FakeWKSDK {
    return FakeWKSDK.sharedInstance;
  }

  readonly config: Record<string, unknown> = {};
  readonly chatManager = new FakeChatManager();
  readonly connectManager = new FakeConnectManager();
  readonly eventManager = new FakeEventManager();
  connectCalls = 0;
  disconnectCalls = 0;

  connect(): void {
    this.connectCalls += 1;
  }

  disconnect(): void {
    this.disconnectCalls += 1;
  }
}

describe('wukongim runtime compatibility', () => {
  test('supports WKSDK.shared exports and normalizes legacy text payloads into adapter messages', async () => {
    const runtime = createRuntimeFromModuleExport({
      WKSDK: FakeWKSDK,
      ConnectStatus: {
        Disconnect: 0,
        Connected: 1,
        Connecting: 2,
        ConnectFail: 3,
        ConnectKick: 4,
      },
    });
    const adapter = new OpenChatWukongimAdapter({
      runtime,
    });
    const states: string[] = [];
    const received: Array<Record<string, unknown>> = [];

    adapter.onConnectionStateChange((state) => {
      states.push(state);
    });
    adapter.onMessage((frame) => {
      received.push(frame as unknown as Record<string, unknown>);
    });

    await adapter.connect({
      uid: '3',
      token: '',
      wsUrl: 'ws://127.0.0.1:15200',
      deviceId: 'sdk-smoke-bob',
      deviceFlag: 1,
    });

    expect(FakeWKSDK.sharedInstance.connectCalls).toBe(1);
    expect(FakeWKSDK.sharedInstance.config).toMatchObject({
      addr: 'ws://127.0.0.1:15200',
      uid: '3',
      token: '',
      deviceFlag: 1,
    });

    FakeWKSDK.sharedInstance.connectManager.emit(1);
    FakeWKSDK.sharedInstance.chatManager.emit({
      messageID: 'msg-legacy-1',
      fromUID: '2',
      timestamp: 1710000000,
      channel: {
        channelID: '2_3',
        channelType: 1,
      },
      content: {
        contentObj: {
          type: 'text',
          content: 'hello from legacy payload',
        },
      },
    });

    expect(states).toContain('connected');
    expect(received).toEqual([
      expect.objectContaining({
        messageId: 'msg-legacy-1',
        senderId: '2',
        conversation: {
          type: 'SINGLE',
          targetId: '2_3',
        },
        message: {
          type: 'TEXT',
          text: {
            text: 'hello from legacy payload',
          },
        },
      }),
    ]);
  });
});
