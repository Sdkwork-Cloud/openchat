import { useEffect, useMemo, useState } from "react";
import { MomentsResultService } from "../services";
import type { Moment, SocialStats } from "../types";

const currentUserId = "current_user";

function formatDateTime(timestamp?: number): string {
  if (!timestamp) {
    return "-";
  }
  return new Date(timestamp).toLocaleString();
}

export function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);

  const [publishText, setPublishText] = useState("");
  const [publishLocation, setPublishLocation] = useState("");
  const [keyword, setKeyword] = useState("");

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [processingMomentId, setProcessingMomentId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const [feedRes, statsRes] = await Promise.all([
        MomentsResultService.getFeed({}, 1, 30),
        MomentsResultService.getStats(),
      ]);
      setMoments(feedRes.data?.content || []);
      setStats(statsRes.data || null);

      if (!feedRes.success || !statsRes.success) {
        setErrorText(feedRes.message || statsRes.message || "Some social data could not be loaded.");
      }
    } catch (error) {
      setMoments([]);
      setStats(null);
      setErrorText(error instanceof Error ? error.message : "Failed to load moments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const displayMoments = useMemo(() => {
    if (!keyword.trim()) {
      return moments;
    }

    const lower = keyword.toLowerCase();
    return moments.filter((item) => {
      const target = `${item.author} ${item.content} ${item.location || ""}`.toLowerCase();
      return target.includes(lower);
    });
  }, [moments, keyword]);

  useEffect(() => {
    if (displayMoments.length === 0) {
      setSelectedMomentId(null);
      return;
    }
    if (!selectedMomentId || !displayMoments.some((item) => item.id === selectedMomentId)) {
      setSelectedMomentId(displayMoments[0].id);
    }
  }, [displayMoments, selectedMomentId]);

  const selectedMoment = useMemo(
    () => displayMoments.find((item) => item.id === selectedMomentId) || null,
    [displayMoments, selectedMomentId],
  );

  const selectedInput = selectedMoment ? commentInputs[selectedMoment.id] || "" : "";

  const authorStats = useMemo(() => {
    const map = new Map<string, number>();
    moments.forEach((item) => {
      map.set(item.author, (map.get(item.author) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [moments]);

  const handlePublish = async () => {
    if (!publishText.trim()) {
      setStatusText("Please enter content before publishing.");
      return;
    }

    setIsPublishing(true);
    setStatusText("");

    try {
      const result = await MomentsResultService.publish({
        content: publishText.trim(),
        images: [],
        isPublic: true,
        location: publishLocation.trim() || undefined,
      });

      if (!result.success) {
        setStatusText(result.message || "Failed to publish moment.");
        return;
      }

      setPublishText("");
      setPublishLocation("");
      setStatusText("Moment published.");
      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to publish moment.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLike = async (id: string) => {
    setProcessingMomentId(id);
    setStatusText("");

    try {
      const result = await MomentsResultService.likeMoment(id);
      if (!result.success) {
        setStatusText(result.message || "Failed to update like state.");
        return;
      }

      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to update like state.");
    } finally {
      setProcessingMomentId(null);
    }
  };

  const handleDeleteMoment = async (id: string) => {
    setProcessingMomentId(id);
    setStatusText("");

    try {
      const result = await MomentsResultService.deleteMoment(id);
      if (!result.success) {
        setStatusText(result.message || "Failed to delete moment.");
        return;
      }

      setStatusText("Moment deleted.");
      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to delete moment.");
    } finally {
      setProcessingMomentId(null);
    }
  };

  const handleAddComment = async (momentId: string) => {
    const text = (commentInputs[momentId] || "").trim();
    if (!text) {
      setStatusText("Comment cannot be empty.");
      return;
    }

    setProcessingMomentId(momentId);
    setStatusText("");

    try {
      const result = await MomentsResultService.addComment(momentId, text);
      if (!result.success) {
        setStatusText(result.message || "Failed to add comment.");
        return;
      }

      setCommentInputs((prev) => ({ ...prev, [momentId]: "" }));
      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to add comment.");
    } finally {
      setProcessingMomentId(null);
    }
  };

  const handleDeleteComment = async (momentId: string, commentId: string) => {
    setProcessingMomentId(momentId);
    setStatusText("");

    try {
      const result = await MomentsResultService.deleteComment(momentId, commentId);
      if (!result.success) {
        setStatusText(result.message || "Failed to delete comment.");
        return;
      }

      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to delete comment.");
    } finally {
      setProcessingMomentId(null);
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Moments</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Publish updates, review activity, and manage discussion threads in one workspace.
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[560px] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold text-text-primary">Create Moment</h2>
              <textarea
                value={publishText}
                onChange={(event) => setPublishText(event.target.value)}
                placeholder="Share an update with your team"
                rows={4}
                className="mt-3 w-full rounded-lg border border-border bg-bg-tertiary p-3 text-sm text-text-primary"
              />
              <div className="mt-2 flex gap-2">
                <input
                  value={publishLocation}
                  onChange={(event) => setPublishLocation(event.target.value)}
                  placeholder="Location (optional)"
                  className="h-9 flex-1 rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                />
                <button
                  onClick={() => void handlePublish()}
                  disabled={isPublishing}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-60"
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>

            <div className="border-b border-border p-4">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search by author, content, location"
                className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                  <p className="text-text-muted">Moments</p>
                  <p className="font-semibold text-text-primary">{stats?.totalMoments ?? 0}</p>
                </div>
                <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                  <p className="text-text-muted">Likes</p>
                  <p className="font-semibold text-text-primary">{stats?.totalLikes ?? 0}</p>
                </div>
                <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                  <p className="text-text-muted">Comments</p>
                  <p className="font-semibold text-text-primary">{stats?.totalComments ?? 0}</p>
                </div>
                <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                  <p className="text-text-muted">Followers</p>
                  <p className="font-semibold text-text-primary">{stats?.followers ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-text-secondary">Loading moments...</div>
              ) : displayMoments.length === 0 ? (
                <div className="p-4 text-sm text-text-secondary">No moments found.</div>
              ) : (
                <div className="divide-y divide-border">
                  {displayMoments.map((item) => {
                    const selected = item.id === selectedMomentId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedMomentId(item.id)}
                        className={`w-full px-4 py-3 text-left ${
                          selected ? "bg-primary-soft/25" : "hover:bg-bg-hover"
                        }`}
                      >
                        <p className="line-clamp-1 text-sm font-semibold text-text-primary">{item.author}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.content}</p>
                        <p className="mt-2 text-[11px] text-text-muted">
                          {item.displayTime || formatDateTime(item.createTime)} | Likes {item.likes} | Comments {item.comments.length}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            {statusText ? <p className="border-b border-border px-4 py-2 text-sm text-text-secondary">{statusText}</p> : null}
            {errorText ? (
              <div className="mx-4 mt-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {errorText}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 p-4">
              <div className="grid h-full min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-h-0 overflow-auto rounded-lg border border-border bg-bg-primary p-4">
                  {selectedMoment ? (
                    <article className={processingMomentId === selectedMoment.id ? "opacity-70" : ""}>
                      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={selectedMoment.avatar}
                            alt={selectedMoment.author}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{selectedMoment.author}</p>
                            <p className="text-xs text-text-muted">
                              {selectedMoment.displayTime || formatDateTime(selectedMoment.createTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleLike(selectedMoment.id)}
                            className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                          >
                            {selectedMoment.hasLiked ? "Unlike" : "Like"}
                          </button>
                          {selectedMoment.authorId === currentUserId ? (
                            <button
                              onClick={() => void handleDeleteMoment(selectedMoment.id)}
                              className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </header>

                      <div className="py-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">{selectedMoment.content}</p>
                        {selectedMoment.images.length > 0 ? (
                          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                            {selectedMoment.images.map((img) => (
                              <img
                                key={`${selectedMoment.id}-${img}`}
                                src={img}
                                alt="moment"
                                className="h-28 w-full rounded-lg object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                        {selectedMoment.location ? (
                          <p className="mt-3 text-xs text-text-muted">Location: {selectedMoment.location}</p>
                        ) : null}
                      </div>

                      <section className="rounded-lg border border-border bg-bg-secondary p-3">
                        <h3 className="text-sm font-semibold text-text-primary">Comments</h3>
                        <div className="mt-2 space-y-2">
                          {selectedMoment.comments.length === 0 ? (
                            <p className="text-xs text-text-muted">No comments yet.</p>
                          ) : (
                            selectedMoment.comments.map((comment) => (
                              <div key={comment.id} className="rounded-md border border-border bg-bg-primary p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-text-primary">{comment.userName}</p>
                                  <p className="text-[11px] text-text-muted">{formatDateTime(comment.createTime)}</p>
                                </div>
                                <p className="mt-1 text-xs text-text-secondary">{comment.text}</p>
                                {comment.userId === currentUserId ? (
                                  <div className="mt-2 flex justify-end">
                                    <button
                                      onClick={() => void handleDeleteComment(selectedMoment.id, comment.id)}
                                      className="rounded border border-border bg-bg-tertiary px-1.5 py-0.5 text-[11px] text-text-secondary"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            value={selectedInput}
                            onChange={(event) =>
                              setCommentInputs((prev) => ({ ...prev, [selectedMoment.id]: event.target.value }))
                            }
                            placeholder="Write a comment"
                            className="h-8 flex-1 rounded-md border border-border bg-bg-tertiary px-2 text-xs text-text-primary"
                          />
                          <button
                            onClick={() => void handleAddComment(selectedMoment.id)}
                            className="rounded-md bg-primary px-2.5 py-1 text-xs text-white"
                          >
                            Send
                          </button>
                        </div>
                      </section>
                    </article>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-text-muted">
                      Select a moment to open details.
                    </div>
                  )}
                </div>

                <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-bg-primary p-4">
                  <h3 className="text-sm font-semibold text-text-primary">Activity Insight</h3>
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="text-text-secondary">
                      Following: <span className="font-semibold text-text-primary">{stats?.following ?? 0}</span>
                    </p>
                    <p className="text-text-secondary">
                      Followers: <span className="font-semibold text-text-primary">{stats?.followers ?? 0}</span>
                    </p>
                  </div>

                  <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Top Authors</h4>
                  <div className="mt-2 space-y-2">
                    {authorStats.length === 0 ? (
                      <p className="text-xs text-text-muted">No author distribution yet.</p>
                    ) : (
                      authorStats.map((item) => (
                        <div key={item.author} className="rounded-md border border-border bg-bg-secondary px-2.5 py-2">
                          <p className="line-clamp-1 text-xs font-medium text-text-primary">{item.author}</p>
                          <p className="mt-1 text-[11px] text-text-muted">{item.count} moments</p>
                        </div>
                      ))
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export default MomentsPage;
