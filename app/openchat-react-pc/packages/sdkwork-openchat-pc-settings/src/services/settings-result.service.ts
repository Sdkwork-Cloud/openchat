import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { SettingsService } from "./SettingsService";

export const SettingsResultService = createServiceResultProxy(SettingsService, {
  source: "http-or-mock",
  fallbackMessage: "Settings service request failed.",
});
