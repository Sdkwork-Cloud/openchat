import { BadRequestException } from '@nestjs/common';
import { Message } from './message.interface';

type MessageEventContent = NonNullable<NonNullable<Message['content']['event']>>;

interface MessageEventTransportInput {
  type?: string;
  name?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface MessageEventConversationContext {
  type: 'single' | 'group';
  targetId: string;
}

const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const EVENT_NAME_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SIGNAL_TYPE_PATTERN = /^[a-z][a-z0-9.-]{0,63}$/;
const MAX_SIGNAL_TEXT_LENGTH = 20000;
const RTC_SIGNAL_NAME_PREFIX = 'rtc.';
const GAME_EVENT_NAME_PREFIX = 'game.';
const RTC_STANDARD_SIGNAL_TYPES = new Set([
  'join',
  'leave',
  'publish',
  'unpublish',
  'offer',
  'answer',
  'ice-candidate',
]);

export function normalizeMessageEventTransport(
  event: MessageEventTransportInput | undefined,
  context: MessageEventConversationContext,
): MessageEventContent {
  const normalizedType = normalizeTransportType(event?.type);
  const rawData = toRecord(event?.data, 'event.data');
  const rawMetadata = toRecord(event?.metadata, 'event.metadata');

  if (normalizedType === 'RTC_SIGNAL') {
    return normalizeRtcSignalEvent(
      event,
      context,
      rawData,
      rawMetadata,
    );
  }

  if (normalizedType === 'GAME_EVENT') {
    return normalizeGameEvent(event, rawData, rawMetadata);
  }

  const normalizedName = normalizeOptionalEventName(event?.name);
  return {
    type: normalizedType,
    ...(normalizedName ? { name: normalizedName } : {}),
    ...(Object.keys(rawData).length > 0 ? { data: rawData } : {}),
    ...(Object.keys(rawMetadata).length > 0 ? { metadata: rawMetadata } : {}),
  };
}

function normalizeRtcSignalEvent(
  event: MessageEventTransportInput | undefined,
  context: MessageEventConversationContext,
  rawData: Record<string, unknown>,
  rawMetadata: Record<string, unknown>,
): MessageEventContent {
  const roomId = normalizeRequiredIdentifier(rawData.roomId, 'event.data.roomId');
  const rawToUserId = normalizeOptionalIdentifier(rawData.toUserId, 'event.data.toUserId');
  const conversationToUserId =
    context.type === 'single'
      ? normalizeOptionalIdentifier(context.targetId, 'conversation.targetId')
      : undefined;
  const toUserId = rawToUserId ?? conversationToUserId;

  if (rawToUserId && conversationToUserId && rawToUserId !== conversationToUserId) {
    throw new BadRequestException(
      'event.data.toUserId must match conversation.targetId for single RTC signaling',
    );
  }

  const signalType = normalizeRtcSignalType(rawData.signalType);
  const normalizedName =
    normalizeOptionalEventName(event?.name) || `${RTC_SIGNAL_NAME_PREFIX}${signalType}`;
  if (!normalizedName.startsWith(RTC_SIGNAL_NAME_PREFIX)) {
    throw new BadRequestException('RTC_SIGNAL event.name must start with rtc.');
  }
  if (
    RTC_STANDARD_SIGNAL_TYPES.has(signalType) &&
    normalizedName !== `${RTC_SIGNAL_NAME_PREFIX}${signalType}`
  ) {
    throw new BadRequestException(
      'RTC_SIGNAL event.name must match the canonical rtc.<signalType> form',
    );
  }

  const sessionId = normalizeOptionalIdentifier(rawData.sessionId, 'event.data.sessionId');
  const payload = normalizeRtcSignalPayload(signalType, rawData.payload);

  if (
    (signalType === 'offer' || signalType === 'answer' || signalType === 'ice-candidate') &&
    !toUserId
  ) {
    throw new BadRequestException(
      `RTC_SIGNAL ${signalType} requires event.data.toUserId or a SINGLE conversation target`,
    );
  }

  const metadataRoomId = normalizeOptionalIdentifier(
    rawMetadata.roomId,
    'event.metadata.roomId',
  );
  if (metadataRoomId && metadataRoomId !== roomId) {
    throw new BadRequestException('event.metadata.roomId must match event.data.roomId');
  }

  const correlationId = normalizeOptionalIdentifier(
    rawMetadata.correlationId,
    'event.metadata.correlationId',
  );
  const metadataNamespace = normalizeOptionalNamespace(
    rawMetadata.namespace,
    'event.metadata.namespace',
  );
  if (metadataNamespace && metadataNamespace !== 'rtc') {
    throw new BadRequestException('RTC_SIGNAL metadata.namespace must be rtc');
  }

  const version = normalizeMetadataVersion(rawMetadata.version);
  const metadata = {
    ...stripUndefinedValues({
      ...rawMetadata,
      namespace: 'rtc',
      version,
      roomId,
      correlationId,
    }),
  };

  return {
    type: 'RTC_SIGNAL',
    name: normalizedName,
    data: stripUndefinedValues({
      roomId,
      toUserId,
      signalType,
      sessionId,
      ...(Object.keys(payload).length > 0 ? { payload } : {}),
    }),
    metadata,
  };
}

function normalizeGameEvent(
  event: MessageEventTransportInput | undefined,
  rawData: Record<string, unknown>,
  rawMetadata: Record<string, unknown>,
): MessageEventContent {
  const normalizedName = normalizeRequiredEventName(event?.name, 'GAME_EVENT');
  if (!normalizedName.startsWith(GAME_EVENT_NAME_PREFIX)) {
    throw new BadRequestException('GAME_EVENT event.name must start with game.');
  }

  const metadataNamespace = normalizeOptionalNamespace(
    rawMetadata.namespace,
    'event.metadata.namespace',
  );
  if (metadataNamespace && metadataNamespace !== 'game') {
    throw new BadRequestException('GAME_EVENT metadata.namespace must be game');
  }

  const version = normalizeMetadataVersion(rawMetadata.version);
  return {
    type: 'GAME_EVENT',
    name: normalizedName,
    ...(Object.keys(rawData).length > 0 ? { data: rawData } : {}),
    metadata: stripUndefinedValues({
      ...rawMetadata,
      namespace: 'game',
      version,
    }),
  };
}

function normalizeRtcSignalPayload(
  signalType: string,
  value: unknown,
): Record<string, unknown> {
  const payload = toRecord(value, 'event.data.payload');

  if (signalType === 'offer' || signalType === 'answer') {
    return {
      ...payload,
      sdp: normalizeSignalText(payload.sdp, 'event.data.payload.sdp'),
    };
  }

  if (signalType === 'ice-candidate') {
    const candidate = payload.candidate;
    if (candidate === undefined || candidate === null) {
      throw new BadRequestException(
        'RTC_SIGNAL ice-candidate requires event.data.payload.candidate',
      );
    }
    if (typeof candidate === 'string') {
      return {
        ...payload,
        candidate: normalizeSignalText(
          candidate,
          'event.data.payload.candidate',
        ),
      };
    }
    if (typeof candidate === 'object' && !Array.isArray(candidate)) {
      return {
        ...payload,
        candidate: { ...(candidate as Record<string, unknown>) },
      };
    }
    throw new BadRequestException(
      'event.data.payload.candidate must be a string or object',
    );
  }

  return payload;
}

function normalizeTransportType(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('event.type is required');
  }

