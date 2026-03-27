import { OpenChatWukongimAdapter } from '../../sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/src';
import { OpenChatImSdk } from '../../sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/src';

type RuntimeHandler = (payload?: unknown) => void;

class FakeWukongimRuntime {
  readonly connectCalls: Array<Record<string, unknown>> = [];
  disconnectCalls = 0;
  private readonly handlers = new Map<string, Set<RuntimeHandler>>();

  async connect(session: Record<string, unknown>): Promise<void> {
    this.connectCalls.push(session);
  }

  async disconnect(): Promise<void> {
    this.disconnectCalls += 1;
  }

  on(event: string, handler: RuntimeHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<RuntimeHandler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  off(event: string, handler: RuntimeHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(payload);
    }
  }
}

function createBackendStub() {
  return {
    setAuthToken: jest.fn(),
    setAccessToken: jest.fn(),
    messages: {
      messageControllerSend: jest.fn().mockResolvedValue(undefined),
      messageControllerBatchSend: jest.fn().mockResolvedValue(undefined),
    },
    friends: {
      friendControllerSendRequest: jest.fn().mockResolvedValue({
        success: true,
        requestId: 'request-1',
      }),
    },
    auth: {
      controllerLogin: jest.fn().mockResolvedValue({
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        expiresIn: 7200,
        user: { id: 'user-1', username: 'alice' },
        imConfig: {
          wsUrl: 'ws://im.example.com',
          uid: 'user-1',
          token: 'wk-login-token',
        },
      }),
      controllerRegister: jest.fn().mockResolvedValue({
        token: 'register-token',
        refreshToken: 'register-refresh-token',
        expiresIn: 7200,
        user: { id: 'user-3', username: 'charlie' },
        imConfig: {
          wsUrl: 'ws://im.example.com',
          uid: 'user-3',
          token: 'wk-register-token',
        },
      }),
    },
    http: {
      get: jest.fn().mockResolvedValue({
        success: true,
        data: {
          wsUrl: 'ws://im.example.com',
          uid: 'user-1',
        },
      }),
      post: jest.fn().mockResolvedValue({
        success: true,
        data: {
          token: 'wk-bootstrap-token',
        },
      }),
      request: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('sdkwork-im-sdk TypeScript facade', () => {
  test('messages.sendText sends versioned HTTP payload with uppercase message type', async () => {
    const backend = createBackendStub();
    const sdk = new OpenChatImSdk({
      backendClient: backend,
    });

    await sdk.messages.sendText({
      toUserId: 'user-2',
      text: 'hello world',
      idempotencyKey: 'idem-1',
    });

    expect(backend.messages.messageControllerSend).toHaveBeenCalledWith({
      version: 2,
      conversation: {
        type: 'SINGLE',
        targetId: 'user-2',
      },
      message: {
        type: 'TEXT',
        text: {
          text: 'hello world',
        },
      },
      idempotencyKey: 'idem-1',
    });
  });

  test('events.publishToGroup sends a versioned event envelope for extensible business events', async () => {
    const backend = createBackendStub();
    const sdk = new OpenChatImSdk({
      backendClient: backend,
    });

    await sdk.events.publishToGroup({
      groupId: 'group-1',
      type: 'GAME_EVENT',
      name: 'chess.move',
      data: {
        move: 'e2e4',
      },
      metadata: {
        namespace: 'game',
        roomId: 'room-9',
      },
    });

    expect(backend.messages.messageControllerSend).toHaveBeenCalledWith({
      version: 2,
      conversation: {
        type: 'GROUP',
        targetId: 'group-1',
      },
      event: {
        type: 'GAME_EVENT',
        name: 'chess.move',
        data: {
          move: 'e2e4',
        },
        metadata: {
          namespace: 'game',
          roomId: 'room-9',
        },
      },
    });
  });

  test('rtc.signaling.sendOffer uses the event transport with a stable rtc namespace', async () => {
    const backend = createBackendStub();
    const sdk = new OpenChatImSdk({
      backendClient: backend,
    });

    await sdk.rtc.signaling.sendOffer({
      roomId: 'rtc-room-1',
      toUserId: 'user-2',
      sdp: 'offer-sdp',
      sessionId: 'session-1',
      correlationId: 'corr-1',
    });

    expect(backend.messages.messageControllerSend).toHaveBeenCalledWith({
      version: 2,
      conversation: {
        type: 'SINGLE',
        targetId: 'user-2',
      },
      event: {
        type: 'RTC_SIGNAL',
        name: 'rtc.offer',
        data: {
          roomId: 'rtc-room-1',
          toUserId: 'user-2',
          signalType: 'offer',
          sessionId: 'session-1',
          payload: {
            sdp: 'offer-sdp',
          },
        },
        metadata: {
          namespace: 'rtc',
          version: 1,
          correlationId: 'corr-1',
          roomId: 'rtc-room-1',
        },
      },
    });
  });

  test('friends.request delegates to the friend API and normalizes the result', async () => {
    const backend = createBackendStub();
    const sdk = new OpenChatImSdk({
      backendClient: backend,
    });

    const result = await sdk.friends.request({
      toUserId: 'user-2',
      message: 'let us connect',
    });

    expect(backend.friends.friendControllerSendRequest).toHaveBeenCalledWith({
      toUserId: 'user-2',
      message: 'let us connect',
    });
    expect(result).toEqual({
      success: true,
      requestId: 'request-1',
    });
  });

  test('session.login stores the HTTP token and boots realtime from login IM config', async () => {
    const backend = createBackendStub();
    const runtime = new FakeWukongimRuntime();
    const realtimeAdapter = new OpenChatWukongimAdapter({
      runtime,
    });
    const sdk = new OpenChatImSdk({
      backendClient: backend,
      realtimeAdapter,
    });

    const result = await sdk.session.login({
      username: 'alice',
      password: 'secret',
    });

    expect(backend.auth.controllerLogin).toHaveBeenCalledWith({
      username: 'alice',
      password: 'secret',
    });
    expect(backend.setAuthToken).toHaveBeenCalledWith('jwt-token');
    expect(backend.setAccessToken).toHaveBeenCalledWith('jwt-token');
    expect(runtime.connectCalls).toEqual([
      {
        uid: 'user-1',
        token: 'wk-login-token',
        wsUrl: 'ws://im.example.com',
      },
    ]);
    expect(result).toMatchObject({
      token: 'jwt-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    });
  });

  test('session.register stores the HTTP token and boots realtime from register IM config', async () => {
    const backend = createBackendStub();
    backend.auth.controllerRegister = jest.fn().mockResolvedValue({
      token: 'register-token',
      refreshToken: 'register-refresh-token',
      expiresIn: 7200,
      user: { id: 'user-3', username: 'charlie' },
      imConfig: {
        wsUrl: 'ws://im.example.com',
        uid: 'user-3',
        token: 'wk-register-token',
      },
    });
    const runtime = new FakeWukongimRuntime();
    const realtimeAdapter = new OpenChatWukongimAdapter({
      runtime,
    });
    const sdk = new OpenChatImSdk({
      backendClient: backend,
      realtimeAdapter,
    });

    const result = await sdk.session.register({
      username: 'charlie',
      password: 'secret',
    });

    expect(backend.auth.controllerRegister).toHaveBeenCalledWith({
      username: 'charlie',
      password: 'secret',
    });
    expect(backend.setAuthToken).toHaveBeenCalledWith('register-token');
    expect(backend.setAccessToken).toHaveBeenCalledWith('register-token');
    expect(runtime.connectCalls).toEqual([
      {
        uid: 'user-3',
        token: 'wk-register-token',
        wsUrl: 'ws://im.example.com',
      },
    ]);
    expect(result).toMatchObject({
      token: 'register-token',
      refreshToken: 'register-refresh-token',
      user: { id: 'user-3' },
    });
  });

  test('events.publishGameEvent standardizes game namespace metadata and transport type', async () => {
    const backend = createBackendStub();
    const sdk = new OpenChatImSdk({
      backendClient: backend,
    });

    await (sdk.events as { publishGameEvent: (payload: Record<string, unknown>) => Promise<unknown> }).publishGameEvent({
      groupId: 'group-8',
      name: 'chess.move',
      data: {
        move: 'e2e4',
      },
      metadata: {
        roomId: 'room-8',
      },
      idempotencyKey: 'idem-game-1',
    });

    expect(backend.messages.messageControllerSend).toHaveBeenCalledWith({
      version: 2,
      conversation: {
        type: 'GROUP',
        targetId: 'group-8',
      },
      event: {
        type: 'GAME_EVENT',
        name: 'chess.move',
        data: {
          move: 'e2e4',
        },
        metadata: {
          namespace: 'game',
          version: 1,
          roomId: 'room-8',
        },
      },
      idempotencyKey: 'idem-game-1',
    });
  });

  test('messages.send normalizes missing transport version and uppercase envelope types', async () => {
    const backend = createBackendStub();
    const sdk = new OpenChatImSdk({
      backendClient: backend,
    });

    await sdk.messages.send({
      conversation: {
        type: 'single',
        targetId: 'user-9',
      },
      message: {
        type: 'text',
        text: {
          text: 'normalized raw send',
        },
      },
    });

    expect(backend.messages.messageControllerSend).toHaveBeenCalledWith({
      version: 2,
      conversation: {
        type: 'SINGLE',
        targetId: 'user-9',
      },
      message: {
        type: 'TEXT',
        text: {
          text: 'normalized raw send',
        },
      },
    });
  });

  test('messages.batchSend normalizes each raw envelope before HTTP send', async () => {
    const backend = createBackendStub();
    const sdk = new OpenChatImSdk({
      backendClient: backend,
    });

    await sdk.messages.batchSend([
      {
        conversation: {
          type: 'single',
          targetId: 'user-10',
        },
        message: {
          type: 'text',
          text: {
            text: 'batch-single',
          },
        },
      },
      {
        version: 2,
        conversation: {
          type: 'group',
          targetId: 'group-10',
        },
        event: {
          type: 'game_event',
          name: 'chess.move',
          data: {
            move: 'e2e4',
          },
        },
      },
    ]);

    expect(backend.messages.messageControllerBatchSend).toHaveBeenCalledWith({
      messages: [
        {
          version: 2,
          conversation: {
            type: 'SINGLE',
            targetId: 'user-10',
          },
          message: {
            type: 'TEXT',
            text: {
              text: 'batch-single',
            },
          },
        },
        {
          version: 2,
          conversation: {
            type: 'GROUP',
            targetId: 'group-10',
          },
          event: {
            type: 'GAME_EVENT',
            name: 'chess.move',
            data: {
              move: 'e2e4',
            },
          },
        },
      ],
    });
  });

  test('session.bootstrapRealtime fetches WuKongIM config and token from app schema endpoints', async () => {
    const backend = createBackendStub();
    const runtime = new FakeWukongimRuntime();
    const realtimeAdapter = new OpenChatWukongimAdapter({
      runtime,
    });
    const sdk = new OpenChatImSdk({
      backendClient: backend,
      realtimeAdapter,
    });

    sdk.session.setAccessToken('jwt-token');
    const session = await sdk.session.bootstrapRealtime();

    expect(backend.setAuthToken).toHaveBeenCalledWith('jwt-token');
    expect(backend.setAccessToken).toHaveBeenCalledWith('jwt-token');
    expect(backend.http.get).toHaveBeenCalledWith('/im/v3/wukongim/config');
    expect(backend.http.post).toHaveBeenCalledWith('/im/v3/wukongim/token');
    expect(runtime.connectCalls).toEqual([
      {
        uid: 'user-1',
        token: 'wk-bootstrap-token',
        wsUrl: 'ws://im.example.com',
      },
    ]);
    expect(session).toEqual({
      uid: 'user-1',
      token: 'wk-bootstrap-token',
      wsUrl: 'ws://im.example.com',
    });
  });
});

describe('sdkwork-im-sdk TypeScript realtime adapter', () => {
  test('adapter normalizes versioned message and event payloads from the WukongIM runtime', async () => {
    const runtime = new FakeWukongimRuntime();
    const adapter = new OpenChatWukongimAdapter({
      runtime,
    });
    const receivedMessages: Array<Record<string, unknown>> = [];
    const receivedEvents: Array<Record<string, unknown>> = [];

    adapter.onMessage((message: unknown) => {
      receivedMessages.push(message as Record<string, unknown>);
    });
    adapter.onEvent((event: unknown) => {
      receivedEvents.push(event as Record<string, unknown>);
    });

    await adapter.connect({
      uid: 'user-1',
      token: 'wk-token',
      wsUrl: 'ws://im.example.com',
    });

    runtime.emit('message', {
      messageId: 'message-1',
      channelId: 'user-1',
      fromUid: 'user-2',
      timestamp: 1710000000,
      content: {
        version: 2,
        conversation: {
          type: 'SINGLE',
          targetId: 'user-1',
        },
        message: {
          type: 'TEXT',
          text: {
            text: 'hi from runtime',
          },
        },
      },
    });

    runtime.emit('message', {
      messageId: 'event-1',
      channelId: 'rtc-room-1',
      fromUid: 'user-2',
      timestamp: 1710000001,
      content: {
        version: 2,
        conversation: {
          type: 'GROUP',
          targetId: 'rtc-room-1',
        },
        event: {
          type: 'RTC_SIGNAL',
          name: 'rtc.offer',
          data: {
            roomId: 'rtc-room-1',
            signalType: 'offer',
            payload: {
              sdp: 'offer-sdp',
            },
          },
          metadata: {
            namespace: 'rtc',
            version: 1,
          },
        },
      },
    });

    expect(receivedMessages).toEqual([
      expect.objectContaining({
        messageId: 'message-1',
        conversation: {
          type: 'SINGLE',
          targetId: 'user-1',
        },
        message: {
          type: 'TEXT',
          text: {
            text: 'hi from runtime',
          },
        },
        raw: expect.objectContaining({
          fromUid: 'user-2',
        }),
      }),
    ]);

    expect(receivedEvents).toEqual([
      expect.objectContaining({
        messageId: 'event-1',
        conversation: {
          type: 'GROUP',
          targetId: 'rtc-room-1',
        },
        event: {
          type: 'RTC_SIGNAL',
          name: 'rtc.offer',
          data: {
            roomId: 'rtc-room-1',
            signalType: 'offer',
            payload: {
              sdp: 'offer-sdp',
            },
          },
          metadata: {
            namespace: 'rtc',
            version: 1,
          },
        },
        raw: expect.objectContaining({
          fromUid: 'user-2',
        }),
      }),
    ]);
  });

  test('adapter disconnects the underlying runtime and clears connection state', async () => {
    const runtime = new FakeWukongimRuntime();
    const adapter = new OpenChatWukongimAdapter({
      runtime,
    });

    await adapter.connect({
      uid: 'user-1',
      token: 'wk-token',
      wsUrl: 'ws://im.example.com',
    });
    expect(adapter.isConnected()).toBe(true);

    await adapter.disconnect();

    expect(runtime.disconnectCalls).toBe(1);
    expect(adapter.isConnected()).toBe(false);
  });

  test('adapter keeps nested legacy text payloads emitted by the current OpenChat provider', async () => {
    const runtime = new FakeWukongimRuntime();
    const adapter = new OpenChatWukongimAdapter({
      runtime,
    });
    const receivedMessages: Array<Record<string, unknown>> = [];

    adapter.onMessage((message: unknown) => {
      receivedMessages.push(message as Record<string, unknown>);
    });

    await adapter.connect({
      uid: 'user-3',
      token: 'wk-token',
      wsUrl: 'ws://im.example.com',
    });

    runtime.emit('message', {
      messageId: 'legacy-provider-1',
      channelId: '2',
      fromUid: '2',
      timestamp: 1710000004,
      content: {
        type: 'text',
        content: {
          text: {
            text: 'nested legacy text',
          },
        },
      },
    });

    expect(receivedMessages).toEqual([
      expect.objectContaining({
        messageId: 'legacy-provider-1',
        conversation: {
          type: 'SINGLE',
          targetId: '2',
        },
        message: {
          type: 'TEXT',
          text: {
            text: 'nested legacy text',
          },
        },
      }),
    ]);
  });

  test('realtime.onRaw exposes normalized message and event frames without filtering', async () => {
    const backend = createBackendStub();
    const runtime = new FakeWukongimRuntime();
    const realtimeAdapter = new OpenChatWukongimAdapter({
      runtime,
    });
    const sdk = new OpenChatImSdk({
      backendClient: backend,
      realtimeAdapter,
    });
    const received: Array<Record<string, unknown>> = [];

    (sdk.realtime as {
      onRaw: (listener: (frame: unknown) => void) => () => void;
      connect: (session: Record<string, unknown>) => Promise<unknown>;
    }).onRaw((frame: unknown) => {
      received.push(frame as Record<string, unknown>);
    });

    await (sdk.realtime as {
      connect: (session: Record<string, unknown>) => Promise<unknown>;
    }).connect({
      uid: 'user-1',
      token: 'wk-token',
      wsUrl: 'ws://im.example.com',
    });

    runtime.emit('message', {
      messageId: 'message-raw-1',
      channelId: 'user-1',
      fromUid: 'user-2',
      timestamp: 1710000002,
      content: {
        version: 2,
        conversation: {
          type: 'SINGLE',
          targetId: 'user-1',
        },
        message: {
          type: 'TEXT',
          text: {
            text: 'raw-message',
          },
        },
      },
    });

    runtime.emit('message', {
      messageId: 'event-raw-1',
      channelId: 'group-raw-1',
      fromUid: 'user-2',
      timestamp: 1710000003,
      content: {
        version: 2,
        conversation: {
          type: 'GROUP',
          targetId: 'group-raw-1',
        },
        event: {
          type: 'GAME_EVENT',
          name: 'game.round',
          data: {
            round: 1,
          },
          metadata: {
            namespace: 'game',
          },
        },
      },
    });

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual(
      expect.objectContaining({
        messageId: 'message-raw-1',
        message: expect.objectContaining({
          type: 'TEXT',
        }),
      }),
    );
    expect(received[1]).toEqual(
      expect.objectContaining({
        messageId: 'event-raw-1',
        event: expect.objectContaining({
          type: 'GAME_EVENT',
        }),
      }),
    );
  });

  test('realtime.connect persists the connected session into sdk session state', async () => {
    const backend = createBackendStub();
    const runtime = new FakeWukongimRuntime();
    const realtimeAdapter = new OpenChatWukongimAdapter({
      runtime,
    });
    const sdk = new OpenChatImSdk({
      backendClient: backend,
      realtimeAdapter,
    });

    const connected = await (sdk.realtime as {
      connect: (session: Record<string, unknown>) => Promise<unknown>;
    }).connect({
      uid: 'user-7',
      token: 'wk-token-7',
      wsUrl: 'ws://im.example.com',
    });

    expect(connected).toEqual({
      uid: 'user-7',
      token: 'wk-token-7',
      wsUrl: 'ws://im.example.com',
    });
    expect(sdk.session.getState()).toMatchObject({
      realtime: {
        uid: 'user-7',
        token: 'wk-token-7',
        wsUrl: 'ws://im.example.com',
      },
    });
  });
});
