import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import deviceService from "./device.service";

export const DeviceResultService = createServiceResultProxy(deviceService, {
  source: "http-or-mock",
  fallbackMessage: "Device service request failed.",
});
