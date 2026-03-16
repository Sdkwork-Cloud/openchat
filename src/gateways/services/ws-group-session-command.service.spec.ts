import { Socket } from 'socket.io';
import { RedisService } from '../../common/redis/redis.service';
import { WsGroupAuthorizationService } from './ws-group-authorization.service';
import { WsGroupSessionCommandService } from './ws-group-session-command.service';

describe('WsGroupSessionCommandService', () => {
  let service: WsGroupSessionCommandService;
  let redisService: { joinRoom: jest.Mock; leaveRoom: jest.Mock };
  let groupAuthorizationService: { isUserGroupMember: jest.Mock };

  beforeEach(() => {
    redisService = {
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
    };
    groupAuthorizationService = {
      isUserGroupMember: jest.fn(),
    };
    service = new WsGroupSessionCommandService(
      redisService as unknown as RedisService,
      groupAuthorizationService as unknown as WsGroupAuthorizationService,
    );
  });

  it('should reject joining group without membership', async () => {
    const client = { join: jest.fn() } as unknown as Socket;
    groupAuthorizationService.isUserGroupMember.mockResolvedValue(false);

    const result = await service.joinGroup({
      client,
      userId: 'u1',
      groupId: 'g1',
    });

    expect(result).toEqual({ success: false, error: 'You are not a member of this group' });
    expect(client.join).not.toHaveBeenCalled();
  });

  it('should join group and sync redis room', async () => {
    const client = { join: jest.fn() } as unknown as Socket;
    groupAuthorizationService.isUserGroupMember.mockResolvedValue(true);

    const result = await service.joinGroup({
      client,
      userId: 'u1',
      groupId: 'g1',
    });

    expect(result).toEqual({ success: true });
    expect(client.join).toHaveBeenCalledWith('group:g1');
    expect(redisService.joinRoom).toHaveBeenCalledWith('g1', 'u1');
  });

  it('should leave group and sync redis room', async () => {
    const client = { leave: jest.fn() } as unknown as Socket;

    const result = await service.leaveGroup({
      client,
      userId: 'u1',
      groupId: 'g1',
    });

    expect(result).toEqual({ success: true });
    expect(client.leave).toHaveBeenCalledWith('group:g1');
    expect(redisService.leaveRoom).toHaveBeenCalledWith('g1', 'u1');
  });
});
