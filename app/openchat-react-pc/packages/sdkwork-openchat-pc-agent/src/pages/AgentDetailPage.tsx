import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AgentChat } from "../components/AgentChat";
import { MemoryPanel } from "../components/MemoryPanel";
import type { Agent, AgentSession, AgentStats } from "../entities/agent.entity";
import { AgentResultService, AgentService } from "../services";

type DetailTab = "overview" | "chat" | "memory";

const tabs: Array<{ key: DetailTab; label: string; hint: string }> = [
  { key: "chat", label: "Live Chat", hint: "Primary workspace" },
  { key: "overview", label: "Overview", hint: "Runtime and config" },
  { key: "memory", label: "Memory", hint: "Long context" },
];

function formatPercent(value?: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function AgentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [chatSession, setChatSession] = useState<AgentSession | undefined>();
  const [activeTab, setActiveTab] = useState<DetailTab>("chat");
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionText, setActionText] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Missing agent id.");
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setIsLoading(true);
      setError(null);
      setActionText("");

      try {
        const [agentResult, statsResult, sessionsResult] = await Promise.all([
          AgentResultService.getAgent(id),
          AgentResultService.getAgentStats(id),
          AgentResultService.getAgentSessions(id),
        ]);

        if (cancelled) {
          return;
        }

        if (!agentResult.success || !statsResult.success || !sessionsResult.success || !agentResult.data) {
          setError(
            agentResult.error ||
              agentResult.message ||
              statsResult.error ||
              statsResult.message ||
              sessionsResult.error ||
              sessionsResult.message ||
              "Agent not found or service unavailable.",
          );
          setAgent(null);
          setStats(null);
          setSessions([]);
          setChatSession(undefined);
          return;
        }

        const nextAgent = agentResult.data;
        const nextStats = statsResult.data || null;
        const nextSessions = sessionsResult.data || [];
        setAgent(nextAgent);
        setStats(nextStats);
        setSessions(nextSessions);
        setChatSession(nextSessions[0]);
        AgentService.markAgentOpened(nextAgent.id);
      } catch (err) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load agent detail:", err);
        setError("Agent not found or service unavailable.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const selectedSession = useMemo(() => {
    if (!chatSession) {
      return undefined;
    }
    return sessions.find((item) => item.id === chatSession.id);
  }, [chatSession, sessions]);

  const refreshStats = async (agentId: string) => {
    const result = await AgentResultService.getAgentStats(agentId);
    if (!result.success) {
      throw new Error(result.error || result.message || "Failed to refresh agent stats.");
    }
    setStats(result.data || null);
  };

  const refreshSessions = async (agentId: string) => {
    const result = await AgentResultService.getAgentSessions(agentId);
    if (!result.success) {
      throw new Error(result.error || result.message || "Failed to refresh sessions.");
    }
    const data = result.data || [];
    setSessions(data);
    return data;
  };

  const handleCreateSession = async () => {
    if (!agent || isActionLoading) {
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionText("");

    try {
      const title = `Session ${new Date().toLocaleTimeString()}`;
      const createdResult = await AgentResultService.createSession(agent.id, { title });
      if (!createdResult.success || !createdResult.data) {
        setError(createdResult.error || createdResult.message || "Failed to create session.");
        return;
      }
      const created = createdResult.data;
      setSessions((previous) => [created, ...previous]);
      setChatSession(created);
      setActiveTab("chat");
      setActionText("New session created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetAgent = async () => {
    if (!agent || isActionLoading) {
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionText("");

    try {
      const resetResult = await AgentResultService.resetAgent(agent.id);
      if (!resetResult.success) {
        setError(resetResult.error || resetResult.message || "Failed to reset agent.");
        return;
      }
      const latestSessions = await refreshSessions(agent.id);
      await refreshStats(agent.id);
      setChatSession(latestSessions[0]);
      setActionText("Agent context has been reset.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset agent.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!agent || isActionLoading) {
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionText("");

    try {
      const latestSessions = await refreshSessions(agent.id);
      await refreshStats(agent.id);
      if (!chatSession && latestSessions.length > 0) {
        setChatSession(latestSessions[0]);
      }
      setActionText("Runtime data refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh.");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          Loading agent detail...
        </div>
      </section>
    );
  }

  if (error || !agent) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <button
          onClick={() => navigate("/agents")}
          className="w-fit rounded-full border border-border bg-bg-secondary px-4 py-2 text-xs text-text-secondary hover:bg-bg-hover"
        >
          Back to Agent Market
        </button>
        <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          {error || "Agent not found."}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/agents")}
            className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
          >
            Back to Agent Market
          </button>
          <button
            onClick={() => {
              AgentService.markAgentOpened(agent.id);
              const params = new URLSearchParams({
                agentId: agent.id,
                agentName: agent.name,
              });
              navigate(`/chat?${params.toString()}`);
            }}
            className="rounded-full bg-primary px-4 py-2 text-xs text-white transition-colors hover:brightness-110"
          >
            Open in Chat
          </button>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-text-primary">{agent.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">{agent.description || "No description available."}</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-border bg-bg-tertiary px-3 py-1 text-xs text-text-muted">
          {agent.type} / {agent.status}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-auto rounded-2xl border border-border bg-bg-secondary p-4">
          <h2 className="text-sm font-semibold text-text-primary">Runtime Panel</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">Sessions</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{stats?.totalSessions ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">Messages</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{stats?.totalMessages ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">Avg Response</p>
              <p className="mt-1 text-base font-semibold text-text-primary">
                {stats?.avgResponseTime ? `${stats.avgResponseTime} ms` : "-"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs text-text-muted">Satisfaction</p>
              <p className="mt-1 text-base font-semibold text-text-primary">{formatPercent(stats?.satisfactionRate)}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-bg-primary to-bg-primary p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Quick Start</p>
            <p className="mt-1 text-xs text-text-secondary">
              Create a session first, then chat. If runtime state looks stale, refresh stats or reset context.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              onClick={() => {
                void handleCreateSession();
              }}
              disabled={isActionLoading}
              className="rounded-md bg-primary px-3 py-2 text-sm text-white transition-colors hover:brightness-110 disabled:opacity-60"
            >
              New Session
            </button>
            <button
              onClick={() => {
                void handleRefresh();
              }}
              disabled={isActionLoading}
              className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-60"
            >
              Refresh Stats
            </button>
            <button
              onClick={() => {
                void handleResetAgent();
              }}
              disabled={isActionLoading}
              className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning transition-colors hover:bg-warning/20 disabled:opacity-60"
            >
              Reset Context
            </button>
          </div>

          {actionText ? (
            <div className="mt-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
              {actionText}
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
              {error}
            </div>
          ) : null}

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">Sessions</h3>
          <div className="mt-2 space-y-2">
            {sessions.length === 0 ? (
              <div className="rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-muted">
                No sessions yet. Create one to start chatting.
              </div>
            ) : (
              sessions.map((session) => {
                const active = selectedSession?.id === session.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      setChatSession(session);
                      setActiveTab("chat");
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{session.title || "Untitled Session"}</p>
                    <p className="mt-1 truncate text-xs opacity-80">
                      Updated at {new Date(session.updatedAt).toLocaleString()}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 ${active ? "text-white/80" : "text-text-muted"}`}>{tab.hint}</span>
                </button>
              );
            })}
            <span className="ml-auto text-xs text-text-muted">Session: {selectedSession?.title || "None selected"}</span>
          </div>

          {activeTab === "overview" ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-bg-primary p-4">
                  <h3 className="text-sm font-semibold text-text-primary">Model Parameters</h3>
                  <div className="mt-3 space-y-2 text-sm text-text-secondary">
                    <p>Model: {agent.config.llmConfig?.model || agent.config.model || "Not configured"}</p>
                    <p>Temperature: {agent.config.llmConfig?.temperature ?? agent.config.temperature ?? "-"}</p>
                    <p>Max Tokens: {agent.config.llmConfig?.maxTokens ?? agent.config.maxTokens ?? "-"}</p>
                    <p>Creator: {agent.config.creator || "OpenChat"}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-bg-primary p-4">
                  <h3 className="text-sm font-semibold text-text-primary">Tags and Capabilities</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(agent.config.tags || []).length > 0 ? (
                      (agent.config.tags || []).map((tag) => (
                        <span key={`${agent.id}-${tag}`} className="rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-tertiary">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-text-muted">No tags</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-bg-primary p-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-text-primary">Operational Metrics</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-border bg-bg-secondary p-3">
                      <p className="text-xs text-text-muted">Today</p>
                      <p className="mt-1 text-base font-semibold text-text-primary">{stats?.todayUsage ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-secondary p-3">
                      <p className="text-xs text-text-muted">This Week</p>
                      <p className="mt-1 text-base font-semibold text-text-primary">{stats?.weeklyUsage ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-secondary p-3">
                      <p className="text-xs text-text-muted">Avg Rating</p>
                      <p className="mt-1 text-base font-semibold text-text-primary">
                        {stats?.averageRating ? stats.averageRating.toFixed(1) : "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-secondary p-3">
                      <p className="text-xs text-text-muted">Favorites</p>
                      <p className="mt-1 text-base font-semibold text-text-primary">{stats?.favoriteCount ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "chat" ? (
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-bg-primary">
              <AgentChat
                agent={agent}
                session={chatSession}
                onSessionCreated={(session) => {
                  setChatSession(session);
                  setSessions((previous) => {
                    if (previous.some((item) => item.id === session.id)) {
                      return previous;
                    }
                    return [session, ...previous];
                  });
                }}
              />
            </div>
          ) : null}

          {activeTab === "memory" ? (
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-bg-primary">
              <MemoryPanel agentId={agent.id} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default AgentDetailPage;
