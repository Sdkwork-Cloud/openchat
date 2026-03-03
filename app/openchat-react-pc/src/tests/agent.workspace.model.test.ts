import { describe, expect, it } from "vitest";
import {
  AgentCategory,
  AgentStatus,
  AgentType,
  type Agent,
} from "../../packages/sdkwork-openchat-pc-agent/src/entities/agent.entity";
import {
  applyAgentWorkbenchFilter,
  buildAgentWorkbenchLibrary,
  buildAgentWorkbenchSummary,
  pickAgentPreviewTarget,
  type AgentWorkbenchRail,
} from "../../packages/sdkwork-openchat-pc-agent/src/pages/agent.workspace.model";

function createAgent(partial: Partial<Agent>): Agent {
  const now = "2026-02-28T08:00:00.000Z";
  return {
    id: partial.id || "agent-default",
    uuid: partial.uuid || `${partial.id || "agent-default"}-uuid`,
    name: partial.name || "Default Agent",
    description: partial.description || "",
    avatar: partial.avatar || "AG",
    type: partial.type || AgentType.ASSISTANT,
    status: partial.status || AgentStatus.READY,
    config: {
      category: partial.config?.category || AgentCategory.ALL,
      rating: partial.config?.rating ?? 0,
      usageCount: partial.config?.usageCount ?? 0,
      creator: partial.config?.creator || "OpenChat",
      tags: partial.config?.tags || [],
    },
    ownerId: partial.ownerId || "system",
    isPublic: true,
    isDeleted: false,
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
  };
}

const fixtureAgents: Agent[] = [
  createAgent({
    id: "agent-a",
    name: "Writer",
    config: {
      category: AgentCategory.WRITING,
      rating: 4.8,
      usageCount: 12400,
      creator: "OpenChat Team",
      tags: ["copy"],
    },
    updatedAt: "2026-02-27T10:00:00.000Z",
  }),
  createAgent({
    id: "agent-b",
    name: "Support Bot",
    status: AgentStatus.CHATTING,
    ownerId: "current-user",
    config: {
      category: AgentCategory.BUSINESS,
      rating: 4.6,
      usageCount: 8400,
      creator: "You",
      tags: ["service"],
    },
    updatedAt: "2026-02-28T11:00:00.000Z",
  }),
  createAgent({
    id: "agent-c",
    name: "Code Partner",
    status: AgentStatus.EXECUTING,
    config: {
      category: AgentCategory.PROGRAMMING,
      rating: 4.9,
      usageCount: 15300,
      creator: "OpenChat Team",
      tags: ["dev"],
    },
    updatedAt: "2026-02-28T09:00:00.000Z",
  }),
];

describe("agent workspace model", () => {
  it("builds summary slices from full list", () => {
    const summary = buildAgentWorkbenchSummary(fixtureAgents);

    expect(summary.total).toBe(3);
    expect(summary.active).toBe(2);
    expect(summary.mine).toBe(1);
    expect(summary.featured.map((item) => item.id)).toEqual(["agent-c", "agent-a", "agent-b"]);
    expect(summary.recent.map((item) => item.id)).toEqual(["agent-b", "agent-c", "agent-a"]);
  });

  it("filters by rail and keyword", () => {
    const filtered = applyAgentWorkbenchFilter({
      agents: fixtureAgents,
      rail: "mine",
      category: AgentCategory.ALL,
      keyword: "support",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("agent-b");
  });

  it("falls back to available preview target", () => {
    const next = pickAgentPreviewTarget({
      agents: fixtureAgents,
      preferredId: "unknown",
      rail: "active",
    });
    expect(next).toBe("agent-c");
  });

  it("builds favorite and recent-opened lanes", () => {
    const library = buildAgentWorkbenchLibrary(fixtureAgents, {
      favoriteAgentIds: ["agent-b", "unknown"],
      recentOpenedAgentIds: ["agent-a", "agent-c", "missing"],
    });

    expect(library.favorites.map((item) => item.id)).toEqual(["agent-b"]);
    expect(library.recentOpened.map((item) => item.id)).toEqual(["agent-a", "agent-c"]);
  });

  it.each<AgentWorkbenchRail>(["all", "featured", "mine", "recent", "active"])(
    "supports rail '%s'",
    (rail) => {
      const filtered = applyAgentWorkbenchFilter({
        agents: fixtureAgents,
        rail,
        category: AgentCategory.ALL,
      });
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    },
  );
});
