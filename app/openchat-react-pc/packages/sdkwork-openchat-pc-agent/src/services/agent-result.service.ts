import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import AgentService from "./agent.service";
import { memoryService } from "./memory.service";

export const AgentResultService = createServiceResultProxy(AgentService, {
  source: "http-or-mock",
  fallbackMessage: "Agent service request failed.",
});

export const AgentMemoryResultService = createServiceResultProxy(memoryService, {
  source: "http-or-mock",
  fallbackMessage: "Agent memory service request failed.",
});
