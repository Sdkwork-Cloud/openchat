import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { ToolsService } from "./ToolsService";

export const ToolsResultService = createServiceResultProxy(ToolsService, {
  source: "local",
  fallbackMessage: "Tools service request failed.",
});