  const normalized = value.trim().replace(/-/g, '_').toUpperCase();
  if (!normalized) {
    throw new BadRequestException('event.type is required');
  }
  return normalized;
}

function normalizeRtcSignalType(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('event.data.signalType is required');
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || !SIGNAL_TYPE_PATTERN.test(normalized)) {
    throw new BadRequestException('event.data.signalType is invalid');
  }

  return normalized;
}

function normalizeRequiredEventName(value: unknown, eventType: string): string {
  const normalized = normalizeOptionalEventName(value);
  if (!normalized) {
    throw new BadRequestException(`${eventType} event.name is required`);
  }
  return normalized;
}

function normalizeOptionalEventName(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('event.name must be a string');
  }

  const normalized = value.trim();
  if (!normalized || !EVENT_NAME_PATTERN.test(normalized)) {
    throw new BadRequestException('event.name is invalid');
  }
  return normalized;
}

function normalizeRequiredIdentifier(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalIdentifier(value, fieldName);
  if (!normalized) {
    throw new BadRequestException(`${fieldName} is required`);
  }
  return normalized;
}

function normalizeOptionalIdentifier(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if (!normalized || !IDENTIFIER_PATTERN.test(normalized)) {
    throw new BadRequestException(`${fieldName} is invalid`);
  }
  return normalized;
}

function normalizeSignalText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_SIGNAL_TEXT_LENGTH) {
    throw new BadRequestException(`${fieldName} is invalid`);
  }
  return normalized;
}

function normalizeOptionalNamespace(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldName} must be a string`);
  }
  return value.trim().toLowerCase();
}

function normalizeMetadataVersion(value: unknown): number {
  if (value === undefined || value === null) {
    return 1;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 9999) {
    throw new BadRequestException('event.metadata.version must be a positive integer');
  }
  return numeric;
}

function toRecord(
  value: unknown,
  fieldName: string,
): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${fieldName} must be an object`);
  }
  return { ...(value as Record<string, unknown>) };
}

function stripUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}
