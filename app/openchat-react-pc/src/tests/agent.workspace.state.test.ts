import { describe, expect, it } from "vitest";
import { AgentService } from "../../packages/sdkwork-openchat-pc-agent/src/services/agent.service";

describe("agent workspace state", () => {
  it("toggles favorite flag for an agent id", () => {
    const agentId = `agent-fav-${Date.now()}`;

    const enabled = AgentService.toggleFavoriteAgent(agentId);
    expect(enabled).toBe(true);
    expect(AgentService.isAgentFavorite(agentId)).toBe(true);

    const disabled = AgentService.toggleFavoriteAgent(agentId);
    expect(disabled).toBe(false);
    expect(AgentService.isAgentFavorite(agentId)).toBe(false);
  });

  it("keeps recent opened order", () => {
    const first = `agent-open-a-${Date.now()}`;
    const second = `agent-open-b-${Date.now()}`;

    AgentService.markAgentOpened(first);
    const order = AgentService.markAgentOpened(second);
    const reordered = AgentService.markAgentOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});

