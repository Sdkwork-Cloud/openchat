import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { NotificationService } from "./NotificationService";

export const NotificationResultService = createServiceResultProxy(NotificationService, {
  source: "http-or-mock",
  fallbackMessage: "Notification service request failed.",
});
