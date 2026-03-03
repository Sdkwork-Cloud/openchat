import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { CreationService } from "./CreationService";

export const CreationResultService = createServiceResultProxy(CreationService, {
  source: "local",
  fallbackMessage: "Creation service request failed.",
});
