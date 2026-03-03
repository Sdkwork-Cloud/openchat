import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AuthConfig, AuthType, ToolMarketItem, ToolTestResult } from "../entities/tool.entity";
import { ToolResultService, ToolService } from "../services";

const defaultCredentials: AuthConfig = {
  type: "none",
  apiKey: "",
  token: "",
  username: "",
  password: "",
};

export function ToolConfigPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [tool, setTool] = useState<ToolMarketItem | null>(null);
  const [credentials, setCredentials] = useState<AuthConfig>(defaultCredentials);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [statusText, setStatusText] = useState<string>("");
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const toolId = id ?? "";
    if (!toolId) {
      return;
    }

    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      setErrorText(null);
      try {
        const [toolDetailResult, myToolsResult] = await Promise.all([
          ToolResultService.getToolById(toolId),
          ToolResultService.getMyTools(),
        ]);
        if (cancelled) {
          return;
        }

        if (!toolDetailResult.success || !myToolsResult.success) {
          setTool(null);
          setErrorText(
            toolDetailResult.error ||
              toolDetailResult.message ||
              myToolsResult.error ||
              myToolsResult.message ||
              "Failed to load tool config.",
          );
          return;
        }

        const toolDetail = toolDetailResult.data || null;
        const myTools = myToolsResult.data || [];
        setTool(toolDetail);
        setIsFavorite(ToolService.isToolFavorite(toolId));
        ToolService.markToolOpened(toolId);
        const profile = myTools.find((item) => item.toolId === toolId);
        if (profile?.credentials) {
          setCredentials({ ...defaultCredentials, ...profile.credentials });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setTool(null);
        setErrorText(error instanceof Error ? error.message : "Failed to load tool config.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAuthTypeChange = (type: AuthType) => {
    setCredentials((prev) => ({ ...prev, type }));
  };

  const ensureToolEnabled = async (toolId: string) => {
    const myToolsResult = await ToolResultService.getMyTools();
    if (!myToolsResult.success || !myToolsResult.data) {
      throw new Error(myToolsResult.error || myToolsResult.message || "Failed to load enabled tools.");
    }
    const myTools = myToolsResult.data;
    const exists = myTools.some((item) => item.toolId === toolId);
    if (!exists) {
      const addResult = await ToolResultService.addTool(toolId, credentials);
      if (!addResult.success) {
        throw new Error(addResult.error || addResult.message || "Failed to enable tool.");
      }
    }
  };

  const handleSave = async () => {
    if (!tool) {
      return;
    }
    setIsSaving(true);
    setStatusText("");
    setErrorText(null);
    try {
      await ensureToolEnabled(tool.id);
      const updateResult = await ToolResultService.updateToolCredentials(tool.id, credentials);
      if (!updateResult.success) {
        setErrorText(updateResult.error || updateResult.message || "Failed to save configuration.");
        return;
      }
      setStatusText("Configuration saved.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!tool) {
      return;
    }
    setIsTesting(true);
    setStatusText("");
    setErrorText(null);
    try {
      const result = await ToolResultService.testTool(tool.id);
      if (result.success && result.data) {
        const testResult = result.data as ToolTestResult;
        setStatusText(`Connectivity test passed in ${testResult.responseTime}ms.`);
      } else {
        setErrorText(result.error || result.message || "Connectivity test failed.");
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Connectivity test failed.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleFavorite = () => {
    if (!tool) {
      return;
    }

    const favorited = ToolService.toggleFavoriteTool(tool.id);
    setIsFavorite(favorited);
    setStatusText(favorited ? "Tool added to favorites." : "Tool removed from favorites.");
    setErrorText(null);
  };

  if (isLoading) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          Loading tool configuration...
        </div>
      </section>
    );
  }

  if (!tool) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <button
          onClick={() => navigate("/tools/api")}
          className="w-fit rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
        >
          Back to Tool Market
        </button>
        <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          {errorText || "Tool not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <button
          onClick={() => navigate("/tools/api")}
          className="mb-2 rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
        >
          Back to Tool Market
        </button>
        <h1 className="text-xl font-semibold text-text-primary">
          {tool.icon} {tool.name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{tool.description}</p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-secondary p-5 xl:col-span-2">
            <h2 className="text-sm font-semibold text-text-primary">Connection Configuration</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm text-text-secondary md:col-span-2">
                Endpoint
                <input
                  value={tool.endpoint}
                  readOnly
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-muted"
                />
              </label>
              <label className="text-sm text-text-secondary">
                Method
                <input
                  value={tool.method}
                  readOnly
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-muted"
                />
              </label>
              <label className="text-sm text-text-secondary">
                Auth Type
                <select
                  value={credentials.type}
                  onChange={(event) => handleAuthTypeChange(event.target.value as AuthType)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                >
                  <option value="none">none</option>
                  <option value="api_key">api_key</option>
                  <option value="bearer">bearer</option>
                  <option value="basic">basic</option>
                  <option value="oauth2">oauth2</option>
                </select>
              </label>

              {credentials.type === "api_key" && (
                <label className="text-sm text-text-secondary md:col-span-2">
                  API Key
                  <input
                    value={credentials.apiKey || ""}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, apiKey: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  />
                </label>
              )}

              {credentials.type === "bearer" && (
                <label className="text-sm text-text-secondary md:col-span-2">
                  Bearer Token
                  <input
                    value={credentials.token || ""}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, token: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  />
                </label>
              )}

              {credentials.type === "basic" && (
                <>
                  <label className="text-sm text-text-secondary">
                    Username
                    <input
                      value={credentials.username || ""}
                      onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                    />
                  </label>
                  <label className="text-sm text-text-secondary">
                    Password
                    <input
                      type="password"
                      value={credentials.password || ""}
                      onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="rounded-md bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Configuration"}
              </button>
              <button
                onClick={() => void handleTest()}
                disabled={isTesting}
                className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-60"
              >
                {isTesting ? "Testing..." : "Test Connectivity"}
              </button>
              <button
                onClick={handleToggleFavorite}
                className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  isFavorite
                    ? "border-primary/40 bg-primary/10 text-primary hover:brightness-110"
                    : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {isFavorite ? "Favorited" : "Add favorite"}
              </button>
            </div>

            {statusText && <p className="mt-3 text-xs text-success">{statusText}</p>}
            {errorText && <p className="mt-2 text-xs text-error">{errorText}</p>}
          </div>

          <aside className="rounded-xl border border-border bg-bg-secondary p-5">
            <h3 className="text-sm font-semibold text-text-primary">Runtime Metrics</h3>
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-border bg-bg-primary p-3">
                <p className="text-xs text-text-muted">Call count</p>
                <p className="mt-1 text-sm text-text-primary">{tool.usageCount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-3">
                <p className="text-xs text-text-muted">Success rate</p>
                <p className="mt-1 text-sm text-text-primary">{(tool.successRate * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary p-3">
                <p className="text-xs text-text-muted">Average latency</p>
                <p className="mt-1 text-sm text-text-primary">{tool.avgResponseTime}ms</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default ToolConfigPage;
