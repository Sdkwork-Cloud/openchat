import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToolCard } from "../components/ToolCard";
import type { ToolCategoryInfo, ToolMarketItem } from "../entities/tool.entity";
import { ToolResultService, ToolService } from "../services";
import { buildToolWorkspaceLibrary, buildToolWorkspaceSummary } from "./tool.workspace.model";

type ToolSortType = "popular" | "successRate" | "newest";

export function ToolMarketPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ToolCategoryInfo[]>([]);
  const [tools, setTools] = useState<ToolMarketItem[]>([]);
  const [category, setCategory] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<ToolSortType>("popular");
  const [isLoading, setIsLoading] = useState(false);
  const [processingToolId, setProcessingToolId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [favoriteToolIds, setFavoriteToolIds] = useState<string[]>([]);
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const result = await ToolResultService.getCategories();
        if (cancelled) {
          return;
        }
        if (!result.success || !result.data) {
          setCategories([{ id: "all", name: "All", icon: "ALL" }]);
          setErrorText(result.error || result.message || "Failed to load categories.");
          return;
        }
        setCategories(result.data);
        setFavoriteToolIds(ToolService.getFavoriteToolIds());
        setRecentToolIds(ToolService.getRecentToolIds());
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCategories([{ id: "all", name: "All", icon: "ALL" }]);
        setErrorText(error instanceof Error ? error.message : "Failed to load categories.");
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTools() {
      setIsLoading(true);
      setErrorText(null);
      setStatusText("");
      try {
        const result = await ToolResultService.getTools(
          category === "all" ? undefined : category,
          keyword.trim() || undefined,
          sortBy,
        );
        if (cancelled) {
          return;
        }
        if (!result.success || !result.data) {
          setTools([]);
          setErrorText(result.error || result.message || "Failed to load tool market.");
          return;
        }
        setTools(result.data);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setTools([]);
        setErrorText(error instanceof Error ? error.message : "Failed to load tool market.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTools();

    return () => {
      cancelled = true;
    };
  }, [category, keyword, sortBy]);

  const emptyText = useMemo(() => {
    if (keyword.trim()) {
      return "No tools match current search keyword.";
    }
    return "No tools available in this category.";
  }, [keyword]);

  const summary = useMemo(() => buildToolWorkspaceSummary(tools), [tools]);
  const library = useMemo(
    () => buildToolWorkspaceLibrary(tools, { favoriteToolIds, recentToolIds }),
    [tools, favoriteToolIds, recentToolIds],
  );
  const favoriteToolIdSet = useMemo(
    () => new Set(library.favorites.map((item) => item.id)),
    [library.favorites],
  );
  const recentVisibleTools = useMemo(() => library.recent.slice(0, 6), [library.recent]);

  const handleAdd = async (toolId: string) => {
    setProcessingToolId(toolId);
    setErrorText(null);
    setStatusText("");
    try {
      const result = await ToolResultService.addTool(toolId);
      if (!result.success) {
        setErrorText(result.error || result.message || "Failed to enable tool.");
        return;
      }
      setTools((prev) => prev.map((item) => (item.id === toolId ? { ...item, isEnabled: true } : item)));
      setStatusText("Tool enabled. Open configuration workspace to complete credentials setup.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to enable tool.");
    } finally {
      setProcessingToolId(null);
    }
  };

  const handleOpenConfig = (toolId: string) => {
    const next = ToolService.markToolOpened(toolId);
    setRecentToolIds(next);
    navigate(`/tools/configure/${toolId}`);
  };

  const handleToggleFavorite = (toolId: string) => {
    const favorited = ToolService.toggleFavoriteTool(toolId);
    setFavoriteToolIds(ToolService.getFavoriteToolIds());
    setStatusText(favorited ? "Tool added to favorites." : "Tool removed from favorites.");
    setErrorText(null);
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Tool Market</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Browse available integration tools and enable them for your workspace.
            </p>
          </div>
          <button
            onClick={() => navigate("/tools/my")}
            className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
          >
            My Tools
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Catalog tools</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{summary.total}</p>
          </article>
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Enabled in workspace</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{summary.enabled}</p>
          </article>
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Favorites</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{library.favorites.length}</p>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_180px]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by tool name or description"
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.icon} {item.name}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as ToolSortType)}
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="popular">Sort by popularity</option>
            <option value="successRate">Sort by success rate</option>
            <option value="newest">Sort by newest</option>
          </select>
        </div>

        {errorText ? (
          <div className="mt-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        ) : null}

        {statusText ? (
          <div className="mt-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {statusText}
          </div>
        ) : null}

        {recentVisibleTools.length > 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-4">
            <h2 className="text-sm font-semibold text-text-primary">Recently Used</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {recentVisibleTools.map((tool) => (
                <button
                  key={`recent-${tool.id}`}
                  onClick={() => handleOpenConfig(tool.id)}
                  className="rounded-full border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
                >
                  {tool.icon} {tool.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          {isLoading ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              Loading tool market...
            </div>
          ) : tools.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => (
                <div key={tool.id} className={processingToolId === tool.id ? "space-y-2 opacity-70" : "space-y-2"}>
                  <ToolCard
                    tool={tool}
                    onAdd={handleAdd}
                    onClick={() => handleOpenConfig(tool.id)}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenConfig(tool.id)}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
                    >
                      Open config
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(tool.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        favoriteToolIdSet.has(tool.id)
                          ? "border-primary/40 bg-primary/10 text-primary hover:brightness-110"
                          : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                      }`}
                    >
                      {favoriteToolIdSet.has(tool.id) ? "Favorited" : "Add favorite"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ToolMarketPage;
