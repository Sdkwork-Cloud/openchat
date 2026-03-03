import type { App } from "../entities/app.entity";

export type AppTypeFilter = "all" | App["type"];
export type AppStoreCatalogType = "tool" | "plugin" | "theme";

export interface AppTypeStats {
  all: number;
  agent: number;
  tool: number;
  skill: number;
  plugin: number;
  theme: number;
}

export interface AppRankingLanes {
  hot: App[];
  rating: App[];
  fresh: App[];
}

export interface AppInstallLifecycle {
  appId: string;
  installed: boolean;
  installedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
}

export interface AppInstalledLibrary {
  installed: App[];
  recent: App[];
}

export interface AppPreviewTile {
  id: string;
  title: string;
  subtitle: string;
  image?: string;
}

export interface AppSyntheticReview {
  id: string;
  author: string;
  title: string;
  content: string;
  rating: number;
  date: string;
  version: string;
}

export type AppReviewSortType = "newest" | "highest" | "lowest";

const APPSTORE_CATALOG_TYPES = new Set<AppStoreCatalogType>(["tool", "plugin", "theme"]);

function byDownloads(left: App, right: App): number {
  return right.downloads - left.downloads;
}

function byRating(left: App, right: App): number {
  return right.rating.average - left.rating.average;
}

function byReleaseDate(left: App, right: App): number {
  return new Date(right.released).getTime() - new Date(left.released).getTime();
}

function toTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function resolveCapabilityPathByType(type: App["type"]): string {
  if (type === "agent") {
    return "/agents";
  }
  if (type === "skill") {
    return "/skills";
  }
  if (type === "tool") {
    return "/tools/api";
  }
  return "/tools";
}

export function filterAppsByType(apps: App[], type: AppTypeFilter): App[] {
  if (type === "all") {
    return apps;
  }
  return apps.filter((app) => app.type === type);
}

export function filterAppStoreCatalog(apps: App[]): App[] {
  return apps.filter((app) => APPSTORE_CATALOG_TYPES.has(app.type as AppStoreCatalogType));
}

export function buildInstalledAppLibrary(
  apps: App[],
  installStateMap: Record<string, AppInstallLifecycle | undefined>,
): AppInstalledLibrary {
  const installed = apps
    .filter((app) => installStateMap[app.id]?.installed)
    .sort((left, right) => {
      const leftState = installStateMap[left.id];
      const rightState = installStateMap[right.id];

      const installedDiff =
        toTimestamp(rightState?.installedAt) - toTimestamp(leftState?.installedAt);
      if (installedDiff !== 0) {
        return installedDiff;
      }

      return (rightState?.openCount ?? 0) - (leftState?.openCount ?? 0);
    });

  const recent = installed
    .filter((app) => {
      const lifecycle = installStateMap[app.id];
      return Boolean(lifecycle?.lastOpenedAt);
    })
    .sort((left, right) => {
      const leftState = installStateMap[left.id];
      const rightState = installStateMap[right.id];

      const openedDiff =
        toTimestamp(rightState?.lastOpenedAt) - toTimestamp(leftState?.lastOpenedAt);
      if (openedDiff !== 0) {
        return openedDiff;
      }

      return (rightState?.openCount ?? 0) - (leftState?.openCount ?? 0);
    });

  return {
    installed,
    recent,
  };
}

export function buildRankingLanes(apps: App[]): AppRankingLanes {
  return {
    hot: [...apps].sort(byDownloads).slice(0, 6),
    rating: [...apps].sort(byRating).slice(0, 6),
    fresh: [...apps].sort(byReleaseDate).slice(0, 6),
  };
}

export function buildPreviewTiles(app: App): AppPreviewTile[] {
  if (app.screenshots.length > 0) {
    return app.screenshots.slice(0, 8).map((shot) => ({
      id: shot.id,
      title: `${app.name} ${shot.type}`,
      subtitle: `Preview ${shot.type}`,
      image: shot.thumbnail || shot.url,
    }));
  }

  const featureTiles = app.features.slice(0, 8).map((feature, index) => ({
    id: `feature-${index + 1}`,
    title: feature.title,
    subtitle: feature.description,
  }));

  if (featureTiles.length > 0) {
    return featureTiles;
  }

  return [
    { id: "default-1", title: `${app.name} Workspace`, subtitle: "Core workflow preview" },
    { id: "default-2", title: "Feature Panel", subtitle: "Quick actions and setup" },
    { id: "default-3", title: "Performance View", subtitle: "Status and metrics" },
  ];
}

export function buildReleaseNotes(app: App): string[] {
  const notes = app.features.slice(0, 6).map((feature) => `${feature.title}: ${feature.description}`);
  if (notes.length > 0) {
    return notes;
  }

  return [
    "Performance improvements and startup optimization.",
    "UI polishing for desktop layout and navigation.",
    "Stability fixes for session and data synchronization.",
  ];
}

export function buildSyntheticReviews(app: App): AppSyntheticReview[] {
  const anchors = [
    ...app.features.slice(0, 3).map((feature) => ({
      topic: feature.title,
      detail: feature.description || "Improves daily workflow consistency.",
    })),
    ...app.tags.slice(0, 3).map((tag) => ({
      topic: tag,
      detail: `${tag} capabilities are easy to discover and operate.`,
    })),
  ];

  const fallbackAnchors = [
    { topic: "Workflow", detail: "Setup and operation are straightforward for teams." },
    { topic: "Stability", detail: "Daily usage remains responsive under sustained load." },
    { topic: "Experience", detail: "Navigation feels predictable with clear feedback." },
  ];

  const reviewAnchors = (anchors.length > 0 ? anchors : fallbackAnchors).slice(0, 4);
  const authors = ["Alex", "Jordan", "Taylor", "Morgan"];
  const baseTime = new Date(app.updated || app.released || new Date().toISOString()).getTime();

  return reviewAnchors.map((anchor, index) => {
    const reviewDate = new Date(baseTime);
    reviewDate.setDate(reviewDate.getDate() - index * 9 - 2);
    const scoreDelta = index % 3 === 0 ? 0 : 1;
    const rating = Math.max(4, Math.min(5, Math.round(app.rating.average) - scoreDelta));

    return {
      id: `review-${app.id}-${index + 1}`,
      author: authors[index % authors.length],
      title: `Strong ${anchor.topic} execution`,
      content: anchor.detail,
      rating,
      date: reviewDate.toISOString(),
      version: app.version,
    };
  });
}

export function sortSyntheticReviews(
  reviews: AppSyntheticReview[],
  sortBy: AppReviewSortType,
): AppSyntheticReview[] {
  const list = [...reviews];

  if (sortBy === "highest") {
    return list.sort((left, right) => right.rating - left.rating);
  }

  if (sortBy === "lowest") {
    return list.sort((left, right) => left.rating - right.rating);
  }

  return list.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export function buildAppTypeStats(apps: App[]): AppTypeStats {
  return {
    all: apps.length,
    agent: apps.filter((item) => item.type === "agent").length,
    tool: apps.filter((item) => item.type === "tool").length,
    skill: apps.filter((item) => item.type === "skill").length,
    plugin: apps.filter((item) => item.type === "plugin").length,
    theme: apps.filter((item) => item.type === "theme").length,
  };
}
