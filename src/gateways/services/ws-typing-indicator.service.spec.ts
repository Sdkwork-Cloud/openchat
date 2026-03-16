import { Server, Socket } from 'socket.io';
import { WsTypingIndicatorService } from './ws-typing-indicator.service';

describe('WsTypingIndicatorService', () => {
  let groupAuthorizationService: { isUserGroupMember: jest.Mock };
  let messageEventEmitter: {
    emitToUser: jest.Mock;
    emitToRoomExceptClient: jest.Mock;
  };
  let service: WsTypingIndicatorService;

  beforeEach(() => {
    groupAuthorizationService = {
      isUserGroupMember: jest.fn(),
    };
    messageEventEmitter = {
      emitToUser: jest.fn(),
      emitToRoomExceptClient: jest.fn(),
    };
    service = new WsTypingIndicatorService(
      groupAuthorizationService as any,
      messageEventEmitter as any,
    );
  });

  it('should reject typing command when target is ambiguous', async () => {
    const result = await service.dispatchTyping({
      server: {} as Server,
      client: {} as Socket,
      authenticatedUserId: 'user-1',
      target: {
        toUserId: 'user-2',
        groupId: 'group-1',
      },
      isTyping: true,
    });

    expect(result).toEqual({
      success: false,
      error: 'Exactly one of toUserId or groupId is required',
    });
    expect(messageEventEmitter.emitToUser).not.toHaveBeenCalled();
    expect(messageEventEmitter.emitToRoomExceptClient).not.toHaveBeenCalled();
  });

  it('should emit direct typing indicators to the recipient user room', async () => {
    const server = {} as Server;

    const result = await service.dispatchTyping({
      server,
      client: {} as Socket,
      authenticatedUserId: 'user-1',
      target: {
        toUserId: ' user-2 ',
      },
      isTyping: true,
    });

    expect(result).toEqual({ success: true });
    expect(messageEventEmitter.emitToUser).toHaveBeenCalledWith(
      server,
      'user-2',
      'typingStatusChanged',
      expect.objectContaining({
        conversationType: 'single',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        isTyping: true,
      }),
    );
  });

  it('should reject group typing indicators when sender is not a member', async () => {
    groupAuthorizationService.isUserGroupMember.mockResolvedValue(false);

    const result = await service.dispatchTyping({
      server: {} as Server,
      client: {} as Socket,
      authenticatedUserId: 'user-1',
      target: {
        groupId: 'group-1',
      },
      isTyping: true,
    });

    expect(result).toEqual({ success: false, error: 'You are not a member of this group' });
    expect(groupAuthorizationService.isUserGroupMember).toHaveBeenCalledWith('user-1', 'group-1');
    expect(messageEventEmitter.emitToRoomExceptClient).not.toHaveBeenCalled();
  });

  it('should emit group typing indicators to the group room excluding sender socket', async () => {
    const client = {} as Socket;
    groupAuthorizationService.isUserGroupMember.mockResolvedValue(true);

    const result = await service.dispatchTyping({
      server: {} as Server,
      client,
      authenticatedUserId: 'user-1',
      target: {
        groupId: ' group-1 ',
      },
      isTyping: false,
    });

    expect(result).toEqual({ success: true });
    expect(messageEventEmitter.emitToRoomExceptClient).toHaveBeenCalledWith(
      client,
      'group:group-1',
      'typingStatusChanged',
      expect.objectContaining({
        conversationType: 'group',
        fromUserId: 'user-1',
        groupId: 'group-1',
        isTyping: false,
      }),
    );
  });
});
