import { createHash } from 'crypto';

export type MessageEventIdentity = {
  serverMessageId?: unknown;
  messageId?: unknown;
  clientMessageId?: unknown;
  status?: unknown;
  fromUserId?: unknown;
  toUserId?: unknown;
  groupId?: unknown;
  attempt?: unknown;
  stableKey?: unknown;
};

function normalizeIdentityCandidate(candidate: unknown): string | undefined {
  if (typeof candidate !== 'string') {
    return undefined;
  }

  const normalized = candidate.trim();
  return normalized ? normalized : undefined;
}

export function resolveMessageEventScope(identity: MessageEventIdentity = {}): string {
  const serverMessageId = normalizeIdentityCandidate(identity.serverMessageId);
  const messageId = normalizeIdentityCandidate(identity.messageId);
  const clientMessageId = normalizeIdentityCandidate(identity.clientMessageId);
  const status = normalizeIdentityCandidate(identity.status);
  const fromUserId = normalizeIdentityCandidate(identity.fromUserId);
  const toUserId = normalizeIdentityCandidate(identity.toUserId);
  const groupId = normalizeIdentityCandidate(identity.groupId);
  const stableKey = normalizeIdentityCandidate(identity.stableKey);
  const attempt =
    typeof identity.attempt === 'number' && Number.isFinite(identity.attempt)
      ? String(identity.attempt)
      : normalizeIdentityCandidate(identity.attempt) || '';

  const primaryId = serverMessageId || messageId || clientMessageId || '';
  if (primaryId) {
    return `message:${primaryId}:status:${status || ''}:attempt:${attempt}`;
  }

  const participantScope = `${fromUserId || ''}:${toUserId || ''}:${groupId || ''}`;
  if (participantScope !== '::') {
    return `participants:${participantScope}:status:${status || ''}:attempt:${attempt}`;
  }

  if (stableKey) {
    return `stable:${stableKey}:status:${status || ''}:attempt:${attempt}`;
  }

  return `fallback:status:${status || ''}:attempt:${attempt}`;
}

export function deriveDeterministicMessageEventId(
  eventType: string,
  identity: MessageEventIdentity = {},
  stateVersion?: number,
): string {
  const scope = resolveMessageEventScope(identity);
  const digest = createHash('sha256')
    .update(`evt:${eventType}:${scope}:${stateVersion ?? ''}`)
    .digest('hex');
  return `evt_${digest.slice(0, 32)}`;
}
