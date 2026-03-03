import { describe, expect, it } from "vitest";
import type { App } from "../../packages/sdkwork-openchat-pc-appstore/src/entities/app.entity";
import {
  buildAppTypeStats,
  buildInstalledAppLibrary,
  buildPreviewTiles,
  buildRankingLanes,
  buildReleaseNotes,
  buildSyntheticReviews,
  filterAppStoreCatalog,
  filterAppsByType,
  resolveCapabilityPathByType,
  sortSyntheticReviews,
} from "../../packages/sdkwork-openchat-pc-appstore/src/pages/appstore.workspace.model";

function createApp(partial: Partial<App>): App {
  const category = {
    id: partial.category?.id || "tool",
    name: partial.category?.name || "Tool",
    nameEn: partial.category?.nameEn || "Tool",
    icon: partial.category?.icon || "TO",
    color: partial.category?.color || "#0ea5e9",
    appCount: partial.category?.appCount ?? 1,
  };

  return {
    id: partial.id || "app-default",
    name: partial.name || "Default App",
    nameEn: partial.nameEn || partial.name || "Default App",
    shortDescription: partial.shortDescription || "",
    description: partial.description || "",
    icon: partial.icon || "AP",
    screenshots: partial.screenshots || [],
    developer: partial.developer || {
      id: "sdkwork",
      name: "SDKWork",
      verified: true,
      appCount: 10,
      rating: 4.8,
    },
    category,
    tags: partial.tags || [],
    features: partial.features || [],
    version: partial.version || "1.0.0",
    size: partial.size || "10MB",
    downloads: partial.downloads ?? 0,
    rating: partial.rating || {
      average: 0,
      count: 0,
      distribution: [0, 0, 0, 0, 0],
    },
    price: 0,
    currency: "CNY",
    inAppPurchases: false,
    ageRating: "12+",
    languages: ["zh-CN"],
    released: partial.released || "2026-01-01",
    updated: partial.updated || "2026-02-20",
    type: partial.type || "tool",
    status: partial.status || "active",
    featured: partial.featured ?? false,
    editorChoice: partial.editorChoice ?? false,
    trending: partial.trending ?? false,
  };
}

const apps: App[] = [
  createApp({
    id: "agent-1",
    name: "Agent One",
    type: "agent",
    downloads: 18000,
    rating: { average: 4.8, count: 500, distribution: [2, 4, 18, 120, 356] },
    released: "2026-02-01",
  }),
  createApp({
    id: "tool-1",
    name: "Tool One",
    type: "tool",
    downloads: 12000,
    rating: { average: 4.6, count: 300, distribution: [3, 7, 20, 100, 170] },
    released: "2026-02-15",
  }),
  createApp({
    id: "skill-1",
    name: "Skill One",
    type: "skill",
    downloads: 9000,
    rating: { average: 4.9, count: 250, distribution: [1, 2, 12, 70, 165] },
    released: "2026-02-18",
  }),
];

