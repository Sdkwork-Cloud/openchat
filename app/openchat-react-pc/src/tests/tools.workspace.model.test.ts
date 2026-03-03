import { describe, expect, it } from "vitest";
import type { Tool } from "../../packages/sdkwork-openchat-pc-tools/src/types";
import {
  buildToolsWorkspaceLibrary,
  buildToolsWorkspaceSummary,
  filterToolsWorkspaceFeed,
} from "../../packages/sdkwork-openchat-pc-tools/src/pages/tools.workspace.model";

function createTool(partial: Partial<Tool>): Tool {
  return {
    id: partial.id || "tool-default",
    name: partial.name || "Tool",
    description: partial.description || "",
    icon: partial.icon || "TOOL",
    category: partial.category || "utility",
    isPopular: partial.isPopular,
    isNew: partial.isNew,
  };
}

const tools: Tool[] = [
  createTool({
    id: "tool-json",
    name: "JSON Formatter",
    description: "Format JSON",
    category: "converter",
    isPopular: true,
  }),
  createTool({
    id: "tool-uuid",
    name: "UUID Generator",
    description: "Generate ids",
    category: "utility",
  }),
  createTool({
    id: "tool-summary",
    name: "Text Summary",
    description: "Summarize long text",
    category: "ai",
    isNew: true,
  }),
];

describe("tools workspace model", () => {
  it("builds tools summary", () => {
    const summary = buildToolsWorkspaceSummary(tools);

    expect(summary.total).toBe(3);
    expect(summary.popular).toBe(1);
    expect(summary.newest).toBe(1);
    expect(summary.ai).toBe(1);
    expect(summary.converter).toBe(1);
  });

  it("filters tool feed by keyword/category", () => {
    const filtered = filterToolsWorkspaceFeed(tools, {
      keyword: "uuid",
      category: "utility",
      sortBy: "name",
    });

    expect(filtered.map((item) => item.id)).toEqual(["tool-uuid"]);
  });

  it("builds favorites/recent/recommended libraries", () => {
    const library = buildToolsWorkspaceLibrary(tools, {
      favoriteToolIds: ["tool-summary", "tool-json", "missing"],
      recentToolIds: ["tool-uuid", "tool-json", "missing"],
      maxRecommendedCount: 2,
    });

    expect(library.favorites.map((item) => item.id)).toEqual(["tool-summary", "tool-json"]);
    expect(library.recent.map((item) => item.id)).toEqual(["tool-uuid", "tool-json"]);
    expect(library.recommended.map((item) => item.id)).toEqual(["tool-json", "tool-summary"]);
  });
});
