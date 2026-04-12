import { Logger } from '@nestjs/common';
import { BaseEntity } from '../base.entity';
import { EventBusService } from '../events/event-bus.service';
import { CacheService } from '../services/cache.service';
import { OwnedEntityService } from './owned-entity.service';

type OwnedRecord = BaseEntity & {
  ownerId: string;
  name?: string;
};

type MockRepository<T> = {
  create: jest.Mock<T, [Partial<T>]>;
  save: jest.Mock<Promise<T>, [T]>;
  findOne: jest.Mock<Promise<T | null>, [unknown]>;
  update: jest.Mock<Promise<{ affected?: number }>, [unknown, unknown]>;
  remove: jest.Mock<Promise<T>, [T]>;
  count: jest.Mock<Promise<number>, [unknown]>;
};

class TestOwnedEntityService extends OwnedEntityService<OwnedRecord> {
  protected readonly logger: Logger;
  protected readonly entityName = 'OwnedRecord';
  protected readonly eventBus?: EventBusService;
  protected readonly cacheService?: CacheService;

  constructor(
    repository: MockRepository<OwnedRecord>,
    cacheService: CacheService,
    logger: Logger,
    eventBus?: EventBusService,
  ) {
    super(
      {
        transaction: jest.fn(),
      } as never,
      repository as never,
    );
    this.cacheService = cacheService;
    this.logger = logger;
    this.eventBus = eventBus;
  }
}

interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
}

function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolve!: DeferredPromise<T>['resolve'];
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

function createOwnedRecord(overrides: Partial<OwnedRecord> = {}): OwnedRecord {
  return {
    id: 'entity-1',
    uuid: 'uuid-1',
    isDeleted: false,
    createdAt: new Date('2026-04-06T00:00:00.000Z'),
    updatedAt: new Date('2026-04-06T00:00:00.000Z'),
    ownerId: 'owner-1',
    name: 'before',
    ...overrides,
  } as OwnedRecord;
}

async function waitForCondition(check: () => boolean): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    if (check()) {
      return;
    }
    await Promise.resolve();
  }

  throw new Error('condition was not met in time');
}

async function flushAsyncWork(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

describe('OwnedEntityService', () => {
  it('waits for cache invalidation before resolving update operations', async () => {
    const entity = createOwnedRecord();
    const logger = { warn: jest.fn() } as unknown as Logger;
    const invalidation = createDeferredPromise<void>();
    let deleteStarted = false;
    const cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockImplementation(async () => {
        deleteStarted = true;
        return invalidation.promise;
      }),
    } as unknown as CacheService;
    const repository: MockRepository<OwnedRecord> = {
      create: jest.fn(),
      save: jest.fn().mockImplementation(async (value: OwnedRecord) => value),
      findOne: jest.fn().mockResolvedValue(entity),
      update: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };
    const service = new TestOwnedEntityService(repository, cacheService, logger);

    const updatePromise = service.update(entity.id, entity.ownerId, { name: 'after' });
    let resolved = false;
    updatePromise.then(() => {
      resolved = true;
    });

    await waitForCondition(() => deleteStarted);
    await flushAsyncWork();

    expect(resolved).toBe(false);

    invalidation.resolve(undefined);

    await expect(updatePromise).resolves.toMatchObject({ name: 'after' });
    expect(cacheService.delete).toHaveBeenCalledWith('ownedrecord:entity-1');
  });
});