describe("appstore workspace model", () => {
  it("filters apps by type", () => {
    const filtered = filterAppsByType(apps, "agent");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("agent-1");
  });

  it("keeps app store catalog separate from module catalogs", () => {
    const filtered = filterAppStoreCatalog(apps);
    expect(filtered.map((item) => item.id)).toEqual(["tool-1"]);
  });

  it("builds ranking lanes", () => {
    const lanes = buildRankingLanes(apps);
    expect(lanes.hot.map((item) => item.id)).toEqual(["agent-1", "tool-1", "skill-1"]);
    expect(lanes.rating[0]?.id).toBe("skill-1");
    expect(lanes.fresh[0]?.id).toBe("skill-1");
  });

  it("builds stats by app type", () => {
    const stats = buildAppTypeStats(apps);
    expect(stats.all).toBe(3);
    expect(stats.agent).toBe(1);
    expect(stats.tool).toBe(1);
    expect(stats.skill).toBe(1);
  });

  it("builds preview tiles with screenshots first", () => {
    const target = createApp({
      id: "tool-preview",
      screenshots: [{ id: "shot-1", url: "https://example.com/shot-1.png", type: "desktop" }],
    });
    const tiles = buildPreviewTiles(target);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]?.id).toBe("shot-1");
    expect(tiles[0]?.image).toBe("https://example.com/shot-1.png");
  });

  it("builds release notes from feature list", () => {
    const target = createApp({
      id: "tool-release",
      features: [
        { title: "Sync", description: "Keeps local workspace and server state aligned." },
        { title: "Shortcuts", description: "Adds keyboard navigation for key actions." },
      ],
    });
    const notes = buildReleaseNotes(target);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toContain("Sync");
  });

  it("builds synthetic review cards for rating tab", () => {
    const target = createApp({
      id: "tool-review",
      tags: ["automation", "insights"],
      features: [{ title: "Dashboard", description: "Highlights run health and issue trends." }],
      rating: { average: 4.7, count: 1200, distribution: [20, 40, 80, 340, 720] },
    });
    const reviews = buildSyntheticReviews(target);
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0]?.id).toContain("tool-review");
    expect(reviews.every((item) => item.rating >= 4 && item.rating <= 5)).toBe(true);
  });

  it("sorts synthetic reviews by strategy", () => {
    const reviews = [
      {
        id: "r-1",
        author: "A",
        title: "Newest mid",
        content: "",
        rating: 4,
        date: "2026-02-11T00:00:00.000Z",
        version: "1.0.0",
      },
      {
        id: "r-2",
        author: "B",
        title: "Oldest high",
        content: "",
        rating: 5,
        date: "2026-01-02T00:00:00.000Z",
        version: "1.0.0",
      },
      {
        id: "r-3",
        author: "C",
        title: "Newest low",
        content: "",
        rating: 3,
        date: "2026-03-01T00:00:00.000Z",
        version: "1.0.0",
      },
    ];

    expect(sortSyntheticReviews(reviews, "newest").map((item) => item.id)).toEqual(["r-3", "r-1", "r-2"]);
    expect(sortSyntheticReviews(reviews, "highest").map((item) => item.id)).toEqual(["r-2", "r-1", "r-3"]);
    expect(sortSyntheticReviews(reviews, "lowest").map((item) => item.id)).toEqual(["r-3", "r-1", "r-2"]);
  });

  it("resolves capability path", () => {
    expect(resolveCapabilityPathByType("agent")).toBe("/agents");
    expect(resolveCapabilityPathByType("skill")).toBe("/skills");
    expect(resolveCapabilityPathByType("plugin")).toBe("/tools");
  });

  it("builds installed library and recent-opened lanes", () => {
    const catalog = [
      createApp({
        id: "tool-clip",
        type: "tool",
        released: "2026-02-01",
      }),
      createApp({
        id: "plugin-flow-runtime",
        type: "plugin",
        released: "2026-01-20",
      }),
      createApp({
        id: "theme-midnight-pro",
        type: "theme",
        released: "2026-01-10",
      }),
    ];

    const installStateMap = {
      "tool-clip": {
        appId: "tool-clip",
        installed: true,
        installedAt: "2026-02-20T00:00:00.000Z",
        lastOpenedAt: "2026-02-25T00:00:00.000Z",
        openCount: 3,
      },
      "plugin-flow-runtime": {
        appId: "plugin-flow-runtime",
        installed: true,
        installedAt: "2026-02-28T00:00:00.000Z",
        lastOpenedAt: null,
        openCount: 0,
      },
      "theme-midnight-pro": {
        appId: "theme-midnight-pro",
        installed: false,
        installedAt: null,
        lastOpenedAt: null,
        openCount: 0,
      },
    };

    const library = buildInstalledAppLibrary(catalog, installStateMap);

    expect(library.installed.map((item) => item.id)).toEqual([
      "plugin-flow-runtime",
      "tool-clip",
    ]);
    expect(library.recent.map((item) => item.id)).toEqual(["tool-clip"]);
  });
});
