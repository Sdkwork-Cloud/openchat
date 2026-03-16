import { MessageStatus } from './message.interface';

export type DeliveryMessageStatus =
  | MessageStatus.SENDING
  | MessageStatus.SENT
  | MessageStatus.DELIVERED
  | MessageStatus.READ;

export type MessageEventStateKey = MessageStatus | 'duplicate' | 'retrying';

export const MESSAGE_STATE_VERSION: Record<MessageEventStateKey, number> = {
  [MessageStatus.SENDING]: 0,
  [MessageStatus.SENT]: 1,
  [MessageStatus.DELIVERED]: 2,
  [MessageStatus.READ]: 3,
  [MessageStatus.FAILED]: -1,
  [MessageStatus.RECALLED]: 99,
  duplicate: 1,
  retrying: 0,
};

export const DELIVERY_STATUS_RANK: Record<DeliveryMessageStatus, number> = {
  [MessageStatus.SENDING]: MESSAGE_STATE_VERSION[MessageStatus.SENDING],
  [MessageStatus.SENT]: MESSAGE_STATE_VERSION[MessageStatus.SENT],
  [MessageStatus.DELIVERED]: MESSAGE_STATE_VERSION[MessageStatus.DELIVERED],
  [MessageStatus.READ]: MESSAGE_STATE_VERSION[MessageStatus.READ],
};

export function resolveMessageStateVersion(status?: MessageEventStateKey): number | undefined {
  if (!status) {
    return undefined;
  }
  return MESSAGE_STATE_VERSION[status];
}

export function isDeliveryMessageStatus(status: MessageStatus): status is DeliveryMessageStatus {
  return status in DELIVERY_STATUS_RANK;
}

export function getAllowedDeliverySourceStatuses(targetStatus: DeliveryMessageStatus): MessageStatus[] {
  switch (targetStatus) {
    case MessageStatus.SENDING:
      return [MessageStatus.FAILED];
    case MessageStatus.SENT:
      return [MessageStatus.SENDING, MessageStatus.FAILED];
    case MessageStatus.DELIVERED:
      return [MessageStatus.SENDING, MessageStatus.SENT];
    case MessageStatus.READ:
      return [MessageStatus.SENDING, MessageStatus.SENT, MessageStatus.DELIVERED];
    default:
      return [targetStatus];
  }
}
