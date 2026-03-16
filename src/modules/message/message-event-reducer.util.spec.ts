import {
  createMessageEventReducer,
  defaultResolveConversationId,
  resolveMessageEventKey,
} from './message-event-reducer.util';

describe('message-event-reducer.util', () => {
  it('should resolve message key by serverMessageId > messageId > clientMessageId', () => {
    expect(resolveMessageEventKey({
      serverMessageId: 'server-1',
      messageId: 'msg-1',
      clientMessageId: 'client-1',
    })).toBe('server-1');
    expect(resolveMessageEventKey({
      messageId: 'msg-2',
      clientMessageId: 'client-2',
    })).toBe('msg-2');
    expect(resolveMessageEventKey({
      clientMessageId: 'client-3',
    })).toBe('client-3');
  });

  it('should resolve default conversation id for group and single', () => {
    expect(defaultResolveConversationId({ groupId: 'group-1' })).toBe('group:group-1');
    expect(defaultResolveConversationId({ fromUserId: 'u2', toUserId: 'u1' })).toBe('single:u1:u2');
  });

  it('should deduplicate by eventId and keep monotonic stateVersion', () => {
    const reducer = createMessageEventReducer();

    const first = reducer.apply({
      eventId: 'evt-a',
      eventType: 'newMessage',
      occurredAt: 1000,
      stateVersion: 1,
      serverMessageId: 'server-1',
      status: 'sent',
      fromUserId: 'u1',
      toUserId: 'u2',
    });
    expect(first.applied).toBe(true);
    expect(first.snapshot?.stateVersion).toBe(1);

    const duplicate = reducer.apply({
      eventId: 'evt-a',
      eventType: 'newMessage',
      occurredAt: 1001,
      stateVersion: 1,
      serverMessageId: 'server-1',
      status: 'sent',
    });
    expect(duplicate).toEqual({
      applied: false,
      reason: 'duplicate_event',
    });

    const stale = reducer.apply({
      eventId: 'evt-b',
      eventType: 'messageAcknowledged',
      occurredAt: 1002,
      stateVersion: 0,
      serverMessageId: 'server-1',
      status: 'sending',
    });
    expect(stale.applied).toBe(false);
    expect(stale.reason).toBe('stale_state');
    expect(stale.snapshot?.stateVersion).toBe(1);

    const upgrade = reducer.apply({
      eventId: 'evt-c',
      eventType: 'messageAcknowledged',
      occurredAt: 1003,
      stateVersion: 3,
      serverMessageId: 'server-1',
      status: 'read',
    });
    expect(upgrade.applied).toBe(true);
    expect(upgrade.snapshot?.stateVersion).toBe(3);
    expect(upgrade.snapshot?.status).toBe('read');
  });

  it('should keep dedup window bounded by maxDedupSize', () => {
    const reducer = createMessageEventReducer({ maxDedupSize: 2 });

    reducer.apply({ eventId: 'evt-1', serverMessageId: 'm-1', stateVersion: 1 });
    reducer.apply({ eventId: 'evt-2', serverMessageId: 'm-2', stateVersion: 1 });
    reducer.apply({ eventId: 'evt-3', serverMessageId: 'm-3', stateVersion: 1 });

    expect(reducer.hasProcessedEvent('evt-1')).toBe(false);
    expect(reducer.hasProcessedEvent('evt-2')).toBe(true);
    expect(reducer.hasProcessedEvent('evt-3')).toBe(true);
    expect(reducer.size().dedup).toBe(2);
  });

  it('should not mark event as processed when message key is missing', () => {
    const reducer = createMessageEventReducer();

    const result = reducer.apply({
      eventId: 'evt-missing-key',
      stateVersion: 1,
      status: 'sent',
    });

    expect(result).toEqual({
      applied: false,
      reason: 'missing_message_key',
    });
    expect(reducer.hasProcessedEvent('evt-missing-key')).toBe(false);
  });

  it('should index new messages by conversation', () => {
    const reducer = createMessageEventReducer();

    reducer.apply({
      eventId: 'evt-1',
      serverMessageId: 'm-1',
      groupId: 'group-1',
      stateVersion: 1,
    });
    reducer.apply({
      eventId: 'evt-2',
      serverMessageId: 'm-2',
      fromUserId: 'u2',
      toUserId: 'u1',
      stateVersion: 1,
    });

    expect(reducer.getConversationMessageIds('group:group-1')).toEqual(['m-1']);
    expect(reducer.getConversationMessageIds('single:u1:u2')).toEqual(['m-2']);
  });

  it('should apply events in batch order', () => {
    const reducer = createMessageEventReducer();

    const results = reducer.applyMany([
      { eventId: 'evt-1', serverMessageId: 'm-1', stateVersion: 1 },
      { eventId: 'evt-2', serverMessageId: 'm-1', stateVersion: 3, status: 'read' },
      { eventId: 'evt-2', serverMessageId: 'm-1', stateVersion: 3, status: 'read' },
    ]);

    expect(results[0].applied).toBe(true);
    expect(results[1].applied).toBe(true);
    expect(results[2]).toEqual({
      applied: false,
      reason: 'duplicate_event',
    });
    expect(reducer.get('m-1')?.stateVersion).toBe(3);
    expect(reducer.get('m-1')?.status).toBe('read');
  });

  it('should export and import reducer snapshot', () => {
    const reducerA = createMessageEventReducer({ maxDedupSize: 5 });
    reducerA.apply({
      eventId: 'evt-a',
      serverMessageId: 'm-a',
      fromUserId: 'u1',
      toUserId: 'u2',
      stateVersion: 1,
      status: 'sent',
      occurredAt: 1010,
    });
    reducerA.apply({
      eventId: 'evt-b',
      serverMessageId: 'm-b',
      groupId: 'g-1',
      stateVersion: 2,
      status: 'delivered',
      occurredAt: 1020,
    });

    const snapshot = reducerA.exportSnapshot();

    const reducerB = createMessageEventReducer({ maxDedupSize: 5 });
    reducerB.importSnapshot(snapshot);

    expect(reducerB.hasProcessedEvent('evt-a')).toBe(true);
    expect(reducerB.hasProcessedEvent('evt-b')).toBe(true);
    expect(reducerB.get('m-a')).toEqual(reducerA.get('m-a'));
    expect(reducerB.get('m-b')).toEqual(reducerA.get('m-b'));
    expect(reducerB.getConversationMessageIds('single:u1:u2')).toEqual(['m-a']);
    expect(reducerB.getConversationMessageIds('group:g-1')).toEqual(['m-b']);
  });

  it('should reset reducer state', () => {
    const reducer = createMessageEventReducer();

    reducer.apply({
      eventId: 'evt-reset',
      serverMessageId: 'm-reset',
      stateVersion: 1,
      fromUserId: 'u1',
      toUserId: 'u2',
    });
    expect(reducer.size()).toEqual({
      dedup: 1,
      messages: 1,
      conversations: 1,
    });

    reducer.reset();

    expect(reducer.size()).toEqual({
      dedup: 0,
      messages: 0,
      conversations: 0,
    });
    expect(reducer.get('m-reset')).toBeUndefined();
    expect(reducer.hasProcessedEvent('evt-reset')).toBe(false);
  });
});
