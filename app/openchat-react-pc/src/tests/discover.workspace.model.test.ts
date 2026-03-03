import { describe, expect, it } from "vitest";
import type { DiscoverItem } from "../../packages/sdkwork-openchat-pc-discover/src/types";
import {
  buildDiscoverWorkspaceLibrary,
  buildDiscoverWorkspaceSummary,
  filterDiscoverWorkspaceFeed,
} from "../../packages/sdkwork-openchat-pc-discover/src/pages/discover.workspace.model";

function createItem(partial: Partial<DiscoverItem>): DiscoverItem {
  return {
    id: partial.id || "discover-default",
    title: partial.title || "Default title",
    summary: partial.summary || "",
    cover: partial.cover || "https://picsum.photos/seed/default/600/320",
    type: partial.type || "article",
    source: partial.source || "OpenChat",
    authorAvatar: partial.authorAvatar,
    reads: partial.reads ?? 0,
    likes: partial.likes ?? 0,
    tags: partial.tags || [],
    url: partial.url,
    createTime: partial.createTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
    updateTime: partial.updateTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
  };
}

const items: DiscoverItem[] = [
  createItem({
    id: "discover-a",
    title: "Agent Architecture Playbook",
    summary: "Architect high quality agent systems",
    type: "article",
    tags: ["ai", "architecture"],
    reads: 2000,
    likes: 200,
    createTime: Date.parse("2026-02-10T00:00:00.000Z"),
  }),
  createItem({
    id: "discover-b",
    title: "Video Prompt Kit",
    summary: "Prompting patterns for short video",
    type: "video",
    tags: ["design", "video"],
    reads: 1500,
    likes: 120,
    createTime: Date.parse("2026-02-09T00:00:00.000Z"),
  }),
  createItem({
    id: "discover-c",
    title: "AI Engineering Weekly",
    summary: "Monorepo module split and package governance",
    type: "article",
    tags: ["dev", "ai"],
    reads: 2600,
    likes: 320,
    createTime: Date.parse("2026-02-11T00:00:00.000Z"),
  }),
];

describe("discover workspace model", () => {
  it("builds summary metrics", () => {
    const summary = buildDiscoverWorkspaceSummary(items);
    expect(summary.total).toBe(3);
    expect(summary.reads).toBe(6100);
    expect(summary.likes).toBe(640);
    expect(summary.typeDistribution.article).toBe(2);
    expect(summary.typeDistribution.video).toBe(1);
  });

  it("filters and sorts feed with keyword and type", () => {
    const filtered = filterDiscoverWorkspaceFeed(items, {
      keyword: "ai",
      type: "article",
      sortBy: "new",
      category: "all",
    });

    expect(filtered.map((item) => item.id)).toEqual(["discover-c", "discover-a"]);
  });

  it("builds favorites and recent lanes", () => {
    const library = buildDiscoverWorkspaceLibrary(items, {
      favoriteItemIds: ["discover-c", "discover-b", "unknown"],
      recentItemIds: ["discover-a", "discover-c", "missing"],
    });

    expect(library.favorites.map((item) => item.id)).toEqual(["discover-c", "discover-b"]);
    expect(library.recent.map((item) => item.id)).toEqual(["discover-a", "discover-c"]);
  });
});
