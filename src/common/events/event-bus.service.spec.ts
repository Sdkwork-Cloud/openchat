import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService, EventType, EventPriority, EventData } from './event-bus.service';
import { ConfigModule } from '@nestjs/config';

// Mock Redis
const mockRedis = {
  publish: jest.fn().mockResolvedValue(1),
  duplicate: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    on: jest.fn(),
  }),
};

describe('EventBusService', () => {
  let service: EventBusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.example',
        }),
      ],
      providers: [
        EventBusService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
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
    const testEventData = { test: 'data' };
    const callback = jest.fn();

    // 订阅事件
    const subscription = service.subscribe(EventType.DEVICE_CONNECTED);
    subscription.subscribe(callback);

    // 发布事件
    await service.publish(EventType.DEVICE_CONNECTED, testEventData);

    // 验证回调被调用
    expect(mockRedis.publish).toHaveBeenCalled();
  });

  it('should handle event priorities', async () => {
    const testEventData = { test: 'data' };
    const highPriorityCallback = jest.fn();
    const mediumPriorityCallback = jest.fn();
    const lowPriorityCallback = jest.fn();

    // 订阅不同优先级的事件
    service.subscribe(EventType.DEVICE_CONNECTED, {
      priority: EventPriority.HIGH,
    }).subscribe(highPriorityCallback);

    service.subscribe(EventType.DEVICE_CONNECTED, {
      priority: EventPriority.MEDIUM,
    }).subscribe(mediumPriorityCallback);

    service.subscribe(EventType.DEVICE_CONNECTED, {
      priority: EventPriority.LOW,
    }).subscribe(lowPriorityCallback);

    // 发布事件
    await service.publish(EventType.DEVICE_CONNECTED, testEventData);

    // 验证回调被调用
    expect(mockRedis.publish).toHaveBeenCalled();
  });

  it('should handle event filters', async () => {
    const testEventData1 = { test: 'data', value: 1 };
    const testEventData2 = { test: 'data', value: 2 };
    const callback = jest.fn();

    // 订阅带过滤器的事件
    const subscription = service.subscribe(EventType.DEVICE_CONNECTED, {
      filter: (event) => event.payload.value === 1,
    });
    subscription.subscribe(callback);

    // 发布符合过滤器的事件
    await service.publish(EventType.DEVICE_CONNECTED, testEventData1);
    // 发布不符合过滤器的事件
    await service.publish(EventType.DEVICE_CONNECTED, testEventData2);

    // 验证Redis发布被调用
    expect(mockRedis.publish).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe from events', async () => {
    const testEventData = { test: 'data' };
    const callback = jest.fn();

    // 订阅事件
    const subscription = service.subscribe(EventType.DEVICE_CONNECTED);
    subscription.subscribe(callback);

    // 取消订阅
    service.unsubscribe(EventType.DEVICE_CONNECTED);

    // 发布事件
    await service.publish(EventType.DEVICE_CONNECTED, testEventData);

    // 验证Redis发布被调用
    expect(mockRedis.publish).toHaveBeenCalled();
  });

  it('should subscribe to multiple events', async () => {
    const testEventData1 = { test: 'data1' };
    const testEventData2 = { test: 'data2' };
    const callback = jest.fn();

    // 订阅多个事件
    const subscription = service.subscribeMultiple([
      EventType.DEVICE_CONNECTED, 
      EventType.DEVICE_DISCONNECTED
    ]);
    subscription.subscribe(callback);

    // 发布第一个事件
    await service.publish(EventType.DEVICE_CONNECTED, testEventData1);
    // 发布第二个事件
    await service.publish(EventType.DEVICE_DISCONNECTED, testEventData2);

    // 验证Redis发布被调用两次
    expect(mockRedis.publish).toHaveBeenCalledTimes(2);
  });

  it('should get event statistics', async () => {
    // 订阅事件
    service.subscribe(EventType.DEVICE_CONNECTED);
    service.subscribe(EventType.DEVICE_DISCONNECTED);

    // 发布几个事件
    await service.publish(EventType.DEVICE_CONNECTED, { test: 'data1' });
    await service.publish(EventType.DEVICE_CONNECTED, { test: 'data2' });
    await service.publish(EventType.DEVICE_DISCONNECTED, { test: 'data3' });

    // 获取统计信息
    const stats = service.getEventStats();

    // 验证统计信息正确
    expect(stats.totalSubscriptions).toBe(2);
    expect(stats.eventTypes).toContain(EventType.DEVICE_CONNECTED);
    expect(stats.eventTypes).toContain(EventType.DEVICE_DISCONNECTED);
  });

  it('should clear all subscriptions', () => {
    // 订阅事件
    service.subscribe(EventType.DEVICE_CONNECTED);
    service.subscribe(EventType.DEVICE_DISCONNECTED);

    // 清理所有订阅
    service.clearAllSubscriptions();

    // 获取统计信息
    const stats = service.getEventStats();

    // 验证所有订阅已清理
    expect(stats.totalSubscriptions).toBe(0);
  });

  it('should unsubscribe from multiple events', () => {
    // 订阅事件
    service.subscribe(EventType.DEVICE_CONNECTED);
    service.subscribe(EventType.DEVICE_DISCONNECTED);

    // 取消订阅多个事件
    service.unsubscribeMultiple([
      EventType.DEVICE_CONNECTED, 
      EventType.DEVICE_DISCONNECTED
    ]);

    // 获取统计信息
    const stats = service.getEventStats();

    // 验证所有订阅已取消
    expect(stats.totalSubscriptions).toBe(0);
  });
});
