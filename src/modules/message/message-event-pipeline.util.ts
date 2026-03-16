import {
  BuildMessageEventEnvelopeOptions,
  MessageEventEnvelope,
  MessageKnownEventType,
  buildMessageEventPayload,
} from './message-event-envelope.util';
import {
  MessageEventEnvelopeLike,
  MessageEventReducerApplyResult,
  MessageEventReducerOptions,
  MessageEventReducerSnapshot,
  ReducedMessageView,
  createMessageEventReducer,
} from './message-event-reducer.util';

export interface MessageEventPipelineOptions {
  reducer?: MessageEventReducerOptions;
}

export interface MessageEventPipelineIngestItem<T extends object = Record<string, unknown>> {
  eventType: MessageKnownEventType;
  payload: T;
  options?: BuildMessageEventEnvelopeOptions;
}

export interface MessageEventPipelineIngestResult<T extends object = Record<string, unknown>> {
  event: T & MessageEventEnvelope;
  reduced: MessageEventReducerApplyResult;
}

/**
 * Build a reusable message-event processing pipeline:
 * 1) normalize payload to event envelope
 * 2) deduplicate by eventId
 * 3) merge message state by monotonic stateVersion
 */
export function createMessageEventPipeline(options: MessageEventPipelineOptions = {}) {
  const reducer = createMessageEventReducer(options.reducer);

  return {
    ingest<T extends object>(
      eventType: MessageKnownEventType,
      payload: T,
      envelopeOptions: BuildMessageEventEnvelopeOptions = {},
    ): MessageEventPipelineIngestResult<T> {
      const event = buildMessageEventPayload(eventType, payload, envelopeOptions);
      const reduced = reducer.apply(event);
      return { event, reduced };
    },

    ingestMany(
      items: Array<MessageEventPipelineIngestItem>,
    ): Array<MessageEventPipelineIngestResult> {
      if (!Array.isArray(items) || items.length === 0) {
        return [];
      }

      return items.map((item) => {
        const event = buildMessageEventPayload(
          item.eventType,
          item.payload,
          item.options || {},
        );
        const reduced = reducer.apply(event);
        return { event, reduced };
      });
    },

    apply(event: MessageEventEnvelopeLike): MessageEventReducerApplyResult {
      return reducer.apply(event);
    },

    applyMany(events: MessageEventEnvelopeLike[]): MessageEventReducerApplyResult[] {
      return reducer.applyMany(events);
    },

    get(messageId: string): ReducedMessageView | undefined {
      return reducer.get(messageId);
    },

    getConversationMessageIds(conversationId: string): string[] {
      return reducer.getConversationMessageIds(conversationId);
    },

    hasProcessedEvent(eventId: string): boolean {
      return reducer.hasProcessedEvent(eventId);
    },

    exportSnapshot(): MessageEventReducerSnapshot {
      return reducer.exportSnapshot();
    },

    importSnapshot(snapshot?: Partial<MessageEventReducerSnapshot> | null): void {
      reducer.importSnapshot(snapshot);
    },

    reset(): void {
      reducer.reset();
    },

    size() {
      return reducer.size();
    },
  };
}
