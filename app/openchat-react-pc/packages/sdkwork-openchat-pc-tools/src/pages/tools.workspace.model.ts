import type { Tool, ToolCategory } from "../types";

export type ToolsWorkspaceSort = "recommended" | "name";

export interface ToolsWorkspaceSummary {
  total: number;
  popular: number;
  newest: number;
  utility: number;
  converter: number;
  generator: number;
  developer: number;
  ai: number;
}

export interface ToolsWorkspaceLibrary {
  favorites: Tool[];
  recent: Tool[];
  recommended: Tool[];
}

export interface ToolsWorkspaceFilterInput {
  keyword?: string;
  category?: "all" | ToolCategory;
  sortBy?: ToolsWorkspaceSort;
}

interface BuildToolsWorkspaceLibraryInput {
  favoriteToolIds: string[];
  recentToolIds: string[];
  maxRecommendedCount?: number;
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    result.push(id);
  });

  return result;
}

function scoreTool(item: Tool): number {
  return (item.isPopular ? 2 : 0) + (item.isNew ? 1 : 0) + (item.category === "ai" ? 1 : 0);
}

export function buildToolsWorkspaceSummary(tools: Tool[]): ToolsWorkspaceSummary {
  return tools.reduce<ToolsWorkspaceSummary>(
    (summary, item) => {
      summary.total += 1;
      if (item.isPopular) {
        summary.popular += 1;
      }
      if (item.isNew) {
        summary.newest += 1;
      }
      summary[item.category] += 1;
      return summary;
    },
    {
      total: 0,
      popular: 0,
      newest: 0,
      utility: 0,
      converter: 0,
      generator: 0,
      developer: 0,
      ai: 0,
    },
  );
}

export function filterToolsWorkspaceFeed(
  tools: Tool[],
  input: ToolsWorkspaceFilterInput,
): Tool[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";
  const category = input.category || "all";
  const sortBy = input.sortBy || "recommended";

  let list = [...tools];

  if (keyword) {
    list = list.filter((item) => {
      const target = `${item.name} ${item.description} ${item.category}`.toLowerCase();
      return target.includes(keyword);
    });
  }

  if (category !== "all") {
    list = list.filter((item) => item.category === category);
  }

  list.sort((left, right) => {
    if (sortBy === "name") {
      return left.name.localeCompare(right.name);
    }
    const scoreDiff = scoreTool(right) - scoreTool(left);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return left.name.localeCompare(right.name);
  });

  return list;
}

export function buildToolsWorkspaceLibrary(
  tools: Tool[],
  input: BuildToolsWorkspaceLibraryInput,
): ToolsWorkspaceLibrary {
  const map = new Map(tools.map((item) => [item.id, item]));
  const maxRecommendedCount = input.maxRecommendedCount ?? 6;

  const favorites = uniqueIds(input.favoriteToolIds)
    .map((toolId) => map.get(toolId))
    .filter((item): item is Tool => Boolean(item));

  const recent = uniqueIds(input.recentToolIds)
    .map((toolId) => map.get(toolId))
    .filter((item): item is Tool => Boolean(item));

  const recommended = [...tools]
    .sort((left, right) => {
      const scoreDiff = scoreTool(right) - scoreTool(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, maxRecommendedCount);

  return {
    favorites,
    recent,
    recommended,
  };
}
