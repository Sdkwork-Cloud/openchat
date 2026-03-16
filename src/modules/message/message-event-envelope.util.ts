import { MessageEventIdentity, deriveDeterministicMessageEventId } from './message-event.util';
import { MessageEventStateKey, resolveMessageStateVersion } from './message-state.util';

export type MessageRealtimeEventType =
  | 'newMessage'
  | 'newGroupMessage'
  | 'messageSent'
  | 'messageAcknowledged'
  | 'messageFailed'
  | 'messageRetrying';

export type MessageDispatchEventType = 'messageSent' | 'messageFailed';

export type MessageKnownEventType = MessageRealtimeEventType | MessageDispatchEventType;

export interface MessageEventEnvelope {
  eventId: string;
  eventType: MessageKnownEventType;
  occurredAt: number;
  stateVersion?: number;
}

export interface BuildMessageEventEnvelopeOptions {
  status?: MessageEventStateKey;
  occurredAt?: number;
  identity?: MessageEventIdentity;
}

function resolveIdentityFromPayload(payload?: object): MessageEventIdentity {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  const record = payload as Record<string, unknown>;
  return {
    serverMessageId: record.serverMessageId,
    messageId: record.messageId,
    clientMessageId: record.clientMessageId,
    status: record.status,
    fromUserId: record.fromUserId,
    toUserId: record.toUserId,
    groupId: record.groupId,
    attempt: record.attempt,
    stableKey: record.stableKey,
  };
}

export function buildMessageEventEnvelope(
  eventType: MessageKnownEventType,
  options: BuildMessageEventEnvelopeOptions = {},
): MessageEventEnvelope {
  const stateVersion = resolveMessageStateVersion(options.status);
  const eventId = deriveDeterministicMessageEventId(
    eventType,
    options.identity || {},
    stateVersion,
  );

  return {
    eventId,
    eventType,
    occurredAt: options.occurredAt ?? Date.now(),
    ...(stateVersion === undefined ? {} : { stateVersion }),
  };
}

export function buildMessageEventPayload<T extends object>(
  eventType: MessageKnownEventType,
  payload: T,
  options: BuildMessageEventEnvelopeOptions = {},
): T & MessageEventEnvelope {
  const timestampCandidate = (payload as { timestamp?: unknown }).timestamp;
  const occurredAt = options.occurredAt ?? (
    typeof timestampCandidate === 'number' && Number.isFinite(timestampCandidate)
      ? timestampCandidate
      : Date.now()
  );

  const identity = {
    ...resolveIdentityFromPayload(payload),
    ...(options.identity || {}),
  };

  return {
    ...payload,
    ...buildMessageEventEnvelope(eventType, {
      ...options,
      occurredAt,
      identity,
    }),
  };
}
