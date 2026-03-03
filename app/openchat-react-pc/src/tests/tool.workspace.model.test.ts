import { describe, expect, it } from "vitest";
import {
  ToolCategory,
  type ToolMarketItem,
} from "../../packages/sdkwork-openchat-pc-tool/src/entities/tool.entity";
import {
  buildToolWorkspaceLibrary,
  buildToolWorkspaceSummary,
} from "../../packages/sdkwork-openchat-pc-tool/src/pages/tool.workspace.model";

function createTool(partial: Partial<ToolMarketItem>): ToolMarketItem {
  return {
    id: partial.id || "tool-default",
    name: partial.name || "Default Tool",
    description: partial.description || "",
    icon: partial.icon || "TL",
    category: partial.category || ToolCategory.UTILITY,
    version: partial.version || "1.0.0",
    provider: partial.provider || "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: partial.endpoint || "https://api.example.com",
    method: partial.method || "POST",
    auth: partial.auth || { type: "none" },
    headers: partial.headers,
    timeout: partial.timeout,
    usageCount: partial.usageCount ?? 0,
    successRate: partial.successRate ?? 0,
    avgResponseTime: partial.avgResponseTime ?? 0,
    createdAt: partial.createdAt || "2026-02-01T00:00:00.000Z",
    updatedAt: partial.updatedAt || "2026-02-15T00:00:00.000Z",
    isEnabled: partial.isEnabled ?? false,
  };
}

const tools: ToolMarketItem[] = [
  createTool({
    id: "tool-a",
    name: "Weather",
    usageCount: 18000,
    successRate: 0.98,
    isEnabled: true,
  }),
  createTool({
    id: "tool-b",
    name: "Mailer",
    usageCount: 12000,
    successRate: 0.95,
    isEnabled: false,
  }),
  createTool({
    id: "tool-c",
    name: "SQL Query",
    usageCount: 15000,
    successRate: 0.99,
    isEnabled: true,
  }),
];

describe("tool workspace model", () => {
  it("builds workspace summary", () => {
    const summary = buildToolWorkspaceSummary(tools);
    expect(summary.total).toBe(3);
    expect(summary.enabled).toBe(2);
    expect(summary.disabled).toBe(1);
  });

  it("builds enabled/favorites/recent lanes", () => {
    const library = buildToolWorkspaceLibrary(tools, {
      favoriteToolIds: ["tool-c", "tool-b", "missing"],
      recentToolIds: ["tool-a", "tool-c", "unknown"],
    });

    expect(library.enabled.map((item) => item.id)).toEqual(["tool-a", "tool-c"]);
    expect(library.favorites.map((item) => item.id)).toEqual(["tool-c"]);
    expect(library.recent.map((item) => item.id)).toEqual(["tool-a", "tool-c"]);
  });
});
