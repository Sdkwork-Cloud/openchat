import { Server } from 'socket.io';
import { MessageStatus } from '../../modules/message/message.interface';
import { MessageReceiptService } from '../../modules/message/message-receipt.service';
import { MessageService } from '../../modules/message/message.service';
import { WsAckRetryService } from './ws-ack-retry.service';
import { WsMessageAckCommandService } from './ws-message-ack-command.service';
import { WsMessageEventEmitterService } from './ws-message-event-emitter.service';

describe('WsMessageAckCommandService', () => {
  let service: WsMessageAckCommandService;
  let messageService: { updateMessageStatus: jest.Mock };
  let messageReceiptService: { upsertReceipt: jest.Mock };
  let wsAckRetryService: { findPendingAck: jest.Mock; removePendingAck: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    messageService = {
      updateMessageStatus: jest.fn(),
    };
    messageReceiptService = {
      upsertReceipt: jest.fn(),
    };
    wsAckRetryService = {
      findPendingAck: jest.fn(),
      removePendingAck: jest.fn(),
    };
    eventEmitter = {
      emit: jest.fn(),
    };

    service = new WsMessageAckCommandService(
      messageService as unknown as MessageService,
      messageReceiptService as unknown as MessageReceiptService,
      wsAckRetryService as unknown as WsAckRetryService,
      new WsMessageEventEmitterService(),
      eventEmitter,
    );
  });

  it('should reject unknown message ack', async () => {
    wsAckRetryService.findPendingAck.mockResolvedValue(null);
    const server = {
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as Server;

    const result = await service.execute({
      server,
      authenticatedUserId: 'user-2',
      messageId: 'missing',
      status: 'delivered',
    });

    expect(result).toEqual({ success: false, error: 'Unknown messageId' });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'ws.message.ack.result',
      expect.objectContaining({
        ackStatus: 'delivered',
        success: false,
        error: 'Unknown messageId',
      }),
    );
  });

  it('should reject ack from invalid recipient', async () => {
    wsAckRetryService.findPendingAck.mockResolvedValue({
      key: 'server-msg-1',
      value: {
        messageId: 'server-msg-1',
        clientMessageId: 'client-msg-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        payload: {},
        timestamp: Date.now(),
        retryCount: 0,
      },
    });
    const server = {
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as Server;

    const result = await service.execute({
      server,
      authenticatedUserId: 'user-3',
      messageId: 'server-msg-1',
      status: 'delivered',
    });

    expect(result).toEqual({ success: false, error: 'Invalid ack sender' });
    expect(wsAckRetryService.removePendingAck).not.toHaveBeenCalled();
  });

  it('should process read ack and notify sender', async () => {
    wsAckRetryService.findPendingAck.mockResolvedValue({
      key: 'server-msg-2',
      value: {
        messageId: 'server-msg-2',
        clientMessageId: 'client-msg-2',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        payload: {},
        timestamp: Date.now(),
        retryCount: 0,
      },
    });

    const senderEmit = jest.fn();
    const server = {
      to: jest.fn(() => ({ emit: senderEmit })),
    } as unknown as Server;

    const result = await service.execute({
      server,
      authenticatedUserId: 'user-2',
      messageId: 'server-msg-2',
      status: 'read',
    });

    expect(result).toEqual({ success: true });
    expect(wsAckRetryService.removePendingAck).toHaveBeenCalledWith('server-msg-2', 'client-msg-2');
    expect(messageService.updateMessageStatus).toHaveBeenCalledWith('server-msg-2', MessageStatus.READ);
    expect(messageReceiptService.upsertReceipt).toHaveBeenCalledWith(
      'server-msg-2',
      'user-2',
      MessageStatus.READ,
      'gateway_ack',
    );
    expect(senderEmit).toHaveBeenCalledWith(
      'messageAcknowledged',
      expect.objectContaining({
        eventType: 'messageAcknowledged',
        messageId: 'client-msg-2',
        serverMessageId: 'server-msg-2',
        status: 'read',
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'ws.message.ack.result',
      expect.objectContaining({
        ackStatus: 'read',
        success: true,
      }),
    );
  });

  it('should reject invalid ack status before lookup', async () => {
    const server = {
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as Server;

    const result = await service.execute({
      server,
      authenticatedUserId: 'user-2',
      messageId: 'server-msg-2',
      status: 'received' as any,
    });

    expect(result).toEqual({ success: false, error: 'Invalid ack status' });
    expect(wsAckRetryService.findPendingAck).not.toHaveBeenCalled();
  });

  it('should reject invalid messageId format before lookup', async () => {
    const server = {
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as Server;

    const result = await service.execute({
      server,
      authenticatedUserId: 'user-2',
      messageId: 'bad message id',
      status: 'read',
    });

    expect(result).toEqual({ success: false, error: 'messageId is required' });
    expect(wsAckRetryService.findPendingAck).not.toHaveBeenCalled();
  });
});
