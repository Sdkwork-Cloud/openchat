import { RedisService } from '../../common/redis/redis.service';
import { MessageService } from '../../modules/message/message.service';
import { WsGroupAuthorizationService } from './ws-group-authorization.service';

describe('WsGroupAuthorizationService', () => {
  let service: WsGroupAuthorizationService;
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let messageService: {
    isUserInGroup: jest.Mock;
  };

  beforeEach(() => {
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    messageService = {
      isUserInGroup: jest.fn(),
    };

    service = new WsGroupAuthorizationService(
      redisService as unknown as RedisService,
      messageService as unknown as MessageService,
    );
  });

  it('should cache positive membership result', async () => {
    redisService.get.mockResolvedValue(null);
    messageService.isUserInGroup.mockResolvedValue(true);

    const result = await service.isUserGroupMember('user-1', 'group-1');

    expect(result).toBe(true);
    expect(redisService.set).toHaveBeenCalledWith('group:member:group-1:user-1', 'true', 300);
    expect(redisService.del).not.toHaveBeenCalled();
  });

  it('should clear stale cache when user is no longer member', async () => {
    redisService.get.mockResolvedValue('true');
    messageService.isUserInGroup.mockResolvedValue(false);

    const result = await service.isUserGroupMember('user-1', 'group-1');

    expect(result).toBe(false);
    expect(redisService.del).toHaveBeenCalledWith('group:member:group-1:user-1');
  });

  it('should return false when membership check throws', async () => {
    redisService.get.mockResolvedValue(null);
    messageService.isUserInGroup.mockRejectedValue(new Error('db down'));

    const result = await service.isUserGroupMember('user-1', 'group-1');

    expect(result).toBe(false);
  });
});
