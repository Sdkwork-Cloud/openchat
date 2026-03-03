import { describe, expect, it } from "vitest";
import type { Video } from "../../packages/sdkwork-openchat-pc-video/src/types";
import {
  buildVideoWorkspaceLibrary,
  buildVideoWorkspaceSummary,
  filterVideoWorkspaceFeed,
} from "../../packages/sdkwork-openchat-pc-video/src/pages/video.workspace.model";

function createVideo(partial: Partial<Video>): Video {
  return {
    id: partial.id || "video-default",
    title: partial.title || "Untitled",
    description: partial.description,
    author: partial.author || "Unknown",
    authorAvatar: partial.authorAvatar,
    thumbnail: partial.thumbnail || "https://example.com/thumb.png",
    url: partial.url || "https://example.com/video.mp4",
    duration: partial.duration ?? 30,
    likes: partial.likes ?? 0,
    views: partial.views ?? 0,
    comments: partial.comments ?? 0,
    shares: partial.shares ?? 0,
    type: partial.type || "neural",
    hasLiked: partial.hasLiked ?? false,
    hasCollected: partial.hasCollected ?? false,
    tags: partial.tags || [],
    createTime: partial.createTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
    updateTime: partial.updateTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
  };
}

const videos: Video[] = [
  createVideo({
    id: "video-a",
    title: "Neural Story",
    type: "neural",
    likes: 100,
    views: 5000,
    duration: 45,
    hasCollected: true,
    createTime: Date.parse("2026-02-10T00:00:00.000Z"),
  }),
  createVideo({
    id: "video-b",
    title: "City Flow",
    type: "cyber",
    likes: 300,
    views: 9000,
    duration: 60,
    createTime: Date.parse("2026-02-12T00:00:00.000Z"),
  }),
  createVideo({
    id: "video-c",
    title: "Forest Calm",
    type: "nature",
    likes: 80,
    views: 1000,
    duration: 120,
    createTime: Date.parse("2026-02-11T00:00:00.000Z"),
  }),
];

describe("video workspace model", () => {
  it("builds video summary", () => {
    const summary = buildVideoWorkspaceSummary(videos);

    expect(summary.total).toBe(3);
    expect(summary.likes).toBe(480);
    expect(summary.views).toBe(15000);
    expect(summary.collected).toBe(1);
    expect(summary.avgDuration).toBe(75);
    expect(summary.typeDistribution.neural).toBe(1);
  });

  it("filters by keyword and type", () => {
    const filtered = filterVideoWorkspaceFeed(videos, {
      keyword: "city",
      type: "cyber",
      sortBy: "popular",
    });

    expect(filtered.map((item) => item.id)).toEqual(["video-b"]);
  });

  it("builds favorites/recent/trending libraries", () => {
    const library = buildVideoWorkspaceLibrary(videos, {
      favoriteVideoIds: ["video-c", "video-a", "unknown"],
      recentVideoIds: ["video-b", "video-a", "missing"],
      maxTrendingCount: 2,
    });

    expect(library.favorites.map((item) => item.id)).toEqual(["video-c", "video-a"]);
    expect(library.recent.map((item) => item.id)).toEqual(["video-b", "video-a"]);
    expect(library.trending.map((item) => item.id)).toEqual(["video-b", "video-a"]);
  });
});
