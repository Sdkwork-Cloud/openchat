import type { CreationItem, CreationType } from "../types";

export type CreationWorkspaceSort = "new" | "popular";

export interface CreationWorkspaceSummary {
  total: number;
  likes: number;
  views: number;
  typeDistribution: Record<CreationType, number>;
}

export interface CreationWorkspaceLibrary {
  favorites: CreationItem[];
  recent: CreationItem[];
  trending: CreationItem[];
}

export interface CreationWorkspaceFilterInput {
  keyword?: string;
  type?: "all" | CreationType;
  sortBy?: CreationWorkspaceSort;
}

interface BuildCreationWorkspaceLibraryInput {
  favoriteCreationIds: string[];
  recentCreationIds: string[];
  maxTrendingCount?: number;
}

function scoreOf(item: CreationItem): number {
  return item.views + item.likes * 10;
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

export function buildCreationWorkspaceSummary(items: CreationItem[]): CreationWorkspaceSummary {
  const summary: CreationWorkspaceSummary = {
    total: items.length,
    likes: 0,
    views: 0,
    typeDistribution: {
      image: 0,
      video: 0,
      music: 0,
      text: 0,
      "3d": 0,
    },
  };

  items.forEach((item) => {
    summary.likes += item.likes;
    summary.views += item.views;
    summary.typeDistribution[item.type] += 1;
  });

  return summary;
}

export function filterCreationWorkspaceFeed(
  items: CreationItem[],
  input: CreationWorkspaceFilterInput,
): CreationItem[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";
  const type = input.type || "all";
  const sortBy = input.sortBy || "new";

  let list = [...items];

  if (keyword) {
    list = list.filter((item) => {
      const target = `${item.title} ${item.prompt} ${item.style} ${item.author}`.toLowerCase();
      return target.includes(keyword);
    });
  }

  if (type !== "all") {
    list = list.filter((item) => item.type === type);
  }

  if (sortBy === "popular") {
    list.sort((left, right) => scoreOf(right) - scoreOf(left));
  } else {
    list.sort((left, right) => (right.createTime || 0) - (left.createTime || 0));
  }

  return list;
}

export function buildCreationWorkspaceLibrary(
  items: CreationItem[],
  input: BuildCreationWorkspaceLibraryInput,
): CreationWorkspaceLibrary {
  const map = new Map(items.map((item) => [item.id, item]));
  const maxTrendingCount = input.maxTrendingCount ?? 6;

  const favorites = uniqueIds(input.favoriteCreationIds)
    .map((creationId) => map.get(creationId))
    .filter((item): item is CreationItem => Boolean(item));

  const recent = uniqueIds(input.recentCreationIds)
    .map((creationId) => map.get(creationId))
    .filter((item): item is CreationItem => Boolean(item));

  const trending = [...items].sort((left, right) => scoreOf(right) - scoreOf(left)).slice(0, maxTrendingCount);

  return {
    favorites,
    recent,
    trending,
  };
}
