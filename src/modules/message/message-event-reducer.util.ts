export interface MessageEventEnvelopeLike {
  eventId?: string;
  eventType?: string;
  occurredAt?: number;
  stateVersion?: number;
  serverMessageId?: string;
  messageId?: string;
  clientMessageId?: string;
  status?: string;
  content?: unknown;
  fromUserId?: string;
  toUserId?: string;
  groupId?: string;
}

export interface ReducedMessageView {
  messageId: string;
  conversationId: string;
  stateVersion: number;
  status?: string;
  content?: unknown;
  eventType?: string;
  updatedAt: number;
}

export interface MessageEventReducerApplyResult {
  applied: boolean;
  reason?: 'duplicate_event' | 'missing_message_key' | 'stale_state';
  snapshot?: ReducedMessageView;
}

export interface MessageEventReducerOptions {
  maxDedupSize?: number;
  defaultStateVersion?: number;
  now?: () => number;
  resolveConversationId?: (event: MessageEventEnvelopeLike) => string;
}

export interface MessageEventReducerSnapshot {
  dedupEventIds: string[];
  messages: Array<[string, ReducedMessageView]>;
  conversationIndex: Array<[string, string[]]>;
}

const DEFAULT_MAX_DEDUP_SIZE = 10000;
const DEFAULT_STATE_VERSION = -9999;

function normalizeId(candidate?: string): string | undefined {
  if (!candidate || typeof candidate !== 'string') {
    return undefined;
  }
  const normalized = candidate.trim();
  return normalized || undefined;
}

export function resolveMessageEventKey(event: MessageEventEnvelopeLike): string | undefined {
  return normalizeId(event.serverMessageId) || normalizeId(event.messageId) || normalizeId(event.clientMessageId);
}

export function defaultResolveConversationId(event: MessageEventEnvelopeLike): string {
  const groupId = normalizeId(event.groupId);
  if (groupId) {
    return `group:${groupId}`;
  }

  const fromUserId = normalizeId(event.fromUserId) || '';
  const toUserId = normalizeId(event.toUserId) || '';
  return `single:${[fromUserId, toUserId].sort().join(':')}`;
}

/**
 * Create an in-memory reducer that merges HTTP/WS message events with
 * event-id deduplication and monotonic state-version semantics.
 */
