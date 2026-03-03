import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import terminalService from "./terminal.service";

export const TerminalResultService = createServiceResultProxy(terminalService, {
  source: "local",
  fallbackMessage: "Terminal service request failed.",
});
