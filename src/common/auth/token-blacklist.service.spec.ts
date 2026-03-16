import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { TokenBlacklistService } from './token-blacklist.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    getClient: jest.Mock;
  };
  let redisClient: {
    ttl: jest.Mock;
    sadd: jest.Mock;
    srem: jest.Mock;
    expire: jest.Mock;
    smembers: jest.Mock;
    scan: jest.Mock;
    pipeline: jest.Mock;
  };
  let jwtService: {
    decode: jest.Mock;
  };

  beforeEach(() => {
    redisClient = {
      ttl: jest.fn().mockResolvedValue(120),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      scan: jest.fn().mockResolvedValue(['0', []]),
      pipeline: jest.fn(),
    };

    redisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      getClient: jest.fn().mockReturnValue(redisClient),
    };

    jwtService = {
      decode: jest.fn(),
    };

    service = new TokenBlacklistService(
      redisService as unknown as RedisService,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should cleanup token references and blacklist token', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    jwtService.decode.mockReturnValue({
      userId: 'user-1',
      deviceId: 'ios-001',
      exp: nowSeconds + 3600,
    });
    redisService.get
      .mockResolvedValueOnce('["token-1"]')
      .mockResolvedValueOnce('["token-1"]');

    await service.addToBlacklist('token-1', 'logout');

    expect(redisService.del).toHaveBeenCalledWith('token:user:user-1');
    expect(redisService.del).toHaveBeenCalledWith('token:user-device:user-1:ios-001');
    expect(redisClient.srem).toHaveBeenCalledWith('openchat:token:user-devices:user-1', 'ios-001');
    expect(redisService.set).toHaveBeenCalledWith(
      expect.stringMatching(/^token:blacklist:/),
      expect.stringContaining('"reason":"logout"'),
      expect.any(Number),
    );
  });

  it('should prefer indexed devices over scan when collecting device stats', async () => {
    redisClient.smembers.mockResolvedValue(['ios-001', 'web-001']);
    const pipeline = {
      get: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, '["token-a","token-b"]'],
        [null, '["token-c"]'],
      ]),
    };
    redisClient.pipeline.mockReturnValue(pipeline);

    const result = await service.getUserDeviceTokenStats('user-1', 10);

    expect(result).toEqual([
      { deviceId: 'ios-001', tokenCount: 2 },
      { deviceId: 'web-001', tokenCount: 1 },
    ]);
    expect(redisClient.scan).not.toHaveBeenCalled();
    expect(pipeline.get).toHaveBeenCalledTimes(2);
  });

  it('should fallback to scan, rebuild index and cleanup stale device entries', async () => {
    redisClient.smembers.mockResolvedValue([]);
    redisClient.scan.mockResolvedValueOnce([
      '0',
      [
        'openchat:token:user-device:user-1:ios-001',
        'openchat:token:user-device:user-1:web-001',
      ],
    ]);
    const pipeline = {
      get: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, '["token-a"]'],
        [null, null],
      ]),
    };
    redisClient.pipeline.mockReturnValue(pipeline);

    const result = await service.getUserDeviceTokenStats(
      'user-1',
      'invalid-limit' as unknown as number,
    );

    expect(result).toEqual([{ deviceId: 'ios-001', tokenCount: 1 }]);
    expect(redisClient.scan).toHaveBeenCalled();
    expect(redisClient.sadd).toHaveBeenCalledWith('openchat:token:user-devices:user-1', 'ios-001');
    expect(redisClient.sadd).toHaveBeenCalledWith('openchat:token:user-devices:user-1', 'web-001');
    expect(redisClient.srem).toHaveBeenCalledWith('openchat:token:user-devices:user-1', 'web-001');
  });

  it('should delete all device buckets and index when blacklisting all user tokens', async () => {
    redisService.get.mockResolvedValueOnce(null);
    redisClient.smembers.mockResolvedValue(['ios-001', 'web-001']);

    await service.blacklistAllUserTokens('user-1', 'security_reset');

    expect(redisService.del).toHaveBeenCalledWith('token:user:user-1');
    expect(redisService.del).toHaveBeenCalledWith('token:user-device:user-1:ios-001');
    expect(redisService.del).toHaveBeenCalledWith('token:user-device:user-1:web-001');
    expect(redisService.del).toHaveBeenCalledWith('token:user-devices:user-1');
  });
});
