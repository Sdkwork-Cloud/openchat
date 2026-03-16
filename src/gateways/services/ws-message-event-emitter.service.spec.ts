import { Server, Socket } from 'socket.io';
import { MessageStatus } from '../../modules/message/message.interface';
import { WsMessageEventEmitterService } from './ws-message-event-emitter.service';

describe('WsMessageEventEmitterService', () => {
  let service: WsMessageEventEmitterService;

  beforeEach(() => {
    service = new WsMessageEventEmitterService();
  });

  it('should build message event envelope with deterministic eventId for same logical event', () => {
    const first = service.buildMessageEventPayload(
      'messageSent',
      {
        messageId: 'client-1',
        serverMessageId: 'server-1',
        status: 'sent',
        timestamp: 1700000000000,
      },
      MessageStatus.SENT,
    );
    const second = service.buildMessageEventPayload(
      'messageSent',
      {
        messageId: 'client-1',
        serverMessageId: 'server-1',
        status: 'sent',
        timestamp: 1700000000999,
      },
      MessageStatus.SENT,
    );

    expect(first.eventId).toBe(second.eventId);
    expect(first.eventType).toBe('messageSent');
  });

  it('should emit payload with timestamp to user room', () => {
    const emit = jest.fn();
    const server = {
      to: jest.fn(() => ({ emit })),
    } as unknown as Server;

    service.emitToUser(server, 'u1', 'system', { content: 'hello' });

    expect(emit).toHaveBeenCalledWith(
      'system',
      expect.objectContaining({
        content: 'hello',
        timestamp: expect.any(Number),
      }),
    );
  });

  it('should emit payload with timestamp to room excluding sender client', () => {
    const emit = jest.fn();
    const client = {
      to: jest.fn(() => ({ emit })),
    } as unknown as Socket;

    service.emitToRoomExceptClient(client, 'group:g1', 'typingStatusChanged', { groupId: 'g1' });

    expect(client.to).toHaveBeenCalledWith('group:g1');
    expect(emit).toHaveBeenCalledWith(
      'typingStatusChanged',
      expect.objectContaining({
        groupId: 'g1',
        timestamp: expect.any(Number),
      }),
    );
  });
});
