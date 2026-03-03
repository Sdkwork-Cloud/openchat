import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { FeedbackService } from "./FeedbackService";

export const FeedbackResultService = createServiceResultProxy(FeedbackService, {
  source: "http-or-mock",
  fallbackMessage: "Feedback service request failed.",
});

