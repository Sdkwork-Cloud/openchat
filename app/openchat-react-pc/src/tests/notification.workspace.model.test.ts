import { describe, expect, it } from "vitest";
import type { Notification } from "../../packages/sdkwork-openchat-pc-notification/src/types";
import {
  buildNotificationFeedSummary,
  buildNotificationWorkspaceLibrary,
  filterNotificationFeed,
} from "../../packages/sdkwork-openchat-pc-notification/src/pages/notification.workspace.model";

function createNotification(partial: Partial<Notification>): Notification {
  const now = Date.now();
  return {
    id: partial.id || "notification-default",
    type: partial.type || "system",
    title: partial.title || "Default",
    content: partial.content || "",
    icon: partial.icon,
    link: partial.link,
    isRead: Boolean(partial.isRead),
    meta: partial.meta,
    createTime: partial.createTime ?? now,
    updateTime: partial.updateTime ?? now,
  };
}

const notifications: Notification[] = [
  createNotification({
    id: "n-a",
    type: "system",
    title: "System update",
    content: "workspace updated",
    isRead: false,
    createTime: 1_000,
  }),
  createNotification({
    id: "n-b",
    type: "social",
    title: "Mention",
    content: "you were mentioned",
    isRead: true,
    createTime: 2_000,
  }),
  createNotification({
    id: "n-c",
    type: "message",
    title: "New direct message",
    content: "from Mia",
    isRead: false,
    createTime: 3_000,
  }),
];

describe("notification workspace model", () => {
  it("builds feed summary counters", () => {
    const summary = buildNotificationFeedSummary(notifications);
    expect(summary.total).toBe(3);
    expect(summary.unread).toBe(2);
    expect(summary.read).toBe(1);
    expect(summary.byType.system).toBe(1);
    expect(summary.byType.social).toBe(1);
    expect(summary.byType.message).toBe(1);
  });

  it("filters notifications by keyword/type/unread", () => {
    const filtered = filterNotificationFeed(notifications, {
      keyword: "mia",
      type: "message",
      onlyUnread: true,
    });
    expect(filtered.map((item) => item.id)).toEqual(["n-c"]);
  });

  it("builds unread/read lanes sorted by create time", () => {
    const library = buildNotificationWorkspaceLibrary(notifications);
    expect(library.unread.map((item) => item.id)).toEqual(["n-c", "n-a"]);
    expect(library.read.map((item) => item.id)).toEqual(["n-b"]);
  });
});
