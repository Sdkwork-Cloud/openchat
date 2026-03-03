import type { Notification, NotificationType } from "../types";

export interface NotificationFeedSummary {
  total: number;
  unread: number;
  read: number;
  byType: Record<NotificationType, number>;
}

export interface NotificationWorkspaceLibrary {
  unread: Notification[];
  read: Notification[];
}

interface FilterNotificationFeedInput {
  keyword?: string;
  type?: NotificationType | "all";
  onlyUnread?: boolean;
}

function byCreateTimeDesc(left: Notification, right: Notification): number {
  const leftTime = Number(left.createTime ?? 0);
  const rightTime = Number(right.createTime ?? 0);
  return rightTime - leftTime;
}

export function buildNotificationFeedSummary(notifications: Notification[]): NotificationFeedSummary {
  const byType: Record<NotificationType, number> = {
    system: 0,
    social: 0,
    order: 0,
    promotion: 0,
    message: 0,
  };

  notifications.forEach((item) => {
    byType[item.type] += 1;
  });

  const unread = notifications.filter((item) => !item.isRead).length;
  return {
    total: notifications.length,
    unread,
    read: notifications.length - unread,
    byType,
  };
}

export function filterNotificationFeed(
  notifications: Notification[],
  input: FilterNotificationFeedInput,
): Notification[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";

  return notifications
    .filter((item) => (input.type && input.type !== "all" ? item.type === input.type : true))
    .filter((item) => (input.onlyUnread ? !item.isRead : true))
    .filter((item) => {
      if (!keyword) {
        return true;
      }
      const indexText = `${item.title} ${item.content}`.toLowerCase();
      return indexText.includes(keyword);
    })
    .sort(byCreateTimeDesc);
}

export function buildNotificationWorkspaceLibrary(
  notifications: Notification[],
): NotificationWorkspaceLibrary {
  const sorted = [...notifications].sort(byCreateTimeDesc);

  return {
    unread: sorted.filter((item) => !item.isRead),
    read: sorted.filter((item) => item.isRead),
  };
}
