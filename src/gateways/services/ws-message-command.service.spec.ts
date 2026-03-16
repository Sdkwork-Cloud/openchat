import { Server, Socket } from 'socket.io';
import { MessageStatus } from '../../modules/message/message.interface';
import { MessageReceiptService } from '../../modules/message/message-receipt.service';
import { MessageService } from '../../modules/message/message.service';
import { WsAckRetryService } from './ws-ack-retry.service';
import { WsGroupAuthorizationService } from './ws-group-authorization.service';
import { WsMessageCommandService } from './ws-message-command.service';
import { WsMessageEventEmitterService } from './ws-message-event-emitter.service';

describe('WsMessageCommandService', () => {
  let service: WsMessageCommandService;
  let messageService: { sendMessage: jest.Mock };
  let messageReceiptService: { upsertReceipt: jest.Mock };
  let ackRetryService: { storePendingAck: jest.Mock };
  let groupAuthorizationService: { isUserGroupMember: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    messageService = {
      sendMessage: jest.fn(),
    };
    messageReceiptService = {
      upsertReceipt: jest.fn(),
    };
    ackRetryService = {
      storePendingAck: jest.fn(),
    };
    groupAuthorizationService = {
      isUserGroupMember: jest.fn().mockResolvedValue(true),
    };
    eventEmitter = {
      emit: jest.fn(),
    };

    service = new WsMessageCommandService(
      messageService as unknown as MessageService,
      messageReceiptService as unknown as MessageReceiptService,
      ackRetryService as unknown as WsAckRetryService,
      groupAuthorizationService as unknown as WsGroupAuthorizationService,
      new WsMessageEventEmitterService(),
      eventEmitter,
    );
  });

  it('should send single message and store pending ack', async () => {
    messageService.sendMessage.mockResolvedValue({
      success: true,
      message: { id: 'server-msg-1', status: MessageStatus.SENT },
    });

    const recipientEmit = jest.fn();
    const server = {
      to: jest.fn(() => ({ emit: recipientEmit })),
    } as unknown as Server;
    const client = { emit: jest.fn() } as unknown as Socket;

    const result = await service.sendSingleMessage({
      server,
      client,
      fromUserId: 'user-1',
      toUserId: 'user-2',
      clientMessageId: 'client-msg-1',
      content: 'hello',
      type: 'text',
      requireAck: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        messageId: 'client-msg-1',
        serverMessageId: 'server-msg-1',
      }),
    );
    expect(messageReceiptService.upsertReceipt).toHaveBeenCalledWith(
      'server-msg-1',
      'user-2',
      MessageStatus.SENT,
      'gateway_send',
    );
    expect(ackRetryService.storePendingAck).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'server-msg-1',
        clientMessageId: 'client-msg-1',
      }),
    );
    expect(recipientEmit).toHaveBeenCalledWith(
      'newMessage',
      expect.objectContaining({
        eventType: 'newMessage',
        serverMessageId: 'server-msg-1',
      }),
    );
    expect((client.emit as jest.Mock).mock.calls.some((call) => call[0] === 'messageSent')).toBe(true);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'ws.message.command.result',
      expect.objectContaining({
        conversationType: 'single',
        success: true,
        ackRequired: true,
        ackQueued: true,
      }),
    );
  });

  it('should send group message and emit group event', async () => {
    groupAuthorizationService.isUserGroupMember.mockResolvedValue(true);
    messageService.sendMessage.mockResolvedValue({
      success: true,
      message: { id: 'server-group-msg-1', status: MessageStatus.SENT },
    });

    const groupEmit = jest.fn();
    const server = {
      to: jest.fn(() => ({ emit: groupEmit })),
    } as unknown as Server;
    const client = { emit: jest.fn() } as unknown as Socket;

    const result = await service.sendGroupMessage({
      server,
      client,
      fromUserId: 'user-1',
      groupId: 'group-1',
      clientMessageId: 'client-group-msg-1',
      content: 'hello-group',
      type: 'text',
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        messageId: 'client-group-msg-1',
        serverMessageId: 'server-group-msg-1',
      }),
    );
    expect(groupAuthorizationService.isUserGroupMember).toHaveBeenCalledWith('user-1', 'group-1');
    expect(groupEmit).toHaveBeenCalledWith(
      'newGroupMessage',
      expect.objectContaining({
        eventType: 'newGroupMessage',
        serverMessageId: 'server-group-msg-1',
      }),
    );
    expect((client.emit as jest.Mock).mock.calls.some((call) => call[0] === 'messageSent')).toBe(true);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'ws.message.command.result',
      expect.objectContaining({
        conversationType: 'group',
        success: true,
        ackRequired: false,
      }),
    );
  });

  it('should reject group message when sender is not a member', async () => {
    groupAuthorizationService.isUserGroupMember.mockResolvedValue(false);
    const server = {
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as Server;
    const client = { emit: jest.fn() } as unknown as Socket;

    const result = await service.sendGroupMessage({
      server,
      client,
      fromUserId: 'user-1',
      groupId: 'group-1',
      clientMessageId: 'client-group-msg-2',
      content: 'hello-group',
      type: 'text',
    });

    expect(result).toEqual({
      success: false,
      error: 'You are not a member of this group',
    });
    expect(messageService.sendMessage).not.toHaveBeenCalled();
    expect((client.emit as jest.Mock)).not.toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'ws.message.command.result',
      expect.objectContaining({
        conversationType: 'group',
        success: false,
        error: 'not a group member',
      }),
    );
  });

  it('should emit failure event when single send throws', async () => {
    messageService.sendMessage.mockRejectedValue(new Error('db down'));
    const server = {
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as Server;
    const client = { emit: jest.fn() } as unknown as Socket;

    const result = await service.sendSingleMessage({
      server,
      client,
      fromUserId: 'user-1',
      toUserId: 'user-2',
      clientMessageId: 'client-msg-2',
      content: 'hello',
      type: 'text',
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        messageId: 'client-msg-2',
      }),
    );
    expect((client.emit as jest.Mock)).toHaveBeenCalledWith(
      'messageFailed',
      expect.objectContaining({
        eventType: 'messageFailed',
        messageId: 'client-msg-2',
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'ws.message.command.result',
      expect.objectContaining({
        conversationType: 'single',
        success: false,
        stage: 'exception',
      }),
    );
  });

  it('should reject single message command when type is invalid', async () => {
    const server = {
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as Server;
    const client = { emit: jest.fn() } as unknown as Socket;

    const result = await service.sendSingleMessage({
      server,
      client,
      fromUserId: 'user-1',
      toUserId: 'user-2',
      clientMessageId: 'client-msg-3',
      content: 'hello',
      type: 'text with space',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid message type',
    });
    expect(messageService.sendMessage).not.toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'ws.message.command.result',
      expect.objectContaining({
        conversationType: 'single',
        success: false,
        stage: 'persist',
        error: 'Invalid message type',
      }),
    );
  });

  it('should reject group message command when clientSeq is invalid', async () => {
    const server = {
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as Server;
    const client = { emit: jest.fn() } as unknown as Socket;

    const result = await service.sendGroupMessage({
      server,
      client,
      fromUserId: 'user-1',
      groupId: 'group-1',
      clientMessageId: 'client-group-msg-3',
      content: 'hello-group',
      type: 'text',
      clientSeq: -3,
    });

    expect(result).toEqual({
      success: false,
      error: 'clientSeq must be a non-negative integer',
    });
    expect(groupAuthorizationService.isUserGroupMember).not.toHaveBeenCalled();
    expect(messageService.sendMessage).not.toHaveBeenCalled();
  });
});
