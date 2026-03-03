import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { VideoService } from "./VideoService";

export const VideoResultService = createServiceResultProxy(VideoService, {
  source: "http-or-mock",
  fallbackMessage: "Video service request failed.",
});
