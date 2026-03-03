import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ToolMarketItem, ToolTestResult, UserTool } from "../entities/tool.entity";
import { ToolResultService, ToolService } from "../services";
import { buildToolWorkspaceLibrary } from "./tool.workspace.model";

interface MyToolItem {
  profile: UserTool;
  tool: ToolMarketItem;
}

export function MyToolsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MyToolItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testingToolId, setTestingToolId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [favoriteToolIds, setFavoriteToolIds] = useState<string[]>([]);
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const myToolsResult = await ToolResultService.getMyTools();
      if (!myToolsResult.success || !myToolsResult.data) {
        setItems([]);
        setErrorText(myToolsResult.error || myToolsResult.message || "Failed to load enabled tools.");
        return;
      }

      const myTools = myToolsResult.data;
      const detailList = await Promise.all(
        myTools.map(async (profile) => {
          const detailResult = await ToolResultService.getToolById(profile.toolId);
          if (!detailResult.success || !detailResult.data) {
            return null;
          }
          return { profile, tool: { ...detailResult.data, isEnabled: profile.enabled } };
        }),
      );
      setItems(detailList.filter(Boolean) as MyToolItem[]);
      setFavoriteToolIds(ToolService.getFavoriteToolIds());
      setRecentToolIds(ToolService.getRecentToolIds());
    } catch (error) {
      setItems([]);
      setErrorText(error instanceof Error ? error.message : "Failed to load enabled tools.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const enabledTools = useMemo(() => items.map((item) => item.tool), [items]);
  const toolItemMap = useMemo(() => new Map(items.map((item) => [item.tool.id, item])), [items]);
  const library = useMemo(
    () => buildToolWorkspaceLibrary(enabledTools, { favoriteToolIds, recentToolIds }),
    [enabledTools, favoriteToolIds, recentToolIds],
  );

  const totalUsage = useMemo(() => items.reduce((sum, item) => sum + item.profile.usageCount, 0), [items]);

  const filteredToolIds = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return library.enabled.map((item) => item.id);
    }

    return library.enabled
      .filter((item) => {
        const indexText = `${item.name} ${item.description} ${item.endpoint}`.toLowerCase();
        return indexText.includes(normalized);
      })
      .map((item) => item.id);
  }, [keyword, library.enabled]);

  const handleRemove = async (toolId: string) => {
    setStatusText("");
    setErrorText(null);
    try {
      const result = await ToolResultService.removeTool(toolId);
      if (!result.success) {
        setErrorText(result.error || result.message || "Failed to remove tool.");
        return;
      }
      setItems((prev) => prev.filter((item) => item.tool.id !== toolId));
      setFavoriteToolIds(ToolService.getFavoriteToolIds());
      setRecentToolIds(ToolService.getRecentToolIds());
      setStatusText("Tool removed.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to remove tool.");
    }
  };

  const handleTest = async (toolId: string) => {
    setTestingToolId(toolId);
    setStatusText("");
    setErrorText(null);
    try {
      const result = await ToolResultService.testTool(toolId);
      if (!result.success || !result.data) {
        setErrorText(result.error || result.message || "Connectivity test failed.");
      } else {
        const testResult = result.data as ToolTestResult;
        setStatusText(`Connectivity test passed in ${testResult.responseTime}ms.`);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Connectivity test failed.");
    } finally {
      setTestingToolId(null);
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
        <h1 className="text-xl font-semibold text-text-primary">My Tools</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage enabled integrations and run connectivity checks.
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Enabled tools</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{library.enabled.length}</p>
          </article>
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Total calls</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{totalUsage.toLocaleString()}</p>
          </article>
          <article className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Favorites</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{library.favorites.length}</p>
          </article>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search tool name, endpoint, or description"
            className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => navigate("/tools/api")}
            className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
          >
            Browse Tool Market
          </button>
        </div>

        {library.recent.length > 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-4">
            <h2 className="text-sm font-semibold text-text-primary">Recently Used</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {library.recent.map((tool) => (
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

        {library.favorites.length > 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-4">
            <h2 className="text-sm font-semibold text-text-primary">Favorites</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {library.favorites.map((tool) => (
                <button
                  key={`favorite-${tool.id}`}
                  onClick={() => handleOpenConfig(tool.id)}
                  className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:brightness-110"
                >
                  * {tool.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {statusText && <p className="mt-4 text-sm text-success">{statusText}</p>}
        {errorText && <p className="mt-2 text-sm text-error">{errorText}</p>}

        <div className="mt-5">
          {isLoading ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              Loading enabled tools...
            </div>
          ) : filteredToolIds.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              No enabled tool matches current query.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredToolIds.map((toolId) => {
                const item = toolItemMap.get(toolId);
                if (!item) {
                  return null;
                }

                const { profile, tool } = item;
                const favorited = favoriteToolIds.includes(tool.id);

                return (
                  <article key={tool.id} className="rounded-xl border border-border bg-bg-secondary p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-tertiary text-xl">
                          {tool.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary">{tool.name}</h3>
                          <p className="text-xs text-text-muted">
                            {tool.method} | success {(tool.successRate * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenConfig(tool.id)}
                          className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                        >
                          Configure
                        </button>
                        <button
                          onClick={() => void handleTest(tool.id)}
                          className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-60"
                          disabled={testingToolId === tool.id}
                        >
                          {testingToolId === tool.id ? "Testing..." : "Test"}
                        </button>
                        <button
                          onClick={() => handleToggleFavorite(tool.id)}
                          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                            favorited
                              ? "border-primary/40 bg-primary/10 text-primary hover:brightness-110"
                              : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                          }`}
                        >
                          {favorited ? "Favorited" : "Add favorite"}
                        </button>
                        <button
                          onClick={() => void handleRemove(tool.id)}
                          className="rounded-md bg-error px-3 py-1.5 text-xs text-white"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary md:grid-cols-4">
                      <span>Calls: {profile.usageCount}</span>
                      <span>Status: {profile.enabled ? "Enabled" : "Disabled"}</span>
                      <span>Updated: {new Date(profile.updatedAt).toLocaleDateString()}</span>
                      <span className="truncate">Endpoint: {tool.endpoint}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default MyToolsPage;
