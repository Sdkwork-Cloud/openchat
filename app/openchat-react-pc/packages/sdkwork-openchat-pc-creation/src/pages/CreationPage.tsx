import { useEffect, useMemo, useState } from "react";
import { CreationResultService, CreationService } from "../services";
import type { CreationItem, CreationStats, CreationTemplate, CreationType } from "../types";
import {
  buildCreationWorkspaceLibrary,
  buildCreationWorkspaceSummary,
  filterCreationWorkspaceFeed,
} from "./creation.workspace.model";

const typeOptions: Array<{ value: CreationType; label: string }> = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "music", label: "Music" },
  { value: "text", label: "Text" },
  { value: "3d", label: "3D" },
];

export function CreationPage() {
  const ratioOptions = CreationService.getRatios();
  const styleOptions = CreationService.getStyles();

  const [items, setItems] = useState<CreationItem[]>([]);
  const [templates, setTemplates] = useState<CreationTemplate[]>([]);
  const [stats, setStats] = useState<CreationStats | null>(null);

  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CreationType>("all");

  const [formType, setFormType] = useState<CreationType>("image");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [style, setStyle] = useState("realistic");
  const [model, setModel] = useState("Midjourney V6");

  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [favoriteCreationIds, setFavoriteCreationIds] = useState<string[]>(() =>
    CreationService.getFavoriteCreationIds(),
  );
  const [recentCreationIds, setRecentCreationIds] = useState<string[]>(() =>
    CreationService.getRecentCreationIds(),
  );

  const modelOptions = useMemo(() => CreationService.getModels(formType), [formType]);

  useEffect(() => {
    if (!modelOptions.includes(model)) {
      setModel(modelOptions[0] || "");
    }
  }, [formType, modelOptions]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const [statsRes, templatesRes] = await Promise.all([
        CreationResultService.getStats(),
        CreationResultService.getTemplates(),
      ]);

      setStats(statsRes.data || null);
      setTemplates(templatesRes.data || []);

      let list: CreationItem[] = [];
      let listSuccess = true;
      let listMessage: string | undefined;

      if (keyword.trim()) {
        const searchRes = await CreationResultService.search(keyword.trim());
        list = searchRes.data || [];
        listSuccess = searchRes.success;
        listMessage = searchRes.message;
      } else {
        const feedRes = await CreationResultService.getFeed(typeFilter === "all" ? {} : { type: typeFilter }, 1, 30);
        list = feedRes.data?.content || [];
        listSuccess = feedRes.success;
        listMessage = feedRes.message;
      }

      setItems(list);

      if (!statsRes.success || !templatesRes.success || !listSuccess) {
        setErrorText(statsRes.message || templatesRes.message || listMessage || "Some creation data could not be loaded.");
      }
    } catch (error) {
      setItems([]);
      setTemplates([]);
      setStats(null);
      setErrorText(error instanceof Error ? error.message : "Failed to load creation data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [typeFilter, keyword]);

  const workspaceItems = useMemo(
    () =>
      filterCreationWorkspaceFeed(items, {
        keyword,
        type: typeFilter,
        sortBy: "new",
      }),
    [items, keyword, typeFilter],
  );

  const workspaceSummary = useMemo(
    () => buildCreationWorkspaceSummary(workspaceItems),
    [workspaceItems],
  );

  const workspaceLibrary = useMemo(
    () =>
      buildCreationWorkspaceLibrary(items, {
        favoriteCreationIds,
        recentCreationIds,
      }),
    [items, favoriteCreationIds, recentCreationIds],
  );

  const favoriteSet = useMemo(() => new Set(favoriteCreationIds), [favoriteCreationIds]);

  const handleOpenCreation = (creationId: string) => {
    setRecentCreationIds(CreationService.markCreationOpened(creationId));
  };

  const handleToggleFavorite = (creationId: string) => {
    CreationService.toggleFavoriteCreation(creationId);
    setFavoriteCreationIds(CreationService.getFavoriteCreationIds());
  };

  const handleApplyTemplate = (template: CreationTemplate) => {
    setFormType(template.type);
    setPrompt(template.defaultPrompt);
    setNegativePrompt(template.defaultNegativePrompt || "");
    setRatio(template.defaultRatio);
    setStyle(template.defaultStyle);
    const nextModels = CreationService.getModels(template.type);
    setModel(nextModels[0] || "");
    setStatusText(`Template applied: ${template.name}`);
  };

  const handleCreate = async () => {
    if (!prompt.trim()) {
      setStatusText("Please provide a prompt.");
      return;
    }

    setIsCreating(true);
    setStatusText("");

    try {
      const result = await CreationResultService.create({
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        type: formType,
        ratio,
        style,
        model: model || undefined,
      });

      if (!result.success) {
        setStatusText(result.message || "Failed to create content.");
        return;
      }

      setPrompt("");
      setNegativePrompt("");
      setStatusText("Creation generated successfully.");
      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to create content.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleLike = async (id: string) => {
    setProcessingId(id);
    setStatusText("");

    try {
      const result = await CreationResultService.like(id);
      if (!result.success) {
        setStatusText(result.message || "Failed to like this creation.");
        return;
      }

      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to like this creation.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessingId(id);
    setStatusText("");

    try {
      const result = await CreationResultService.deleteCreation(id);
      if (!result.success) {
        setStatusText(result.message || "Failed to delete creation.");
        return;
      }

      setStatusText("Creation deleted.");
      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to delete creation.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">AI Creation</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Generate, browse, and manage image, video, music, text, and 3D content.
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Current Results</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Result Likes</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.likes}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Result Views</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.views}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {typeOptions.map((option) => (
            <span key={option.value} className="rounded-full border border-border bg-bg-secondary px-2 py-1 text-xs text-text-secondary">
              {option.label}: {workspaceSummary.typeDistribution[option.value]}
            </span>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-bg-secondary p-4">
          <h2 className="text-sm font-semibold text-text-primary">Create Content</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <select
              value={formType}
              onChange={(event) => setFormType(event.target.value as CreationType)}
              className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            >
              {typeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={ratio}
              onChange={(event) => setRatio(event.target.value)}
              className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            >
              {ratioOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            >
              {styleOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
            >
              {modelOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              onClick={() => void handleCreate()}
              disabled={isCreating}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {isCreating ? "Generating..." : "Create"}
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Enter prompt"
            rows={4}
            className="mt-3 w-full rounded-lg border border-border bg-bg-tertiary p-3 text-sm text-text-primary"
          />

          <textarea
            value={negativePrompt}
            onChange={(event) => setNegativePrompt(event.target.value)}
            placeholder="Negative prompt (optional)"
            rows={2}
            className="mt-3 w-full rounded-lg border border-border bg-bg-tertiary p-3 text-sm text-text-primary"
          />

          {statusText && <p className="mt-2 text-xs text-text-secondary">{statusText}</p>}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-text-primary">Templates</h3>
          {templates.length === 0 ? (
            <p className="mt-2 text-xs text-text-secondary">No templates available.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {templates.map((template) => (
                <article key={template.id} className="rounded-xl border border-border bg-bg-secondary p-3">
                  <img src={template.preview} alt={template.name} className="h-28 w-full rounded-lg object-cover" />
                  <p className="mt-2 text-sm font-semibold text-text-primary">{template.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">{template.description}</p>
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                  >
                    Apply Template
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by title, prompt, style, or author"
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | CreationType)}
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
          >
            <option value="all">All types</option>
            {typeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Favorites</h4>
              <span className="text-[11px] text-text-muted">{workspaceLibrary.favorites.length}</span>
            </div>
            <div className="space-y-1">
              {workspaceLibrary.favorites.slice(0, 3).map((item) => (
                <button
                  key={`favorite-${item.id}`}
                  onClick={() => handleOpenCreation(item.id)}
                  className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-left text-[11px] text-text-secondary hover:bg-bg-hover"
                >
                  {item.title}
                </button>
              ))}
              {workspaceLibrary.favorites.length === 0 ? (
                <p className="text-[11px] text-text-muted">No favorites yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Recent Opened</h4>
              <span className="text-[11px] text-text-muted">{workspaceLibrary.recent.length}</span>
            </div>
            <div className="space-y-1">
              {workspaceLibrary.recent.slice(0, 3).map((item) => (
                <button
                  key={`recent-${item.id}`}
                  onClick={() => handleOpenCreation(item.id)}
                  className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-left text-[11px] text-text-secondary hover:bg-bg-hover"
                >
                  {item.title}
                </button>
              ))}
              {workspaceLibrary.recent.length === 0 ? (
                <p className="text-[11px] text-text-muted">No recent history.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Trending</h4>
              <span className="text-[11px] text-text-muted">{workspaceLibrary.trending.length}</span>
            </div>
            <div className="space-y-1">
              {workspaceLibrary.trending.slice(0, 3).map((item) => (
                <button
                  key={`trending-${item.id}`}
                  onClick={() => handleOpenCreation(item.id)}
                  className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-left text-[11px] text-text-secondary hover:bg-bg-hover"
                >
                  {item.title}
                </button>
              ))}
              {workspaceLibrary.trending.length === 0 ? (
                <p className="text-[11px] text-text-muted">No trending items.</p>
              ) : null}
            </div>
          </div>
        </div>

        {errorText && (
          <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        )}

        <div className="mt-5">
          {isLoading ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              Loading creations...
            </div>
          ) : workspaceItems.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              No creations found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaceItems.map((item) => (
                <article
                  key={item.id}
                  onClick={() => handleOpenCreation(item.id)}
                  className={`rounded-xl border border-border bg-bg-secondary p-4 ${
                    processingId === item.id ? "opacity-70" : ""
                  } cursor-pointer`}
                >
                  <img
                    src={item.thumbnail || item.url}
                    alt={item.title}
                    className="h-44 w-full rounded-lg object-cover"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                    {favoriteSet.has(item.id) ? (
                      <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                        Fav
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.prompt}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span>{item.type}</span>
                    <span>{item.style}</span>
                    <span>{item.ratio}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                    <span>{item.author}</span>
                    <span>{item.model || "-"}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-text-muted">Likes {item.likes} | Views {item.views}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleLike(item.id);
                        }}
                        className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                      >
                        Like
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleFavorite(item.id);
                        }}
                        className={`rounded-md border px-2.5 py-1 text-xs ${
                          favoriteSet.has(item.id)
                            ? "border-warning/40 bg-warning/20 text-warning"
                            : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                        }`}
                      >
                        {favoriteSet.has(item.id) ? "Favorited" : "Favorite"}
                      </button>
                      {item.author === "Me" && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(item.id);
                          }}
                          className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CreationPage;

