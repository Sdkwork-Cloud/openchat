import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { RedisModule, REDIS_CLIENT, REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from './redis.module';

jest.mock('ioredis', () => ({
  __esModule: true,
  ...(() => {
    const { EventEmitter } = require('events');
    const instances: MockRedisLike[] = [];

    class MockRedis extends EventEmitter {
      status = 'wait';
      readonly quit = jest.fn(async () => {
        this.status = 'end';
        this.emit('end');
      });
      readonly disconnect = jest.fn(() => {
        this.status = 'end';
        this.emit('end');
      });
      readonly connect = jest.fn(async () => {
        this.status = 'ready';
        process.nextTick(() => {
          this.emit('ready');
        });
      });

      constructor() {
        super();
        instances.push(this);
      }

      duplicate(): MockRedisLike {
        return new MockRedis();
      }
    }

    return {
      Redis: MockRedis,
      default: MockRedis,
      __mockRedisInstances: instances,
    };
  })(),
}));

type MockRedisLike = {
  status: string;
  quit: jest.Mock<Promise<void>>;
  disconnect: jest.Mock<void>;
};

const { __mockRedisInstances: mockRedisInstances } = jest.requireMock('ioredis') as {
  __mockRedisInstances: MockRedisLike[];
};

describe('RedisModule lifecycle', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    mockRedisInstances.length = 0;

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              REDIS_HOST: '127.0.0.1',
              REDIS_PORT: 6379,
              REDIS_PASSWORD: '',
              REDIS_DB: 0,
            }),
          ],
        }),
        RedisModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should close primary, publish, and subscribe clients on application shutdown', async () => {
    const primary = app.get<MockRedisLike>(REDIS_CLIENT);
    const pub = app.get<MockRedisLike>(REDIS_PUB_CLIENT);
    const sub = app.get<MockRedisLike>(REDIS_SUB_CLIENT);

    expect(primary.status).toBe('ready');
    expect(pub.status).toBe('ready');
    expect(sub.status).toBe('ready');

    await app.close();

    expect(primary.quit).toHaveBeenCalledTimes(1);
    expect(pub.quit).toHaveBeenCalledTimes(1);
    expect(sub.quit).toHaveBeenCalledTimes(1);
    expect(primary.status).toBe('end');
    expect(pub.status).toBe('end');
    expect(sub.status).toBe('end');

    app = null as unknown as INestApplication;
  });

  it('should fall back to disconnect when graceful quit fails during shutdown', async () => {
    const primary = app.get<MockRedisLike>(REDIS_CLIENT);
    const pub = app.get<MockRedisLike>(REDIS_PUB_CLIENT);
    const sub = app.get<MockRedisLike>(REDIS_SUB_CLIENT);

    primary.quit.mockRejectedValueOnce(new Error('primary quit failed'));
    pub.quit.mockRejectedValueOnce(new Error('pub quit failed'));
    sub.quit.mockRejectedValueOnce(new Error('sub quit failed'));

    await app.close();

    expect(primary.quit).toHaveBeenCalledTimes(1);
    expect(pub.quit).toHaveBeenCalledTimes(1);
    expect(sub.quit).toHaveBeenCalledTimes(1);
    expect(primary.disconnect).toHaveBeenCalledTimes(1);
    expect(pub.disconnect).toHaveBeenCalledTimes(1);
    expect(sub.disconnect).toHaveBeenCalledTimes(1);

    app = null as unknown as INestApplication;
  });
});
