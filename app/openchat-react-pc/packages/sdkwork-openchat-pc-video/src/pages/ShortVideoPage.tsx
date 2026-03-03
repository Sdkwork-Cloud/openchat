import { useEffect, useMemo, useState } from "react";
import { VideoResultService, VideoService } from "../services";
import type { Video, VideoComment, VideoStats, VideoType } from "../types";
import {
  buildVideoWorkspaceLibrary,
  buildVideoWorkspaceSummary,
  filterVideoWorkspaceFeed,
} from "./video.workspace.model";

const typeOptions: Array<{ value: "all" | VideoType; label: string }> = [
  { value: "all", label: "All" },
  { value: "neural", label: "Neural" },
  { value: "matrix", label: "Matrix" },
  { value: "aurora", label: "Aurora" },
  { value: "cyber", label: "Cyber" },
  { value: "nature", label: "Nature" },
];

const distributionTypeOptions: Array<{ value: VideoType; label: string }> = typeOptions
  .filter((item): item is { value: VideoType; label: string } => item.value !== "all")
  .map((item) => ({ value: item.value, label: item.label }));

const sortOptions: Array<{ value: "popular" | "new" | "duration"; label: string }> = [
  { value: "popular", label: "Most Popular" },
  { value: "new", label: "Newest" },
  { value: "duration", label: "Longest" },
];

