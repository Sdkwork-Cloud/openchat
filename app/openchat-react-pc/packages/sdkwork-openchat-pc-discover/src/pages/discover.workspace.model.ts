import type { ContentType, DiscoverItem } from "../types";

export type DiscoverWorkspaceSort = "hot" | "new" | "recommend";

export interface DiscoverWorkspaceSummary {
  total: number;
  reads: number;
  likes: number;
  typeDistribution: Record<ContentType, number>;
}

export interface DiscoverWorkspaceLibrary {
  favorites: DiscoverItem[];
  recent: DiscoverItem[];
  trending: DiscoverItem[];
}

export interface DiscoverWorkspaceFilterInput {
  keyword?: string;
  category?: string;
  type?: "all" | ContentType;
  sortBy?: DiscoverWorkspaceSort;
}

interface BuildDiscoverWorkspaceLibraryInput {
  favoriteItemIds: string[];
  recentItemIds: string[];
  maxTrendingCount?: number;
}

function scoreOf(item: DiscoverItem): number {
  return item.reads + item.likes * 10;
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

export function buildDiscoverWorkspaceSummary(items: DiscoverItem[]): DiscoverWorkspaceSummary {
  const summary: DiscoverWorkspaceSummary = {
    total: items.length,
    reads: 0,
    likes: 0,
    typeDistribution: {
      article: 0,
      video: 0,
      image: 0,
      audio: 0,
    },
  };

  items.forEach((item) => {
    summary.reads += item.reads;
    summary.likes += item.likes;
    summary.typeDistribution[item.type] += 1;
  });

  return summary;
}

export function filterDiscoverWorkspaceFeed(
  items: DiscoverItem[],
  input: DiscoverWorkspaceFilterInput,
): DiscoverItem[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";
  const category = input.category || "all";
  const type = input.type || "all";
  const sortBy = input.sortBy || "recommend";

  let list = [...items];

  if (keyword) {
    list = list.filter((item) => {
      const target = `${item.title} ${item.summary} ${item.source} ${item.tags.join(" ")}`.toLowerCase();
      return target.includes(keyword);
    });
  }

  if (type !== "all") {
    list = list.filter((item) => item.type === type);
  }

  if (category !== "all") {
    const normalizedCategory = category.toLowerCase();
    list = list.filter((item) =>
      item.tags.some((tag) => tag.toLowerCase().includes(normalizedCategory)),
    );
  }

  if (sortBy === "hot") {
    list.sort((left, right) => scoreOf(right) - scoreOf(left));
  } else if (sortBy === "new") {
    list.sort((left, right) => (right.createTime || 0) - (left.createTime || 0));
  } else {
    list.sort((left, right) => right.likes - left.likes);
  }

  return list;
}

export function buildDiscoverWorkspaceLibrary(
  items: DiscoverItem[],
  input: BuildDiscoverWorkspaceLibraryInput,
): DiscoverWorkspaceLibrary {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const maxTrendingCount = input.maxTrendingCount ?? 6;

  const favorites = uniqueIds(input.favoriteItemIds)
    .map((itemId) => itemMap.get(itemId))
    .filter((item): item is DiscoverItem => Boolean(item));

  const recent = uniqueIds(input.recentItemIds)
    .map((itemId) => itemMap.get(itemId))
    .filter((item): item is DiscoverItem => Boolean(item));

  const trending = [...items].sort((left, right) => scoreOf(right) - scoreOf(left)).slice(0, maxTrendingCount);

  return {
    favorites,
    recent,
    trending,
  };
}
