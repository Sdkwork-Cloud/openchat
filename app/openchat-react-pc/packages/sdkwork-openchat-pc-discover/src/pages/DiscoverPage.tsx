import { useEffect, useMemo, useState } from "react";
import { DiscoverResultService, DiscoverService } from "../services";
import type { ContentType, DiscoverBanner, DiscoverCategory, DiscoverItem } from "../types";
import {
  buildDiscoverWorkspaceLibrary,
  buildDiscoverWorkspaceSummary,
  filterDiscoverWorkspaceFeed,
} from "./discover.workspace.model";

type SortType = "hot" | "new" | "recommend";

const contentTypeOptions: Array<{ value: "all" | ContentType; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "audio", label: "Audio" },
];

const sortOptions: Array<{ value: SortType; label: string }> = [
  { value: "recommend", label: "Recommended" },
  { value: "hot", label: "Most Popular" },
  { value: "new", label: "Newest" },
];

function formatTime(timestamp?: number): string {
  if (!timestamp) {
    return "-";
  }
  return new Date(timestamp).toLocaleString();
}

function scoreOf(item: DiscoverItem): number {
  return item.reads + item.likes * 10;
}

export function DiscoverPage() {
  const [banners, setBanners] = useState<DiscoverBanner[]>([]);
  const [categories, setCategories] = useState<DiscoverCategory[]>([]);
  const [feed, setFeed] = useState<DiscoverItem[]>([]);
  const [trending, setTrending] = useState<DiscoverItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>(() =>
    DiscoverService.getFavoriteItemIds(),
  );
  const [recentItemIds, setRecentItemIds] = useState<string[]>(() =>
    DiscoverService.getRecentItemIds(),
  );

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<"all" | ContentType>("all");
  const [sortBy, setSortBy] = useState<SortType>("recommend");

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const [bannerRes, categoryRes] = await Promise.all([
          DiscoverResultService.getBanners(),
          DiscoverResultService.getCategories(),
        ]);
        if (cancelled) {
          return;
        }
        setBanners(bannerRes.data || []);
        setCategories(categoryRes.data || []);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setBanners([]);
        setCategories([]);
        setErrorText(error instanceof Error ? error.message : "Failed to load discover metadata.");
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      setIsLoading(true);
      setErrorText(null);
      try {
        if (keyword.trim()) {
          const searchRes = await DiscoverResultService.search(keyword.trim());
          if (!cancelled) {
            setFeed(searchRes.data || []);
          }
        } else {
          const feedRes = await DiscoverResultService.getFeed(
            {
              type: type === "all" ? undefined : type,
              category,
              sortBy,
            },
            1,
            30,
          );
          if (!cancelled) {
            setFeed(feedRes.data?.content || []);
          }
        }
        const trendingRes = await DiscoverResultService.getTrending();
        if (!cancelled) {
          setTrending(trendingRes.data || []);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setFeed([]);
        setTrending([]);
        setErrorText(error instanceof Error ? error.message : "Failed to load discover content.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFeed();
    return () => {
      cancelled = true;
    };
  }, [keyword, category, type, sortBy]);

  useEffect(() => {
    const merged = [...feed, ...trending];
    if (merged.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !merged.some((item) => item.id === selectedId)) {
      const nextId = merged[0].id;
      setSelectedId(nextId);
      setRecentItemIds(DiscoverService.markItemOpened(nextId));
    }
  }, [feed, trending, selectedId]);

  const mergedFeed = useMemo(() => {
    const map = new Map<string, DiscoverItem>();
    [...feed, ...trending].forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [feed, trending]);

  const workspaceFeed = useMemo(
    () =>
      filterDiscoverWorkspaceFeed(feed, {
        keyword,
        category,
        type,
        sortBy,
      }),
    [feed, keyword, category, type, sortBy],
  );

  const workspaceLibrary = useMemo(
    () =>
      buildDiscoverWorkspaceLibrary(mergedFeed, {
        favoriteItemIds,
        recentItemIds,
      }),
    [favoriteItemIds, mergedFeed, recentItemIds],
  );

  const heroBanner = useMemo(() => banners[0] || null, [banners]);
  const sideBanners = useMemo(() => banners.slice(1, 4), [banners]);

  const categoryOptions = useMemo(() => {
    const normalized = categories.filter((item) => item.id !== "all");
    return [
      { id: "all", name: "All", icon: "ALL", color: "#6b7280", count: workspaceFeed.length },
      ...normalized,
    ];
  }, [categories, workspaceFeed.length]);

  const favoriteSet = useMemo(() => new Set(favoriteItemIds), [favoriteItemIds]);

  const selectedItem = useMemo(
    () => mergedFeed.find((item) => item.id === selectedId) || null,
    [mergedFeed, selectedId],
  );

  const aggregatedStats = useMemo(() => {
    const source = workspaceFeed.length > 0 ? workspaceFeed : workspaceLibrary.trending;
    return buildDiscoverWorkspaceSummary(source);
  }, [workspaceFeed, workspaceLibrary.trending]);

  const handleSelectItem = (itemId: string) => {
    setSelectedId(itemId);
    setRecentItemIds(DiscoverService.markItemOpened(itemId));
  };

  const handleToggleFavorite = (itemId: string) => {
    DiscoverService.toggleFavoriteItem(itemId);
    setFavoriteItemIds(DiscoverService.getFavoriteItemIds());
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Discover</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Curate trends, inspect details, and keep discovery workflow in one place.
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[520px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text-primary">Categories</h2>
              <p className="mt-1 text-xs text-text-secondary">Quickly switch topic channels.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {categoryOptions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCategory(item.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      category === item.id
                        ? "border-primary bg-primary-soft/25"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-text-primary">
                      {item.icon} {item.name}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">{item.count ?? 0} items</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Favorites</h3>
                <span className="text-xs text-text-muted">{workspaceLibrary.favorites.length}</span>
              </div>
              <div className="mt-2 space-y-2">
                {workspaceLibrary.favorites.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      selectedId === item.id
                        ? "border-primary bg-primary-soft/25"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <p className="line-clamp-1 text-xs font-semibold text-text-primary">{item.title}</p>
                  </button>
                ))}
                {workspaceLibrary.favorites.length === 0 ? (
                  <p className="text-xs text-text-muted">No favorite content.</p>
                ) : null}
              </div>
            </div>

            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Recent Viewed</h3>
                <span className="text-xs text-text-muted">{workspaceLibrary.recent.length}</span>
              </div>
              <div className="mt-2 space-y-2">
                {workspaceLibrary.recent.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      selectedId === item.id
                        ? "border-primary bg-primary-soft/25"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <p className="line-clamp-1 text-xs font-semibold text-text-primary">{item.title}</p>
                  </button>
                ))}
                {workspaceLibrary.recent.length === 0 ? (
                  <p className="text-xs text-text-muted">No recent history.</p>
                ) : null}
              </div>
            </div>

            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Top Trending</h3>
                <span className="text-xs text-text-muted">{workspaceLibrary.trending.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {workspaceLibrary.trending.slice(0, 4).map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      selectedId === item.id
                        ? "border-primary bg-primary-soft/25"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <p className="line-clamp-1 text-xs font-semibold text-text-primary">
                      #{index + 1} {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">{scoreOf(item).toLocaleString()} score</p>
                  </button>
                ))}
                {workspaceLibrary.trending.length === 0 ? (
                  <p className="text-xs text-text-muted">No trending data.</p>
                ) : null}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            {heroBanner ? (
              <a href={heroBanner.link} className="relative block overflow-hidden rounded-t-xl border-b border-border">
                <div
                  className="relative h-36 p-5 md:h-44"
                  style={{ background: heroBanner.bgColor || "linear-gradient(135deg,#1f2937,#111827)" }}
                >
                  <img
                    src={heroBanner.image}
                    alt={heroBanner.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-30"
                  />
                  <div className="relative z-10 max-w-2xl">
                    <h2 className="text-base font-semibold text-white md:text-lg">{heroBanner.title}</h2>
                    <p className="mt-1 text-xs text-white/90 md:text-sm">{heroBanner.subtitle}</p>
                  </div>
                </div>
              </a>
            ) : null}

            <div className="border-b border-border p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_160px_170px_auto]">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search title, summary, tags"
                  className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                >
                  {categoryOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as "all" | ContentType)}
                  className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                >
                  {contentTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortType)}
                  className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                >
                  {sortOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setKeyword("");
                    setCategory("all");
                    setType("all");
                    setSortBy("recommend");
                  }}
                  className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                >
                  Reset
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Current Results</p>
                  <p className="text-sm font-semibold text-text-primary">{aggregatedStats.total}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Total Reads</p>
                  <p className="text-sm font-semibold text-text-primary">{aggregatedStats.reads.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-[11px] text-text-muted">Total Likes</p>
                  <p className="text-sm font-semibold text-text-primary">{aggregatedStats.likes.toLocaleString()}</p>
                </div>
              </div>

              {sideBanners.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sideBanners.map((item) => (
                    <a
                      key={item.id}
                      href={item.link}
                      className="rounded-md border border-border bg-bg-primary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            {errorText ? (
              <div className="mx-4 mt-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {errorText}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 p-4">
              <div className="grid h-full min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 overflow-auto rounded-lg border border-border bg-bg-primary">
                  {isLoading ? (
                    <div className="p-4 text-sm text-text-secondary">Loading discover feed...</div>
                  ) : workspaceFeed.length === 0 ? (
                    <div className="p-4 text-sm text-text-secondary">No content matches current filters.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {workspaceFeed.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item.id)}
                          className={`w-full px-4 py-3 text-left transition-colors ${
                            selectedId === item.id ? "bg-primary-soft/25" : "hover:bg-bg-hover"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={item.cover}
                              alt={item.title}
                              className="h-20 w-28 shrink-0 rounded-md object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="line-clamp-1 text-sm font-semibold text-text-primary">{item.title}</p>
                                {favoriteSet.has(item.id) ? (
                                  <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                    Fav
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.summary}</p>
                              <p className="mt-2 text-[11px] text-text-muted">
                                {item.source} | {item.reads.toLocaleString()} views | {item.likes.toLocaleString()} likes
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-bg-primary">
                  {selectedItem ? (
                    <>
                      <img
                        src={selectedItem.cover}
                        alt={selectedItem.title}
                        className="h-40 w-full rounded-t-lg object-cover"
                      />
                      <div className="min-h-0 flex-1 overflow-auto p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-semibold text-text-primary">{selectedItem.title}</h3>
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(selectedItem.id)}
                            className={`rounded-md border px-2 py-1 text-xs ${
                              favoriteSet.has(selectedItem.id)
                                ? "border-warning/40 bg-warning/20 text-warning"
                                : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                            }`}
                          >
                            {favoriteSet.has(selectedItem.id) ? "Favorited" : "Favorite"}
                          </button>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">{selectedItem.summary}</p>
                        <div className="mt-3 space-y-1 text-xs text-text-muted">
                          <p>Source: {selectedItem.source}</p>
                          <p>Type: {selectedItem.type}</p>
                          <p>Published: {formatTime(selectedItem.createTime)}</p>
                          <p>Score: {scoreOf(selectedItem).toLocaleString()}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedItem.tags.map((tag) => (
                            <span key={tag} className="rounded bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-secondary">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-border p-3">
                        {selectedItem.url ? (
                          <a
                            href={selectedItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-md bg-primary px-3 py-2 text-center text-sm text-white"
                          >
                            Open Original
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="block w-full cursor-not-allowed rounded-md bg-bg-tertiary px-3 py-2 text-center text-sm text-text-muted"
                          >
                            Source Link Unavailable
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-4 text-sm text-text-muted">
                      Select an item from feed or trending list.
                    </div>
                  )}
                </aside>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export default DiscoverPage;
