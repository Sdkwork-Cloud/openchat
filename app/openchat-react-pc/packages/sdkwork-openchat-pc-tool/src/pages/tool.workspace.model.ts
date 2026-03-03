import type { ToolMarketItem } from "../entities/tool.entity";

export interface ToolWorkspaceSummary {
  total: number;
  enabled: number;
  disabled: number;
}

export interface ToolWorkspaceLibrary {
  enabled: ToolMarketItem[];
  favorites: ToolMarketItem[];
  recent: ToolMarketItem[];
}

interface BuildToolWorkspaceLibraryInput {
  favoriteToolIds: string[];
  recentToolIds: string[];
}

function byScore(left: ToolMarketItem, right: ToolMarketItem): number {
  const leftScore = left.successRate * 10_000 + left.usageCount;
  const rightScore = right.successRate * 10_000 + right.usageCount;
  return rightScore - leftScore;
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];

  ids.forEach((id) => {
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    list.push(id);
  });

  return list;
}

export function buildToolWorkspaceSummary(tools: ToolMarketItem[]): ToolWorkspaceSummary {
  const enabled = tools.filter((item) => Boolean(item.isEnabled)).length;
  return {
    total: tools.length,
    enabled,
    disabled: tools.length - enabled,
  };
}

export function buildToolWorkspaceLibrary(
  tools: ToolMarketItem[],
  input: BuildToolWorkspaceLibraryInput,
): ToolWorkspaceLibrary {
  const enabled = tools.filter((item) => Boolean(item.isEnabled)).sort(byScore);
  const enabledMap = new Map(enabled.map((item) => [item.id, item]));

  const favorites = uniqueIds(input.favoriteToolIds)
    .map((toolId) => enabledMap.get(toolId))
    .filter((item): item is ToolMarketItem => Boolean(item));

  const recent = uniqueIds(input.recentToolIds)
    .map((toolId) => enabledMap.get(toolId))
    .filter((item): item is ToolMarketItem => Boolean(item));

  return {
    enabled,
    favorites,
    recent,
  };
}
