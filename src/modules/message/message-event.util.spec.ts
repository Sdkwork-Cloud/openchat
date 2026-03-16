import { deriveDeterministicMessageEventId } from './message-event.util';

describe('message-event.util', () => {
  it('should generate stable event id for same identity and state version', () => {
    const first = deriveDeterministicMessageEventId(
      'messageSent',
      {
        serverMessageId: 'server-msg-1',
        messageId: 'client-msg-1',
        status: 'sent',
      },
      1,
    );
    const second = deriveDeterministicMessageEventId(
      'messageSent',
      {
        serverMessageId: 'server-msg-1',
        messageId: 'client-msg-1',
        status: 'sent',
      },
      1,
    );

    expect(first).toBe(second);
    expect(first).toMatch(/^evt_[a-f0-9]{32}$/);
  });

  it('should generate different event id when status or attempt changes', () => {
    const delivered = deriveDeterministicMessageEventId(
      'messageAcknowledged',
      {
        serverMessageId: 'server-msg-2',
        status: 'delivered',
      },
      2,
    );
    const read = deriveDeterministicMessageEventId(
      'messageAcknowledged',
      {
        serverMessageId: 'server-msg-2',
        status: 'read',
      },
      3,
    );
    const retryAttempt1 = deriveDeterministicMessageEventId(
      'messageRetrying',
      {
        messageId: 'server-msg-2',
        attempt: 1,
      },
      0,
    );
    const retryAttempt2 = deriveDeterministicMessageEventId(
      'messageRetrying',
      {
        messageId: 'server-msg-2',
        attempt: 2,
      },
      0,
    );

    expect(delivered).not.toBe(read);
    expect(retryAttempt1).not.toBe(retryAttempt2);
  });

  it('should keep same event id when serverMessageId is same across transport payload variants', () => {
    const fromHttpResponse = deriveDeterministicMessageEventId(
      'messageSent',
      {
        serverMessageId: 'server-msg-3',
        messageId: 'server-msg-3',
        status: 'sent',
      },
      1,
    );
    const fromWsAck = deriveDeterministicMessageEventId(
      'messageSent',
      {
        serverMessageId: 'server-msg-3',
        messageId: 'client-msg-3',
        clientMessageId: 'client-msg-3',
        status: 'sent',
      },
      1,
    );

    expect(fromHttpResponse).toBe(fromWsAck);
  });
});
