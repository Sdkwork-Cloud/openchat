import type { Video, VideoType } from "../types";

export type VideoWorkspaceSort = "popular" | "new" | "duration";

export interface VideoWorkspaceSummary {
  total: number;
  views: number;
  likes: number;
  comments: number;
  collected: number;
  avgDuration: number;
  typeDistribution: Record<VideoType, number>;
}

export interface VideoWorkspaceLibrary {
  favorites: Video[];
  recent: Video[];
  trending: Video[];
}

export interface VideoWorkspaceFilterInput {
  keyword?: string;
  type?: "all" | VideoType;
  sortBy?: VideoWorkspaceSort;
}

interface BuildVideoWorkspaceLibraryInput {
  favoriteVideoIds: string[];
  recentVideoIds: string[];
  maxTrendingCount?: number;
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

function engagementScore(item: Video): number {
  return item.views + item.likes * 8 + item.comments * 5 + item.shares * 12;
}

export function buildVideoWorkspaceSummary(videos: Video[]): VideoWorkspaceSummary {
  const total = videos.length;
  const likes = videos.reduce((sum, item) => sum + item.likes, 0);
  const views = videos.reduce((sum, item) => sum + item.views, 0);
  const comments = videos.reduce((sum, item) => sum + item.comments, 0);
  const collected = videos.reduce((sum, item) => sum + (item.hasCollected ? 1 : 0), 0);
  const avgDuration =
    total === 0
      ? 0
      : Math.round(videos.reduce((sum, item) => sum + item.duration, 0) / total);

  const typeDistribution: Record<VideoType, number> = {
    neural: 0,
    matrix: 0,
    aurora: 0,
    cyber: 0,
    nature: 0,
  };

  videos.forEach((item) => {
    typeDistribution[item.type] += 1;
  });

  return {
    total,
    views,
    likes,
    comments,
    collected,
    avgDuration,
    typeDistribution,
  };
}

export function filterVideoWorkspaceFeed(
  videos: Video[],
  input: VideoWorkspaceFilterInput,
): Video[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";
  const type = input.type || "all";
  const sortBy = input.sortBy || "popular";

  let list = [...videos];

  if (keyword) {
    list = list.filter((item) => {
      const target = `${item.title} ${item.description || ""} ${item.author} ${item.tags.join(" ")}`.toLowerCase();
      return target.includes(keyword);
    });
  }

  if (type !== "all") {
    list = list.filter((item) => item.type === type);
  }

  list.sort((left, right) => {
    if (sortBy === "new") {
      return (right.createTime || 0) - (left.createTime || 0);
    }
    if (sortBy === "duration") {
      return right.duration - left.duration;
    }
    return engagementScore(right) - engagementScore(left);
  });

  return list;
}

export function buildVideoWorkspaceLibrary(
  videos: Video[],
  input: BuildVideoWorkspaceLibraryInput,
): VideoWorkspaceLibrary {
  const map = new Map(videos.map((item) => [item.id, item]));
  const maxTrendingCount = input.maxTrendingCount ?? 6;

  const favorites = uniqueIds(input.favoriteVideoIds)
    .map((videoId) => map.get(videoId))
    .filter((item): item is Video => Boolean(item));

  const recent = uniqueIds(input.recentVideoIds)
    .map((videoId) => map.get(videoId))
    .filter((item): item is Video => Boolean(item));

  const trending = [...videos]
    .sort((left, right) => engagementScore(right) - engagementScore(left))
    .slice(0, maxTrendingCount);

  return {
    favorites,
    recent,
    trending,
  };
}
