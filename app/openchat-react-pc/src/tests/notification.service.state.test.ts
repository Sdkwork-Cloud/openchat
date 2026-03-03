import { beforeEach, describe, expect, it } from "vitest";
import { NotificationService } from "../../packages/sdkwork-openchat-pc-notification/src/services/NotificationService";

describe("notification service state", () => {
  beforeEach(() => {
    NotificationService.resetWorkspaceState();
  });

  it("creates and deletes a notification", async () => {
    const created = await NotificationService.pushNotification("Test", "Content", "system");
    expect(created.success).toBe(true);
    expect(created.data?.id).toBeTruthy();

    const listAfterCreate = await NotificationService.getNotifications({ type: "all" });
    const createdId = created.data?.id || "";
    expect(listAfterCreate.data?.some((item) => item.id === createdId)).toBe(true);

    const deleted = await NotificationService.deleteNotification(createdId);
    expect(deleted.success).toBe(true);

    const listAfterDelete = await NotificationService.getNotifications({ type: "all" });
    expect(listAfterDelete.data?.some((item) => item.id === createdId)).toBe(false);
  });

  it("clears read notifications", async () => {
    const first = await NotificationService.pushNotification("A", "Read me", "system");
    const second = await NotificationService.pushNotification("B", "Keep unread", "social");

    const firstId = first.data?.id || "";
    const secondId = second.data?.id || "";

    await NotificationService.markRead(firstId);
    await NotificationService.markUnread(secondId);

    const cleared = await NotificationService.clearRead();
    expect(cleared.success).toBe(true);

    const list = await NotificationService.getNotifications({ type: "all" });
    expect(list.data?.some((item) => item.id === firstId)).toBe(false);
    expect(list.data?.some((item) => item.id === secondId)).toBe(true);
  });
});
