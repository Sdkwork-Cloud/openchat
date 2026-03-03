import { describe, expect, it } from "vitest";
import type { CreationItem } from "../../packages/sdkwork-openchat-pc-creation/src/types";
import {
  buildCreationWorkspaceLibrary,
  buildCreationWorkspaceSummary,
  filterCreationWorkspaceFeed,
} from "../../packages/sdkwork-openchat-pc-creation/src/pages/creation.workspace.model";

function createItem(partial: Partial<CreationItem>): CreationItem {
  return {
    id: partial.id || "creation-default",
    title: partial.title || "Untitled",
    type: partial.type || "image",
    prompt: partial.prompt || "",
    negativePrompt: partial.negativePrompt,
    ratio: partial.ratio || "16:9",
    style: partial.style || "realistic",
    url: partial.url || "https://picsum.photos/seed/default/900/500",
    thumbnail: partial.thumbnail,
    isPublic: partial.isPublic ?? true,
    author: partial.author || "Me",
    authorAvatar: partial.authorAvatar,
    likes: partial.likes ?? 0,
    views: partial.views ?? 0,
    model: partial.model,
    seed: partial.seed,
    steps: partial.steps,
    cfgScale: partial.cfgScale,
    createTime: partial.createTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
    updateTime: partial.updateTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
  };
}

const items: CreationItem[] = [
  createItem({
    id: "creation-a",
    title: "Agent Poster",
    type: "image",
    prompt: "poster prompt",
    likes: 120,
    views: 1800,
    createTime: Date.parse("2026-02-10T00:00:00.000Z"),
  }),
  createItem({
    id: "creation-b",
    title: "Launch Video",
    type: "video",
    prompt: "video prompt",
    likes: 90,
    views: 2400,
    createTime: Date.parse("2026-02-12T00:00:00.000Z"),
  }),
  createItem({
    id: "creation-c",
    title: "Ambient Track",
    type: "music",
    prompt: "music prompt",
    likes: 60,
    views: 800,
    createTime: Date.parse("2026-02-11T00:00:00.000Z"),
  }),
];

describe("creation workspace model", () => {
  it("builds creation workspace summary", () => {
    const summary = buildCreationWorkspaceSummary(items);
    expect(summary.total).toBe(3);
    expect(summary.likes).toBe(270);
    expect(summary.views).toBe(5000);
    expect(summary.typeDistribution.image).toBe(1);
    expect(summary.typeDistribution.video).toBe(1);
    expect(summary.typeDistribution.music).toBe(1);
  });

  it("filters feed with keyword and type", () => {
    const filtered = filterCreationWorkspaceFeed(items, {
      keyword: "video",
      type: "video",
      sortBy: "new",
    });
    expect(filtered.map((item) => item.id)).toEqual(["creation-b"]);
  });

  it("builds favorites/recent/trending lanes", () => {
    const library = buildCreationWorkspaceLibrary(items, {
      favoriteCreationIds: ["creation-c", "creation-b", "unknown"],
      recentCreationIds: ["creation-a", "creation-b", "missing"],
    });

    expect(library.favorites.map((item) => item.id)).toEqual(["creation-c", "creation-b"]);
    expect(library.recent.map((item) => item.id)).toEqual(["creation-a", "creation-b"]);
    expect(library.trending[0]?.id).toBe("creation-b");
  });
});
