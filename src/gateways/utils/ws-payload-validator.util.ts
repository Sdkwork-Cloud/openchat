export const WS_IDENTIFIER_PATTERN = /^[A-Za-z0-9._:-]+$/;
export const WS_MESSAGE_TYPE_PATTERN = /^[A-Za-z0-9._:-]+$/;
export const MAX_IDENTIFIER_LENGTH = 128;
export const MAX_MESSAGE_TYPE_LENGTH = 32;
export const MAX_MESSAGE_CONTENT_LENGTH = 10000;
export const MAX_RTC_SIGNAL_TEXT_LENGTH = 20000;
export const MAX_ACK_BATCH_SIZE = 200;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeIdentifier(
  value: unknown,
  maxLength = MAX_IDENTIFIER_LENGTH,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    return undefined;
  }

  if (!WS_IDENTIFIER_PATTERN.test(normalized)) {
    return undefined;
  }

  return normalized;
}

export function normalizeMessageTypeToken(
  value: unknown,
  maxLength = MAX_MESSAGE_TYPE_LENGTH,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    return undefined;
  }

  if (!WS_MESSAGE_TYPE_PATTERN.test(normalized)) {
    return undefined;
  }

  return normalized;
}

export function normalizeMessageContent(
  value: unknown,
  maxLength = MAX_MESSAGE_CONTENT_LENGTH,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  if (value.length > maxLength) {
    return undefined;
  }

  return value;
}

export function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function isConversationType(value: unknown): value is 'single' | 'group' {
  return value === 'single' || value === 'group';
}

export function isAckStatus(value: unknown): value is 'delivered' | 'read' {
  return value === 'delivered' || value === 'read';
}

export function normalizeRtcSignalType(
  value: unknown,
): 'offer' | 'answer' | 'ice-candidate' | undefined {
  if (value === 'offer' || value === 'answer' || value === 'ice-candidate') {
    return value;
  }

  return undefined;
}

export function isValidRtcSignalPayload(
  value: unknown,
  maxStringLength = MAX_RTC_SIGNAL_TEXT_LENGTH,
): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.length > 0 && value.length <= maxStringLength;
  }

  if (typeof value === 'object') {
    return true;
  }

  return false;
}
