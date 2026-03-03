import {
  createFailureServiceResult,
  createServiceResultProxy,
  createSuccessServiceResult,
  type ResultifiedService,
} from "@sdkwork/openchat-pc-contracts";
import { destroyRTCService, getRTCService, type RTCService } from "./rtc.service";

export function getRTCResultService(): ResultifiedService<RTCService> {
  return createServiceResultProxy(getRTCService(), {
    source: "sdk",
    fallbackMessage: "RTC service request failed.",
  });
}

export function destroyRTCResultService() {
  try {
    destroyRTCService();
    return createSuccessServiceResult<void>(undefined, "sdk");
  } catch (error) {
    return createFailureServiceResult<void>(error, {
      source: "sdk",
      fallbackMessage: "Failed to destroy RTC service.",
    });
  }
}
