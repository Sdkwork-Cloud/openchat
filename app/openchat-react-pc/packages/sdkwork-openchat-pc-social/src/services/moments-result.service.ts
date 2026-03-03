import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { MomentsService } from "./MomentsService";

export const MomentsResultService = createServiceResultProxy(MomentsService, {
  source: "http-or-mock",
  fallbackMessage: "Moments service request failed.",
});
