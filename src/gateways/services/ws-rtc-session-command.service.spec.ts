import { Socket } from 'socket.io';
import { WsRtcSessionCommandService } from './ws-rtc-session-command.service';

describe('WsRtcSessionCommandService', () => {
  let service: WsRtcSessionCommandService;

  beforeEach(() => {
    service = new WsRtcSessionCommandService();
  });

  it('should reject rtc signal when sender mismatch', async () => {
    const emit = jest.fn();
    const client = {
      nsp: {
        to: jest.fn(() => ({ emit })),
      },
    } as unknown as Socket;

    const result = await service.relaySignal({
      client,
      authenticatedUserId: 'user-1',
      payload: {
        fromUserId: 'spoof-user',
        toUserId: 'user-2',
        roomId: 'room-1',
        signal: { sdp: 'offer' },
        type: 'offer',
      },
    });

    expect(result).toEqual({ success: false, error: 'Invalid sender' });
    expect(emit).not.toHaveBeenCalled();
  });

  it('should relay rtc signal to target user room', async () => {
    const emit = jest.fn();
    const client = {
      nsp: {
        to: jest.fn(() => ({ emit })),
      },
    } as unknown as Socket;

    const result = await service.relaySignal({
      client,
      authenticatedUserId: 'user-1',
      payload: {
        toUserId: 'user-2',
        roomId: 'room-1',
        signal: { sdp: 'offer' },
        type: 'offer',
      },
    });

    expect(result).toEqual({ success: true });
    expect(emit).toHaveBeenCalledWith(
      'rtcSignal',
      expect.objectContaining({
        fromUserId: 'user-1',
        toUserId: 'user-2',
        roomId: 'room-1',
      }),
    );
  });

  it('should reject rtc signal with invalid payload', async () => {
    const emit = jest.fn();
    const client = {
      nsp: {
        to: jest.fn(() => ({ emit })),
      },
    } as unknown as Socket;

    const result = await service.relaySignal({
      client,
      authenticatedUserId: 'user-1',
      payload: {
        toUserId: 'bad user id',
        roomId: 'room-1',
        signal: null,
        type: 'offer',
      } as any,
    });

    expect(result).toEqual({ success: false, error: 'Invalid rtc signal payload' });
    expect(emit).not.toHaveBeenCalled();
  });

  it('should join rtc room and broadcast userJoined', async () => {
    const emit = jest.fn();
    const client = {
      join: jest.fn(),
      to: jest.fn(() => ({ emit })),
    } as unknown as Socket;

    const result = await service.joinRoom({
      client,
      authenticatedUserId: 'user-1',
      roomId: 'room-2',
    });

    expect(result).toEqual({ success: true });
    expect(client.join).toHaveBeenCalledWith('rtc:room-2');
    expect(emit).toHaveBeenCalledWith(
      'userJoined',
      expect.objectContaining({
        userId: 'user-1',
        roomId: 'room-2',
      }),
    );
  });

  it('should leave rtc room and broadcast userLeft', async () => {
    const emit = jest.fn();
    const client = {
      leave: jest.fn(),
      to: jest.fn(() => ({ emit })),
    } as unknown as Socket;

    const result = await service.leaveRoom({
      client,
      authenticatedUserId: 'user-1',
      roomId: 'room-2',
    });

    expect(result).toEqual({ success: true });
    expect(client.leave).toHaveBeenCalledWith('rtc:room-2');
    expect(emit).toHaveBeenCalledWith(
      'userLeft',
      expect.objectContaining({
        userId: 'user-1',
        roomId: 'room-2',
      }),
    );
  });

  it('should reject room operations when authenticated user id is invalid', async () => {
    const emit = jest.fn();
    const client = {
      join: jest.fn(),
      to: jest.fn(() => ({ emit })),
    } as unknown as Socket;

    const joinResult = await service.joinRoom({
      client,
      authenticatedUserId: 'bad user id',
      roomId: 'room-2',
    });

    expect(joinResult).toEqual({ success: false, error: 'Invalid authenticated user' });
    expect(client.join).not.toHaveBeenCalled();
  });
});
