import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { App } from "../entities/app.entity";
import {
  AppstoreResultService,
  type AppInstallState,
  getAppInstallState,
  markAppOpened,
} from "../services";
import {
  buildPreviewTiles,
  buildReleaseNotes,
  sortSyntheticReviews,
  buildSyntheticReviews,
  resolveCapabilityPathByType,
} from "./appstore.workspace.model";

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

function formatRating(value: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(value)));
  return `${clamped}/5`;
}

type DetailTab = "overview" | "preview" | "ratings" | "release";
type ReviewSort = "newest" | "highest" | "lowest";

const tabs: Array<{ key: DetailTab; label: string; hint: string }> = [
  { key: "overview", label: "Overview", hint: "Product info" },
  { key: "preview", label: "Preview", hint: "UI walkthrough" },
  { key: "ratings", label: "Ratings", hint: "Score and feedback" },
  { key: "release", label: "Version", hint: "Release notes" },
];

const reviewSortOptions: Array<{ key: ReviewSort; label: string }> = [
  { key: "newest", label: "Newest first" },
  { key: "highest", label: "Highest rating" },
  { key: "lowest", label: "Lowest rating" },
];

export function AppStoreDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [app, setApp] = useState<App | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [selectedPreviewId, setSelectedPreviewId] = useState("");
  const [reviewSort, setReviewSort] = useState<ReviewSort>("newest");
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [installState, setInstallState] = useState<AppInstallState | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setErrorText(null);
    setStatusText(null);

    AppstoreResultService.getAppById(id)
      .then((result) => {
        if (!result.success) {
          throw new Error(result.error || "Failed to load app details.");
        }
        const data = result.data ?? null;
        if (!mounted) {
          return;
        }
        setApp(data);
        setInstallState(data ? getAppInstallState(data.id) : null);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        setErrorText(error instanceof Error ? error.message : "Failed to load app details.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const launchPath = useMemo(() => (app ? resolveCapabilityPathByType(app.type) : "/appstore"), [app]);
  const previewTiles = useMemo(() => (app ? buildPreviewTiles(app) : []), [app]);
  const releaseNotes = useMemo(() => (app ? buildReleaseNotes(app) : []), [app]);
  const reviewCards = useMemo(() => (app ? buildSyntheticReviews(app) : []), [app]);
  const sortedReviews = useMemo(() => sortSyntheticReviews(reviewCards, reviewSort), [reviewCards, reviewSort]);

  const selectedPreview = useMemo(() => {
    if (previewTiles.length === 0) {
      return null;
    }
    return previewTiles.find((item) => item.id === selectedPreviewId) || previewTiles[0];
  }, [previewTiles, selectedPreviewId]);

  const selectedPreviewIndex = useMemo(() => {
    if (!selectedPreview) {
      return -1;
    }
    return previewTiles.findIndex((item) => item.id === selectedPreview.id);
  }, [previewTiles, selectedPreview]);

  const totalVotes = useMemo(() => {
    if (!app) {
      return 0;
    }
    return app.rating.distribution.reduce((sum, value) => sum + value, 0);
  }, [app]);
  const isInstalled = Boolean(installState?.installed);

  const handleInstall = async () => {
    if (!app) {
      return;
    }

    setIsActionLoading(true);
    setErrorText(null);
    setStatusText(null);
    try {
      const result = await AppstoreResultService.installApp(app.id);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to install app.");
      }
      const next = result.data;
      setInstallState(next);
      setStatusText("Installed successfully. You can open this app now.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to install app.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUninstall = async () => {
    if (!app || !isInstalled) {
      return;
    }

    setIsActionLoading(true);
    setErrorText(null);
    setStatusText(null);
    try {
      const result = await AppstoreResultService.uninstallApp(app.id);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove app.");
      }
      setInstallState(getAppInstallState(app.id));
      setStatusText("App removed from current workspace.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to remove app.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpen = () => {
    if (!app || !isInstalled) {
      return;
    }
    const next = markAppOpened(app.id);
    setInstallState(next);
    navigate(launchPath);
  };

  useEffect(() => {
    if (previewTiles.length === 0) {
      setSelectedPreviewId("");
      return;
    }
    setSelectedPreviewId((previous) => previous || previewTiles[0]!.id);
  }, [previewTiles]);

  const handlePreviewStep = (delta: -1 | 1) => {
    if (previewTiles.length === 0 || selectedPreviewIndex < 0) {
      return;
    }
    const nextIndex = (selectedPreviewIndex + delta + previewTiles.length) % previewTiles.length;
    setSelectedPreviewId(previewTiles[nextIndex]!.id);
  };

  useEffect(() => {
    if (activeTab !== "preview" || previewTiles.length <= 1) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePreviewStep(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handlePreviewStep(1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setSelectedPreviewId(previewTiles[0]!.id);
      } else if (event.key === "End") {
        event.preventDefault();
        setSelectedPreviewId(previewTiles[previewTiles.length - 1]!.id);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeTab, previewTiles, selectedPreviewIndex]);

  if (isLoading) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          Loading app details...
        </div>
      </section>
    );
  }

  if (!app) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <Link to="/appstore" className="text-sm text-primary hover:underline">
          Back to App Store
        </Link>
        <p className="mt-4 text-sm text-text-secondary">
          {errorText || "The app does not exist or is no longer available."}
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <Link to="/appstore" className="text-sm text-primary hover:underline">
          Back to App Store
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-bg-secondary to-bg-primary p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-bg-tertiary text-4xl shadow-sm">
              {app.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">App Store</p>
              <h1 className="mt-1 truncate text-2xl font-bold text-text-primary">{app.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">{app.shortDescription}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                <span>{app.rating.average.toFixed(1)} rating</span>
                <span>{formatCompactNumber(app.downloads)} downloads</span>
                <span>{app.developer.name}</span>
                <span>{app.type}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {isInstalled ? (
                <button
                  type="button"
                  onClick={handleOpen}
                  disabled={isActionLoading}
                  className="rounded-full bg-primary px-5 py-2 text-center text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  OPEN
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void handleInstall();
                  }}
                  disabled={isActionLoading}
                  className="rounded-full bg-primary px-5 py-2 text-center text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {app.price > 0 ? `${app.currency} ${app.price.toFixed(2)}` : "GET"}
                </button>
              )}

              <div className="flex gap-2">
                {isInstalled ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleUninstall();
                    }}
                    disabled={isActionLoading}
                    className="rounded-full border border-warning/50 bg-warning/10 px-4 py-2 text-center text-xs text-warning transition-colors hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    REMOVE
                  </button>
                ) : null}
                <Link
                  to="/appstore"
                  className="rounded-full border border-border bg-bg-tertiary px-5 py-2 text-center text-xs text-text-secondary transition-colors hover:bg-bg-hover"
                >
                  Back
                </Link>
              </div>
            </div>
          </div>
        </section>

        {statusText ? (
          <div className="mt-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {statusText}
          </div>
        ) : null}

        {installState ? (
          <section className="mt-4 rounded-2xl border border-border bg-bg-secondary p-4">
            <div className="grid grid-cols-1 gap-2 text-xs text-text-secondary md:grid-cols-3">
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                Install: <span className="font-semibold text-text-primary">{isInstalled ? "Installed" : "Not installed"}</span>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                Open Count: <span className="font-semibold text-text-primary">{installState.openCount}</span>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                Last Open:
                <span className="ml-1 font-semibold text-text-primary">
                  {installState.lastOpenedAt ? formatDate(installState.lastOpenedAt) : "-"}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {tab.label}
                <span className={`ml-2 ${active ? "text-white/80" : "text-text-muted"}`}>{tab.hint}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "overview" ? (
          <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-2xl border border-border bg-bg-secondary p-5">
              <h2 className="text-lg font-semibold text-text-primary">About This App</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{app.description}</p>

              <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Core Features</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {(app.features.length > 0
                  ? app.features
                  : [{ title: "Core Experience", description: "Main workflow and setup." }]
                ).map((feature) => (
                  <div
                    key={`${feature.title}-${feature.description}`}
                    className="rounded-xl border border-border bg-bg-primary p-3"
                  >
                    <p className="text-sm font-semibold text-text-primary">{feature.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{feature.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {app.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            </article>

            <aside className="rounded-2xl border border-border bg-bg-secondary p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Information</h3>
              <div className="mt-3 space-y-2 text-sm text-text-secondary">
                <div className="rounded-lg border border-border bg-bg-primary p-3">Developer: {app.developer.name}</div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">Category: {app.category.name}</div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">Version: {app.version}</div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">Updated: {formatDate(app.updated)}</div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">Released: {formatDate(app.released)}</div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">Size: {app.size}</div>
                <div className="rounded-lg border border-border bg-bg-primary p-3">
                  Languages: {app.languages.join(", ") || "-"}
                </div>
              </div>
            </aside>
          </section>
        ) : null}

        {activeTab === "preview" ? (
          <section className="mt-5 rounded-2xl border border-border bg-bg-secondary p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Preview</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Explore key screens and workflows before installing. Use keyboard arrows for quick browsing.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePreviewStep(-1)}
                  disabled={previewTiles.length <= 1}
                  className="rounded-full border border-border bg-bg-primary px-3 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePreviewStep(1)}
                  disabled={previewTiles.length <= 1}
                  className="rounded-full border border-border bg-bg-primary px-3 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>

            {selectedPreview ? (
              <article className="mt-4 overflow-hidden rounded-3xl border border-border bg-bg-primary">
                <div
                  className="relative h-56 w-full bg-gradient-to-br from-primary/20 via-bg-secondary to-success/10 md:h-72"
                  style={
                    selectedPreview.image
                      ? {
                          backgroundImage: `url(${selectedPreview.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  {!selectedPreview.image ? (
                    <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-35">{app.icon}</div>
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Selected Preview</p>
                  <p className="mt-1 text-lg font-semibold text-text-primary">{selectedPreview.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{selectedPreview.subtitle}</p>
                </div>
              </article>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {previewTiles.map((tile, index) => {
                const active = tile.id === selectedPreview?.id;
                return (
                  <button
                    key={tile.id}
                    onClick={() => setSelectedPreviewId(tile.id)}
                    className={`overflow-hidden rounded-xl border text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-bg-primary hover:border-primary/40 hover:bg-bg-hover"
                    }`}
                  >
                    <div
                      className="h-20 w-full bg-gradient-to-br from-primary/20 via-bg-secondary to-success/10"
                      style={
                        tile.image
                          ? {
                              backgroundImage: `url(${tile.image})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    />
                    <div className="p-2">
                      <p className="text-[10px] uppercase tracking-wide text-text-muted">Screen {index + 1}</p>
                      <p className="mt-1 truncate text-xs font-medium text-text-primary">{tile.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeTab === "ratings" ? (
          <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-border bg-bg-secondary p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Average Rating</p>
              <p className="mt-2 text-4xl font-bold text-text-primary">{app.rating.average.toFixed(1)}</p>
              <p className="mt-1 text-xs text-text-muted">{formatCompactNumber(app.rating.count)} ratings</p>
            </aside>

            <article className="rounded-2xl border border-border bg-bg-secondary p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-text-primary">Rating Distribution</h2>
                <select
                  value={reviewSort}
                  onChange={(event) => setReviewSort(event.target.value as ReviewSort)}
                  className="h-9 rounded-lg border border-border bg-bg-primary px-3 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  {reviewSortOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const value = app.rating.distribution[star - 1] || 0;
                  const percent = totalVotes > 0 ? Math.round((value / totalVotes) * 100) : 0;
                  return (
                    <div key={`star-${star}`} className="flex items-center gap-3">
                      <span className="w-12 text-xs text-text-secondary">{star} stars</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-tertiary">
                        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs text-text-muted">{percent}%</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-text-primary">Recent Reviews</h3>
                <div className="mt-3 space-y-3">
                  {sortedReviews.map((review) => (
                    <article key={review.id} className="rounded-xl border border-border bg-bg-primary p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-text-primary">{review.author}</span>
                        <span className="text-xs text-warning">Rating {formatRating(review.rating)}</span>
                        <span className="text-xs text-text-muted">{formatDate(review.date)}</span>
                        <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-muted">
                          v{review.version}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-text-primary">{review.title}</p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">{review.content}</p>
                    </article>
                  ))}
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "release" ? (
          <section className="mt-5 rounded-2xl border border-border bg-bg-secondary p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-text-primary">Version {app.version}</h2>
              <span className="text-xs text-text-muted">Updated {formatDate(app.updated)}</span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              This release improves performance, user workflow continuity, and operational observability.
            </p>

            <div className="mt-4 space-y-2">
              {releaseNotes.map((note) => (
                <div key={note} className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-secondary">
                  {note}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

export default AppStoreDetailPage;
