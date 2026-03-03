import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis/redis.service';
import {
  EventBusService,
  EventPriority,
  EventTypeConstants,
  type IEvent,
} from './event-bus.service';

type ConfigServiceMock = {
  get: jest.Mock;
};

type RedisServiceMock = {
  publish: jest.Mock;
  subscribe: jest.Mock;
  getClient: jest.Mock;
};

const flushMicrotasks = async (): Promise<void> => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};

describe('EventBusService', () => {
  let service: EventBusService;
  let configServiceMock: ConfigServiceMock;
  let redisServiceMock: RedisServiceMock;

  beforeEach(async () => {
    configServiceMock = {
      get: jest.fn((key, defaultValue) => {
        if (key === 'EVENTBUS_MAX_STORED_EVENTS') {
          return 3 as typeof defaultValue;
        }
        if (key === 'EVENTBUS_ENABLE_PERSISTENCE') {
          return true as typeof defaultValue;
        }
        if (key === 'EVENTBUS_ENABLE_BROADCAST') {
          return false as typeof defaultValue;
        }
        return defaultValue as typeof defaultValue;
      }),
    };

    const clientPublish = jest.fn(async () => 1);
    redisServiceMock = {
      publish: jest.fn(async () => undefined),
      subscribe: jest.fn(async () => undefined),
      getClient: jest.fn(() => ({ publish: clientPublish })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: RedisService, useValue: redisServiceMock },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should publish and subscribe to events', async () => {
    const handler = jest.fn<void, [IEvent<{ test: string }>]>();
    const unsubscribe = service.subscribe<IEvent<{ test: string }>>(
      EventTypeConstants.DEVICE_CONNECTED,
      handler,
    );

    await service.publish(EventTypeConstants.DEVICE_CONNECTED, { test: 'data' });
    await flushMicrotasks();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].eventName).toBe(EventTypeConstants.DEVICE_CONNECTED);
    expect(handler.mock.calls[0][0].data).toEqual({ test: 'data' });

    unsubscribe();
  });

  it('should support event filters', async () => {
    const handler = jest.fn<void, [IEvent<{ value: number }>]>();
    const unsubscribe = service.subscribe<IEvent<{ value: number }>>(
      EventTypeConstants.DEVICE_CONNECTED,
      handler,
      {
        filter: (event) => (event.data as { value: number }).value === 1,
      },
    );

    await service.publish(EventTypeConstants.DEVICE_CONNECTED, { value: 1 });
    await service.publish(EventTypeConstants.DEVICE_CONNECTED, { value: 2 });
    await flushMicrotasks();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].data).toEqual({ value: 1 });

    unsubscribe();
  });

  it('should unsubscribe with returned unsubscribe function', async () => {
    const handler = jest.fn<void, [IEvent<{ test: string }>]>();
    const unsubscribe = service.subscribe<IEvent<{ test: string }>>(
      EventTypeConstants.DEVICE_DISCONNECTED,
      handler,
    );

    unsubscribe();

    await service.publish(EventTypeConstants.DEVICE_DISCONNECTED, { test: 'data' });
    await flushMicrotasks();

    expect(handler).not.toHaveBeenCalled();
  });

  it('should expose event stats', async () => {
    const handler = jest.fn<void, [IEvent<{ test: string }>]>();
    const unsubscribe = service.subscribe<IEvent<{ test: string }>>(
      EventTypeConstants.DEVICE_CONNECTED,
      handler,
      { priority: EventPriority.HIGH },
    );

    await service.publish(EventTypeConstants.DEVICE_CONNECTED, { test: 'a' });
    await service.publish(EventTypeConstants.DEVICE_CONNECTED, { test: 'b' });
    await flushMicrotasks();

    const stats = service.getStats();
    expect(stats.subscriptionCount).toBe(1);
    expect(stats.totalPublished).toBe(2);
    expect(stats.totalProcessed).toBeGreaterThanOrEqual(2);
    expect(stats.totalFailed).toBe(0);

    unsubscribe();
  });

  it('should count multiple subscriptions on the same event correctly', async () => {
    const h1 = jest.fn<void, [IEvent<{ ok: boolean }>]>();
    const h2 = jest.fn<void, [IEvent<{ ok: boolean }>]>();
    const unsubscribe1 = service.subscribe<IEvent<{ ok: boolean }>>(
      EventTypeConstants.DEVICE_CONNECTED,
      h1,
    );
    const unsubscribe2 = service.subscribe<IEvent<{ ok: boolean }>>(
      EventTypeConstants.DEVICE_CONNECTED,
      h2,
    );

    expect(service.getStats().subscriptionCount).toBe(2);

    await service.publish(EventTypeConstants.DEVICE_CONNECTED, { ok: true });
    await flushMicrotasks();
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);

    unsubscribe1();
    expect(service.getStats().subscriptionCount).toBe(1);

    unsubscribe2();
    expect(service.getStats().subscriptionCount).toBe(0);
  });

  it('should keep stable source for events published by the same instance', async () => {
    const handler = jest.fn<void, [IEvent<{ id: number }>]>();
    const unsubscribe = service.subscribe<IEvent<{ id: number }>>(
      EventTypeConstants.CUSTOM_EVENT,
      handler,
    );

    await service.publish(EventTypeConstants.CUSTOM_EVENT, { id: 1 });
    await service.publish(EventTypeConstants.CUSTOM_EVENT, { id: 2 });
    await flushMicrotasks();

    expect(handler).toHaveBeenCalledTimes(2);
    const sourceA = handler.mock.calls[0][0].source;
    const sourceB = handler.mock.calls[1][0].source;
    expect(sourceA).toBeTruthy();
    expect(sourceA).toBe(sourceB);

    unsubscribe();
  });

  it('should publishAndWait and resolve with matched response', async () => {
    const requestEventName = EventTypeConstants.CUSTOM_EVENT;
    const responseEventName = `${requestEventName}.response`;

    const unsubscribe = service.subscribe<IEvent<{ query: string }>>(
      requestEventName,
      async (event) => {
        const correlationId = event.metadata?.correlationId as string;
        await service.publish(responseEventName, { ok: true }, { metadata: { correlationId } });
      },
    );

    const result = await service.publishAndWait<{ query: string }, { ok: boolean }>(
      requestEventName,
      { query: 'ping' },
      1000,
    );

    expect(result).toEqual({ ok: true });
    unsubscribe();
  });

  it('should publishAndWait timeout when no response arrives', async () => {
    await expect(
      service.publishAndWait(EventTypeConstants.DEVICE_STATUS_CHANGED, { ping: true }, 20),
    ).rejects.toThrow('timeout');
  });

  it('should respect max stored events when persistence is enabled', async () => {
    for (let i = 0; i < 6; i++) {
      await service.publish(EventTypeConstants.CUSTOM_EVENT, { idx: i }, { persistent: true });
    }

    const events = await service.queryEvents({
      eventName: EventTypeConstants.CUSTOM_EVENT,
      sortOrder: 'asc',
    });
    const stats = service.getStats();

    expect(events).toHaveLength(3);
    expect(stats.storedEventCount).toBe(3);
  });
});