export function createMessageEventReducer(options: MessageEventReducerOptions = {}) {
  const maxDedupSize = Math.max(1, Math.floor(options.maxDedupSize ?? DEFAULT_MAX_DEDUP_SIZE));
  const defaultStateVersion = options.defaultStateVersion ?? DEFAULT_STATE_VERSION;
  const now = options.now ?? (() => Date.now());
  const resolveConversationId = options.resolveConversationId ?? defaultResolveConversationId;

  const processedEventIds = new Set<string>();
  const processedEventOrder: string[] = [];
  const messages = new Map<string, ReducedMessageView>();
  const conversationIndex = new Map<string, string[]>();

  const trimDedupWindow = () => {
    while (processedEventOrder.length > maxDedupSize) {
      const oldest = processedEventOrder.shift();
      if (!oldest) {
        break;
      }
      processedEventIds.delete(oldest);
    }
  };

  const markEventProcessed = (eventId: string) => {
    processedEventIds.add(eventId);
    processedEventOrder.push(eventId);
    trimDedupWindow();
  };

  const recalculateConversationIndex = () => {
    conversationIndex.clear();
    for (const [messageId, view] of messages.entries()) {
      const ids = conversationIndex.get(view.conversationId) || [];
      if (!ids.includes(messageId)) {
        conversationIndex.set(view.conversationId, [...ids, messageId]);
      }
    }
  };

  const resetState = () => {
    processedEventIds.clear();
    processedEventOrder.splice(0, processedEventOrder.length);
    messages.clear();
    conversationIndex.clear();
  };

  return {
    apply(event: MessageEventEnvelopeLike): MessageEventReducerApplyResult {
      const eventId = normalizeId(event.eventId);
      if (eventId && processedEventIds.has(eventId)) {
        return { applied: false, reason: 'duplicate_event' };
      }

      const messageKey = resolveMessageEventKey(event);
      if (!messageKey) {
        return { applied: false, reason: 'missing_message_key' };
      }
      if (eventId) {
        markEventProcessed(eventId);
      }

      const previous = messages.get(messageKey);
      const previousVersion = previous?.stateVersion ?? defaultStateVersion;
      const incomingVersion = Number.isFinite(event.stateVersion)
        ? (event.stateVersion as number)
        : defaultStateVersion;
      if (previous && incomingVersion < previousVersion) {
        return {
          applied: false,
          reason: 'stale_state',
          snapshot: previous,
        };
      }

      const conversationId = resolveConversationId(event);
      const next: ReducedMessageView = {
        messageId: messageKey,
        conversationId,
        stateVersion: Math.max(previousVersion, incomingVersion),
        status: event.status ?? previous?.status,
        content: event.content ?? previous?.content,
        eventType: event.eventType ?? previous?.eventType,
        updatedAt: Number.isFinite(event.occurredAt) ? (event.occurredAt as number) : now(),
      };
      messages.set(messageKey, next);

      if (!previous) {
        const list = conversationIndex.get(conversationId) || [];
        if (!list.includes(messageKey)) {
          conversationIndex.set(conversationId, [...list, messageKey]);
        }
      }

      return {
        applied: true,
        snapshot: next,
      };
    },

    applyMany(events: MessageEventEnvelopeLike[]): MessageEventReducerApplyResult[] {
      if (!Array.isArray(events) || events.length === 0) {
        return [];
      }
      return events.map((event) => this.apply(event));
    },

    get(messageId: string): ReducedMessageView | undefined {
      return messages.get(messageId);
    },

    getConversationMessageIds(conversationId: string): string[] {
      return conversationIndex.get(conversationId) || [];
    },

    hasProcessedEvent(eventId: string): boolean {
      return processedEventIds.has(eventId);
    },

    exportSnapshot(): MessageEventReducerSnapshot {
      return {
        dedupEventIds: [...processedEventOrder],
        messages: [...messages.entries()].map(([key, value]) => [key, { ...value }] as [string, ReducedMessageView]),
        conversationIndex: [...conversationIndex.entries()].map(([key, ids]) => [key, [...ids]] as [string, string[]]),
      };
    },

    importSnapshot(snapshot?: Partial<MessageEventReducerSnapshot> | null): void {
      resetState();

      if (!snapshot || typeof snapshot !== 'object') {
        return;
      }

      const dedupIds = Array.isArray(snapshot.dedupEventIds)
        ? snapshot.dedupEventIds
            .map((eventId) => normalizeId(eventId))
            .filter((eventId): eventId is string => Boolean(eventId))
        : [];
      dedupIds.forEach((eventId) => markEventProcessed(eventId));

      if (Array.isArray(snapshot.messages)) {
        for (const item of snapshot.messages) {
          if (!Array.isArray(item) || item.length !== 2) {
            continue;
          }
          const [messageIdRaw, viewRaw] = item;
          const messageId = normalizeId(messageIdRaw);
          if (!messageId || !viewRaw || typeof viewRaw !== 'object') {
            continue;
          }

          const viewCandidate = viewRaw as Partial<ReducedMessageView>;
          const conversationId = normalizeId(viewCandidate.conversationId);
          if (!conversationId) {
            continue;
          }
          const stateVersion = Number.isFinite(viewCandidate.stateVersion)
            ? (viewCandidate.stateVersion as number)
            : defaultStateVersion;
          const updatedAt = Number.isFinite(viewCandidate.updatedAt)
            ? (viewCandidate.updatedAt as number)
            : now();

          messages.set(messageId, {
            messageId,
            conversationId,
            stateVersion,
            status: normalizeId(viewCandidate.status),
            content: viewCandidate.content,
            eventType: normalizeId(viewCandidate.eventType),
            updatedAt,
          });
        }
      }

      // Prefer deterministic rebuild from messages to avoid stale index in snapshots
      recalculateConversationIndex();
    },

    reset(): void {
      resetState();
    },

    size() {
      return {
        dedup: processedEventIds.size,
        messages: messages.size,
        conversations: conversationIndex.size,
      };
    },
  };
}
