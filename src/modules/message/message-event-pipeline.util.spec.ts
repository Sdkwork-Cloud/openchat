import { MessageStatus } from './message.interface';
import { createMessageEventPipeline } from './message-event-pipeline.util';

describe('message-event-pipeline.util', () => {
  it('should ingest payload into envelope and reducer snapshot', () => {
    const pipeline = createMessageEventPipeline();

    const result = pipeline.ingest(
      'messageSent',
      {
        serverMessageId: 'm-1',
        messageId: 'm-1',
        status: 'sent',
        fromUserId: 'u1',
        toUserId: 'u2',
      },
      { status: MessageStatus.SENT, occurredAt: 1000 },
    );

    expect(result.event.eventType).toBe('messageSent');
    expect(result.event.stateVersion).toBe(1);
    expect(result.event.occurredAt).toBe(1000);
    expect(result.event.eventId).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(result.reduced.applied).toBe(true);
    expect(pipeline.get('m-1')?.stateVersion).toBe(1);
  });

  it('should deduplicate deterministic events through ingest', () => {
    const pipeline = createMessageEventPipeline();

    const first = pipeline.ingest(
      'messageSent',
      {
        serverMessageId: 'm-2',
        messageId: 'm-2',
        status: 'sent',
      },
      { status: MessageStatus.SENT },
    );
    const second = pipeline.ingest(
      'messageSent',
      {
        serverMessageId: 'm-2',
        messageId: 'm-2',
        status: 'sent',
      },
      { status: MessageStatus.SENT },
    );

    expect(first.event.eventId).toBe(second.event.eventId);
    expect(first.reduced.applied).toBe(true);
    expect(second.reduced).toEqual({
      applied: false,
      reason: 'duplicate_event',
    });
  });

  it('should process ingestMany in order and preserve latest state', () => {
    const pipeline = createMessageEventPipeline();

    const results = pipeline.ingestMany([
      {
        eventType: 'newMessage',
        payload: {
          serverMessageId: 'm-3',
          messageId: 'm-3',
          fromUserId: 'u1',
          toUserId: 'u2',
          status: 'sent',
        },
        options: { status: MessageStatus.SENT, occurredAt: 1000 },
      },
      {
        eventType: 'messageAcknowledged',
        payload: {
          serverMessageId: 'm-3',
          messageId: 'client-m-3',
          status: 'read',
        },
        options: { status: MessageStatus.READ, occurredAt: 1200 },
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].reduced.applied).toBe(true);
    expect(results[1].reduced.applied).toBe(true);
    expect(pipeline.get('m-3')?.stateVersion).toBe(3);
    expect(pipeline.get('m-3')?.status).toBe('read');
  });

  it('should keep snapshot compatibility between pipelines', () => {
    const source = createMessageEventPipeline();
    source.ingest(
      'newGroupMessage',
      {
        serverMessageId: 'm-4',
        messageId: 'm-4',
        groupId: 'g-1',
        status: 'sent',
      },
      { status: MessageStatus.SENT },
    );

    const snapshot = source.exportSnapshot();

    const target = createMessageEventPipeline();
    target.importSnapshot(snapshot);

    expect(target.get('m-4')).toEqual(source.get('m-4'));
    expect(target.getConversationMessageIds('group:g-1')).toEqual(['m-4']);
  });

  it('should reset pipeline state', () => {
    const pipeline = createMessageEventPipeline();
    pipeline.ingest(
      'messageSent',
      {
        serverMessageId: 'm-5',
        messageId: 'm-5',
        status: 'sent',
      },
      { status: MessageStatus.SENT },
    );

    expect(pipeline.size()).toEqual({
      dedup: 1,
      messages: 1,
      conversations: 1,
    });

    pipeline.reset();

    expect(pipeline.size()).toEqual({
      dedup: 0,
      messages: 0,
      conversations: 0,
    });
    expect(pipeline.get('m-5')).toBeUndefined();
  });
});
