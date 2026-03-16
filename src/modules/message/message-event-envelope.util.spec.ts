import { MessageStatus } from './message.interface';
import {
  buildMessageEventEnvelope,
  buildMessageEventPayload,
} from './message-event-envelope.util';

describe('message-event-envelope.util', () => {
  it('should include deterministic eventId and stateVersion in envelope', () => {
    const first = buildMessageEventEnvelope('messageSent', {
      status: MessageStatus.SENT,
      occurredAt: 1000,
      identity: {
        serverMessageId: 'server-1',
        messageId: 'server-1',
        status: 'sent',
      },
    });
    const second = buildMessageEventEnvelope('messageSent', {
      status: MessageStatus.SENT,
      occurredAt: 2000,
      identity: {
        serverMessageId: 'server-1',
        messageId: 'server-1',
        status: 'sent',
      },
    });

    expect(first.eventId).toBe(second.eventId);
    expect(first.eventType).toBe('messageSent');
    expect(first.stateVersion).toBe(1);
    expect(first.occurredAt).toBe(1000);
  });

  it('should derive occurredAt from payload timestamp by default', () => {
    const payload = buildMessageEventPayload(
      'messageAcknowledged',
      {
        messageId: 'server-2',
        status: 'read',
        timestamp: 12345,
      },
      { status: MessageStatus.READ },
    );

    expect(payload.occurredAt).toBe(12345);
    expect(payload.stateVersion).toBe(3);
    expect(payload.eventId).toMatch(/^evt_[a-f0-9]{32}$/);
  });

  it('should allow identity override for payloads without top-level message ids', () => {
    const first = buildMessageEventPayload(
      'messageFailed',
      {
        success: false,
        error: 'failed',
      },
      {
        status: MessageStatus.FAILED,
        identity: {
          stableKey: 'SEND_FAILED',
          status: 'failed',
        },
      },
    );
    const second = buildMessageEventPayload(
      'messageFailed',
      {
        success: false,
        error: 'failed',
      },
      {
        status: MessageStatus.FAILED,
        identity: {
          stableKey: 'SEND_FAILED',
          status: 'failed',
        },
      },
    );

    expect(first.eventId).toBe(second.eventId);
    expect(first.stateVersion).toBe(-1);
  });
});