export function ShortVideoPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);

  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | VideoType>("all");
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "new" | "duration">("popular");

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const [favoriteVideoIds, setFavoriteVideoIds] = useState<string[]>(() => VideoService.getFavoriteVideoIds());
  const [recentVideoIds, setRecentVideoIds] = useState<string[]>(() => VideoService.getRecentVideoIds());

  const loadVideos = async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const [videosRes, statsRes] = await Promise.all([
        VideoResultService.getVideos(
          {
            type: typeFilter === "all" ? undefined : typeFilter,
            search: keyword.trim() || undefined,
          },
          1,
          30,
        ),
        VideoResultService.getStats(),
      ]);

      const list = videosRes.data?.content || [];
      setVideos(list);
      setStats(statsRes.data || null);

      if (!videosRes.success || !statsRes.success) {
        setErrorText(videosRes.message || statsRes.message || "Some video data could not be loaded.");
      }
    } catch (error) {
      setVideos([]);
      setStats(null);
      setSelectedVideoId("");
      setErrorText(error instanceof Error ? error.message : "Failed to load videos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVideos();
  }, [typeFilter, keyword]);

  const workspaceVideos = useMemo(
    () =>
      filterVideoWorkspaceFeed(videos, {
        keyword,
        type: typeFilter,
        sortBy,
      }),
    [keyword, sortBy, typeFilter, videos],
  );

  const workspaceSummary = useMemo(() => buildVideoWorkspaceSummary(workspaceVideos), [workspaceVideos]);

  const workspaceLibrary = useMemo(
    () =>
      buildVideoWorkspaceLibrary(videos, {
        favoriteVideoIds,
        recentVideoIds,
      }),
    [favoriteVideoIds, recentVideoIds, videos],
  );

  const favoriteSet = useMemo(() => new Set(favoriteVideoIds), [favoriteVideoIds]);

  useEffect(() => {
    setSelectedVideoId((prev) => {
      if (workspaceVideos.length === 0) {
        return "";
      }
      if (prev && workspaceVideos.some((item) => item.id === prev)) {
        return prev;
      }
      return workspaceVideos[0].id;
    });
  }, [workspaceVideos]);

  const selectedVideo = useMemo(
    () => workspaceVideos.find((item) => item.id === selectedVideoId) || null,
    [workspaceVideos, selectedVideoId],
  );

  useEffect(() => {
    if (!selectedVideoId) {
      setComments([]);
      return;
    }

    let cancelled = false;

    async function loadComments(videoId: string) {
      try {
        await VideoResultService.incrementViews(videoId);
        const commentsRes = await VideoResultService.getComments(videoId);
        if (!cancelled) {
          setComments(commentsRes.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setComments([]);
          setStatusText(error instanceof Error ? error.message : "Failed to load comments.");
        }
      }
    }

    void loadComments(selectedVideoId);

    return () => {
      cancelled = true;
    };
  }, [selectedVideoId]);

  const handleOpenVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    setRecentVideoIds(VideoService.markVideoOpened(videoId));
  };

  const handleToggleFavorite = (videoId: string) => {
    VideoService.toggleFavoriteVideo(videoId);
    setFavoriteVideoIds(VideoService.getFavoriteVideoIds());
  };

  const handleToggleLike = async () => {
    if (!selectedVideo) {
      return;
    }

    setStatusText("");
    try {
      const result = await VideoResultService.toggleLike(selectedVideo.id);
      if (!result.success) {
        setStatusText(result.message || "Failed to update like state.");
        return;
      }
      await loadVideos();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to update like state.");
    }
  };

  const handleToggleCollect = async () => {
    if (!selectedVideo) {
      return;
    }

    setStatusText("");
    try {
      const result = await VideoResultService.toggleCollect(selectedVideo.id);
      if (!result.success) {
        setStatusText(result.message || "Failed to update collection state.");
        return;
      }
      await loadVideos();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to update collection state.");
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Short Video</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Explore AI-generated short videos and interact with creators.
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Current Results</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Views</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{VideoService.formatCount(workspaceSummary.views)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Likes</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{VideoService.formatCount(workspaceSummary.likes)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Avg Duration</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{VideoService.formatDuration(workspaceSummary.avgDuration)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {distributionTypeOptions.map((item) => (
            <span key={item.value} className="rounded-full border border-border bg-bg-secondary px-2 py-1 text-xs text-text-secondary">
              {item.label}: {workspaceSummary.typeDistribution[item.value]}
            </span>
          ))}
        </div>

        <div className="mt-4 grid h-[calc(100%-140px)] grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
          <aside className="flex h-full flex-col rounded-xl border border-border bg-bg-secondary p-4">
            <div className="grid grid-cols-1 gap-2">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search videos"
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "all" | VideoType)}
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              >
                {typeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "popular" | "new" | "duration")}
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              >
                {sortOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-bg-primary p-2 text-text-secondary">
                Videos {stats?.totalVideos ?? 0}
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-2 text-text-secondary">
                Views {stats ? VideoService.formatCount(stats.totalViews) : 0}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-[11px]">
              <div className="rounded-lg border border-border bg-bg-primary p-2">
                <p className="mb-1 font-semibold uppercase tracking-wide text-text-muted">Favorites</p>
                {workspaceLibrary.favorites.slice(0, 2).map((item) => (
                  <button
                    key={`favorite-${item.id}`}
                    onClick={() => handleOpenVideo(item.id)}
                    className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                  >
                    {item.title}
                  </button>
                ))}
                {workspaceLibrary.favorites.length === 0 ? <p className="text-text-muted">No favorites yet.</p> : null}
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-2">
                <p className="mb-1 font-semibold uppercase tracking-wide text-text-muted">Recent</p>
                {workspaceLibrary.recent.slice(0, 2).map((item) => (
                  <button
                    key={`recent-${item.id}`}
                    onClick={() => handleOpenVideo(item.id)}
                    className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                  >
                    {item.title}
                  </button>
                ))}
                {workspaceLibrary.recent.length === 0 ? <p className="text-text-muted">No recent history.</p> : null}
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-2">
                <p className="mb-1 font-semibold uppercase tracking-wide text-text-muted">Trending</p>
                {workspaceLibrary.trending.slice(0, 2).map((item) => (
                  <button
                    key={`trending-${item.id}`}
                    onClick={() => handleOpenVideo(item.id)}
                    className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                  >
                    {item.title}
                  </button>
                ))}
                {workspaceLibrary.trending.length === 0 ? <p className="text-text-muted">No trending videos.</p> : null}
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-2 overflow-auto">
              {isLoading ? (
                <p className="text-sm text-text-secondary">Loading videos...</p>
              ) : workspaceVideos.length === 0 ? (
                <p className="text-sm text-text-secondary">No videos found.</p>
              ) : (
                workspaceVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => handleOpenVideo(video.id)}
                    className={`w-full rounded-lg border p-2 text-left ${
                      selectedVideoId === video.id
                        ? "border-primary bg-primary-soft/20"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <div className="flex gap-2">
                      <img src={video.thumbnail} alt={video.title} className="h-16 w-12 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-xs font-semibold text-text-primary">{video.title}</p>
                          {favoriteSet.has(video.id) ? (
                            <span className="rounded bg-warning/20 px-1 py-0.5 text-[10px] font-semibold text-warning">
                              Fav
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11px] text-text-muted">
                          {video.author} | {VideoService.formatDuration(video.duration)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-bg-secondary p-4">
            {!selectedVideo ? (
              <div className="rounded-lg border border-border bg-bg-primary p-5 text-sm text-text-secondary">
                Select a video from the left panel.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
                  <img
                    src={selectedVideo.thumbnail}
                    alt={selectedVideo.title}
                    className="h-[360px] w-full rounded-xl object-cover"
                  />

                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">{selectedVideo.title}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{selectedVideo.description}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedVideo.tags.map((tag) => (
                        <span
                          key={`${selectedVideo.id}-${tag}`}
                          className="rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-secondary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span>Views {VideoService.formatCount(selectedVideo.views)}</span>
                      <span>Likes {VideoService.formatCount(selectedVideo.likes)}</span>
                      <span>Comments {VideoService.formatCount(selectedVideo.comments)}</span>
                      <span>Shares {VideoService.formatCount(selectedVideo.shares)}</span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => void handleToggleLike()}
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                      >
                        {selectedVideo.hasLiked ? "Unlike" : "Like"}
                      </button>
                      <button
                        onClick={() => void handleToggleCollect()}
                        className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                      >
                        {selectedVideo.hasCollected ? "Collected" : "Collect"}
                      </button>
                      <button
                        onClick={() => handleToggleFavorite(selectedVideo.id)}
                        className={`rounded-md border px-3 py-1.5 text-xs ${
                          favoriteSet.has(selectedVideo.id)
                            ? "border-warning/40 bg-warning/20 text-warning"
                            : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                        }`}
                      >
                        {favoriteSet.has(selectedVideo.id) ? "Favorited" : "Favorite"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex-1 overflow-auto rounded-lg border border-border bg-bg-primary p-3">
                  <h3 className="text-sm font-semibold text-text-primary">Comments</h3>
                  <div className="mt-2 space-y-2">
                    {comments.length === 0 ? (
                      <p className="text-xs text-text-secondary">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="rounded-md border border-border bg-bg-secondary p-2">
                          <p className="text-xs font-semibold text-text-primary">{comment.userName}</p>
                          <p className="mt-1 text-xs text-text-secondary">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {statusText && <p className="mt-3 text-sm text-text-secondary">{statusText}</p>}
        {errorText && (
          <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        )}
      </div>
    </section>
  );
}

export default ShortVideoPage;
