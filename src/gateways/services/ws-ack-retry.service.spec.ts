import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import { MessageStatus } from '../../modules/message/message.interface';
import { RedisService } from '../../common/redis/redis.service';
import { WsAckRetryService } from './ws-ack-retry.service';
import { WsMessageEventEmitterService } from './ws-message-event-emitter.service';

describe('WsAckRetryService', () => {
  let service: WsAckRetryService;
  let redisService: {
    zrangeByScore: jest.Mock;
    setIfNotExists: jest.Mock;
    getJson: jest.Mock;
    zrem: jest.Mock;
    zadd: jest.Mock;
    del: jest.Mock;
    setJson: jest.Mock;
    set: jest.Mock;
    get: jest.Mock;
  };

  beforeEach(() => {
    redisService = {
      zrangeByScore: jest.fn(),
      setIfNotExists: jest.fn(),
      getJson: jest.fn(),
      zrem: jest.fn(),
      zadd: jest.fn(),
      del: jest.fn(),
      setJson: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
    };

    service = new WsAckRetryService(
      redisService as unknown as RedisService,
      {
        get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
      } as unknown as ConfigService,
      new WsMessageEventEmitterService(),
    );
  });

  it('should retry due message and reschedule ack', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    redisService.zrangeByScore.mockResolvedValue(['msg-1']);
    redisService.setIfNotExists.mockResolvedValue(true);
    redisService.getJson.mockResolvedValue({
      messageId: 'msg-1',
      clientMessageId: 'client-1',
      fromUserId: 'sender',
      toUserId: 'receiver',
      payload: {
        messageId: 'msg-1',
        fromUserId: 'sender',
        toUserId: 'receiver',
        content: 'hello',
        type: 'text',
        status: MessageStatus.SENT,
      },
      timestamp: 1699999900000,
      retryCount: 0,
    });

    const senderEmit = jest.fn();
    const receiverEmit = jest.fn();
    const server = {
      to: jest.fn((room: string) => ({
        emit: room === 'user:sender' ? senderEmit : receiverEmit,
      })),
    } as unknown as Server;

    await service.processDueAcks('server-1', server);

    expect(senderEmit).toHaveBeenCalledWith(
      'messageRetrying',
      expect.objectContaining({
        eventType: 'messageRetrying',
        messageId: 'msg-1',
        attempt: 1,
      }),
    );
    expect(receiverEmit).toHaveBeenCalledWith(
      'newMessage',
      expect.objectContaining({
        eventType: 'newMessage',
        messageId: 'msg-1',
        isRetry: true,
      }),
    );
    expect(redisService.setJson).toHaveBeenCalledWith(
      'ws:ack:msg:msg-1',
      expect.objectContaining({ retryCount: 1, timestamp: 1700000000000 }),
      expect.any(Number),
    );
    expect(redisService.del).toHaveBeenCalledWith('ws:ack:lock:msg-1');
    nowSpy.mockRestore();
  });

  it('should emit messageFailed and cleanup when max retries reached', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    redisService.zrangeByScore.mockResolvedValue(['msg-2']);
    redisService.setIfNotExists.mockResolvedValue(true);
    redisService.getJson.mockResolvedValue({
      messageId: 'msg-2',
      clientMessageId: 'client-2',
      fromUserId: 'sender',
      toUserId: 'receiver',
      payload: {
        messageId: 'msg-2',
        type: 'text',
      },
      timestamp: 1699999900000,
      retryCount: 3,
    });

    const failedEmit = jest.fn();
    const server = {
      to: jest.fn(() => ({ emit: failedEmit })),
    } as unknown as Server;

    await service.processDueAcks('server-1', server);

    expect(failedEmit).toHaveBeenCalledWith(
      'messageFailed',
      expect.objectContaining({
        eventType: 'messageFailed',
        serverMessageId: 'msg-2',
      }),
    );
    expect(redisService.del).toHaveBeenCalledWith('ws:ack:msg:msg-2');
    expect(redisService.del).toHaveBeenCalledWith('ws:ack:client:client-2');
    expect(redisService.zrem).toHaveBeenCalledWith('ws:ack:schedule', 'msg-2');
    expect(redisService.del).toHaveBeenCalledWith('ws:ack:lock:msg-2');
    nowSpy.mockRestore();
  });
});
