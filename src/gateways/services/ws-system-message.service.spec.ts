import { Server } from 'socket.io';
import { WsSystemMessageService } from './ws-system-message.service';

describe('WsSystemMessageService', () => {
  let service: WsSystemMessageService;

  beforeEach(() => {
    service = new WsSystemMessageService();
  });

  it('should validate system message payload shapes', () => {
    expect(service.isSystemMessage({ type: 'kickUser', userId: 'u1' })).toBe(true);
    expect(service.isSystemMessage({ type: 'kickDevice', userId: 'u1' })).toBe(false);
    expect(
      service.isSystemMessage({
        type: 'kickUserExceptDevice',
        userId: 'u1',
        keepDeviceId: 'd1',
      }),
    ).toBe(true);
  });

  it('should disconnect all sockets except keepDeviceId for kickUserExceptDevice', () => {
    const disconnectKeep = jest.fn();
    const disconnectOther = jest.fn();
    const server = {
      sockets: {
        sockets: new Map<string, { disconnect: jest.Mock }>([
          ['socket-keep', { disconnect: disconnectKeep }],
          ['socket-other', { disconnect: disconnectOther }],
        ]),
      },
    } as unknown as Server;
    const localClients = new Map<string, { userId: string; deviceId?: string }>([
      ['socket-keep', { userId: 'u1', deviceId: 'ios-1' }],
      ['socket-other', { userId: 'u1', deviceId: 'web-1' }],
    ]);

    service.handleSystemMessage(
      {
        type: 'kickUserExceptDevice',
        userId: 'u1',
        keepDeviceId: 'ios-1',
      },
      server,
      localClients,
    );

    expect(disconnectKeep).not.toHaveBeenCalled();
    expect(disconnectOther).toHaveBeenCalledWith(true);
  });

  it('should handle broadcast via raw system channel message', () => {
    const emit = jest.fn();
    const server = {
      emit,
      sockets: { sockets: new Map() },
    } as unknown as Server;
    const localClients = new Map<string, { userId: string; deviceId?: string }>();

    service.handleRawSystemMessage(
      'openchat:system',
      JSON.stringify({ type: 'broadcast', payload: { maintenance: true } }),
      server,
      localClients,
    );

    expect(emit).toHaveBeenCalledWith('systemBroadcast', { maintenance: true });
  });
});
