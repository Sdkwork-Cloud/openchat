import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import ToolService from "./tool.service";

export const ToolResultService = createServiceResultProxy(ToolService, {
  source: "http-or-mock",
  fallbackMessage: "Tool service request failed.",
});
