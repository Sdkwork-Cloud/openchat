import { useEffect, useMemo, useRef, useState } from "react";
import type { TerminalSession } from "../entities/terminalSession.entity";
import { TerminalResultService, terminalService } from "../services";

type SessionLogs = Record<string, string[]>;
type SessionHistories = Record<string, string[]>;

const QUICK_COMMANDS = ["help", "pwd", "ls", "date", "whoami", "clear"];

function appendLog(logs: SessionLogs, sessionId: string, line: string): SessionLogs {
  const current = logs[sessionId] || [];
  return {
    ...logs,
    [sessionId]: [...current, line],
  };
}

function appendHistory(histories: SessionHistories, sessionId: string, command: string): SessionHistories {
  const current = histories[sessionId] || [];
  if (current[current.length - 1] === command) {
    return histories;
  }
  return {
    ...histories,
    [sessionId]: [...current, command].slice(-100),
  };
}

function getWelcomeLines(session: TerminalSession, isDesktop: boolean): string[] {
  return [
    `$ session ${session.name} created (${session.id})`,
    isDesktop ? "$ desktop PTY ready" : "$ web fallback shell ready",
    "$ type 'help' to view available commands",
  ];
}

function statusTone(status: TerminalSession["status"]): string {
  switch (status) {
    case "connected":
      return "text-success";
    case "error":
      return "text-error";
    case "connecting":
      return "text-warning";
    default:
      return "text-text-muted";
  }
}

export function TerminalPage() {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [logsBySession, setLogsBySession] = useState<SessionLogs>({});
  const [historiesBySession, setHistoriesBySession] = useState<SessionHistories>({});

  const [command, setCommand] = useState("");
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const subscriptionsRef = useRef<Record<string, () => void>>({});
  const logsBottomRef = useRef<HTMLDivElement | null>(null);

  const isDesktop = terminalService.isDesktop();

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  const activeLogs = useMemo(
    () => (activeSessionId ? logsBySession[activeSessionId] || [] : []),
    [activeSessionId, logsBySession],
  );

  const activeHistory = useMemo(
    () => (activeSessionId ? historiesBySession[activeSessionId] || [] : []),
    [activeSessionId, historiesBySession],
  );

  const refreshSessions = () => {
    setSessions(terminalService.getSessions());
  };

  const attachSessionStream = (sessionId: string) => {
    if (subscriptionsRef.current[sessionId]) {
      return;
    }

    const unsubscribe = terminalService.onSessionData(sessionId, (data) => {
      const payload = data.trimEnd();
      if (payload === "__CLEAR__") {
        setLogsBySession((prev) => ({ ...prev, [sessionId]: [] }));
        return;
      }
      setLogsBySession((prev) => appendLog(prev, sessionId, payload));
    });

    subscriptionsRef.current[sessionId] = unsubscribe;
  };

  const createSession = async () => {
    setIsCreatingSession(true);
    setStatusText("");

    try {
      const sessionName = `terminal-${terminalService.getSessions().length + 1}`;
      const sessionResult = await TerminalResultService.createSession(sessionName);
      if (!sessionResult.success || !sessionResult.data) {
        setStatusText(sessionResult.error || sessionResult.message || "Failed to create session.");
        return;
      }
      const session = sessionResult.data;
      attachSessionStream(session.id);
      setLogsBySession((prev) => ({
        ...prev,
        [session.id]: prev[session.id] || getWelcomeLines(session, isDesktop),
      }));
      setHistoriesBySession((prev) => ({
        ...prev,
        [session.id]: prev[session.id] || [],
      }));
      refreshSessions();
      setActiveSessionId(session.id);
      setHistoryCursor(null);
      setStatusText("Session created.");
    } catch (error) {
      console.error("Failed to create terminal session", error);
      setStatusText("Failed to create session.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const closeSession = async (sessionId: string) => {
    setStatusText("");

    try {
      const unsubscribe = subscriptionsRef.current[sessionId];
      if (unsubscribe) {
        unsubscribe();
        delete subscriptionsRef.current[sessionId];
      }

      const closeResult = await TerminalResultService.closeSession(sessionId);
      if (!closeResult.success) {
        setStatusText(closeResult.error || closeResult.message || "Failed to close session.");
        return;
      }

      setLogsBySession((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      setHistoriesBySession((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });

      const nextSessions = terminalService.getSessions();
      setSessions(nextSessions);

      if (activeSessionId === sessionId) {
        setActiveSessionId(nextSessions[0]?.id || null);
      }

      if (nextSessions.length === 0) {
        await createSession();
      } else {
        setStatusText("Session closed.");
      }
    } catch (error) {
      console.error("Failed to close terminal session", error);
      setStatusText("Failed to close session.");
    }
  };

  const sendCommand = async (inputOverride?: string) => {
    const input = (inputOverride ?? command).trim();
    if (!input || !activeSession) {
      return;
    }

    setCommand("");
    setHistoryCursor(null);
    setStatusText("");
    setLogsBySession((prev) => appendLog(prev, activeSession.id, `$ ${input}`));
    setHistoriesBySession((prev) => appendHistory(prev, activeSession.id, input));

    try {
      const writeResult = await TerminalResultService.writeSession(activeSession.id, `${input}\n`);
      if (!writeResult.success) {
        setLogsBySession((prev) => appendLog(prev, activeSession.id, "execution failed"));
        setStatusText(writeResult.error || writeResult.message || "Failed to execute command.");
        return;
      }
      refreshSessions();
    } catch (error) {
      console.error("Failed to execute command", error);
      setLogsBySession((prev) => appendLog(prev, activeSession.id, "execution failed"));
      setStatusText("Failed to execute command.");
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function ensureInitialSession() {
      const existing = terminalService.getSessions();
      if (existing.length > 0) {
        if (!cancelled) {
          existing.forEach((session) => attachSessionStream(session.id));
          setLogsBySession((prev) => {
            const next = { ...prev };
            existing.forEach((session) => {
              if (!next[session.id]) {
                next[session.id] = getWelcomeLines(session, isDesktop);
              }
            });
            return next;
          });
          setHistoriesBySession((prev) => {
            const next = { ...prev };
            existing.forEach((session) => {
              if (!next[session.id]) {
                next[session.id] = [];
              }
            });
            return next;
          });
          setSessions(existing);
          setActiveSessionId(existing[0].id);
        }
        return;
      }

      await createSession();
    }

    void ensureInitialSession();

    return () => {
      cancelled = true;
      Object.values(subscriptionsRef.current).forEach((unsubscribe) => unsubscribe());
      subscriptionsRef.current = {};
    };
  }, []);

  useEffect(() => {
    logsBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeLogs]);

  useEffect(() => {
    setHistoryCursor(null);
    setCommand("");
  }, [activeSessionId]);

  return (
    <section className="flex h-full min-w-0 flex-1 overflow-hidden bg-bg-primary">
      <aside className="flex w-80 min-w-80 flex-col border-r border-border bg-bg-secondary">
        <div className="border-b border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-text-primary">Terminal Workspace</h1>
              <p className="mt-1 text-xs text-text-secondary">{isDesktop ? "Desktop PTY" : "Web fallback shell"}</p>
            </div>
            <button
              onClick={() => void createSession()}
              disabled={isCreatingSession}
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-60"
            >
              {isCreatingSession ? "Creating..." : "New Session"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
              <p className="text-text-muted">Sessions</p>
              <p className="font-semibold text-text-primary">{sessions.length}</p>
            </div>
            <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
              <p className="text-text-muted">Mode</p>
              <p className="font-semibold text-text-primary">{isDesktop ? "Desktop" : "Browser"}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-2">
            {sessions.map((session) => {
              const selected = activeSessionId === session.id;
              return (
                <div
                  key={session.id}
                  className={`rounded-lg border p-3 ${
                    selected ? "border-primary bg-primary-soft/20" : "border-border bg-bg-primary"
                  }`}
                >
                  <button onClick={() => setActiveSessionId(session.id)} className="w-full text-left">
                    <p className="line-clamp-1 text-sm font-semibold text-text-primary">{session.name}</p>
                    <p className={`mt-1 text-xs ${statusTone(session.status)}`}>{session.status}</p>
                    <p className="mt-1 line-clamp-1 text-[11px] text-text-muted">{session.cwd}</p>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => void closeSession(session.id)}
                      className="rounded-md border border-border bg-bg-tertiary px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 ? <p className="text-sm text-text-muted">No sessions.</p> : null}
          </div>
        </div>

        <div className="border-t border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Quick Commands</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_COMMANDS.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setCommand(item);
                  void sendCommand(item);
                }}
                disabled={!activeSession}
                className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-bg-secondary/70 px-6 py-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                {activeSession ? `${activeSession.name} (${activeSession.status})` : "No active session"}
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {activeSession ? `cwd: ${activeSession.cwd} | shell: ${activeSession.shell}` : "Create or choose a session."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!activeSessionId) {
                    return;
                  }
                  setLogsBySession((prev) => ({ ...prev, [activeSessionId]: [] }));
                }}
                disabled={!activeSessionId}
                className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-60"
              >
                Clear View
              </button>
              <button
                onClick={() => {
                  if (activeSessionId) {
                    void closeSession(activeSessionId);
                  }
                }}
                disabled={!activeSessionId}
                className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-60"
              >
                Close Session
              </button>
            </div>
          </div>
          {statusText ? <p className="mt-2 text-xs text-text-secondary">{statusText}</p> : null}
        </header>

        <div className="min-h-0 flex-1 p-6">
          <div className="h-full overflow-auto rounded-xl border border-border bg-[#05060A] p-4 font-mono text-sm text-emerald-400">
            {!activeSession ? (
              <p className="text-emerald-500/80">No active session.</p>
            ) : activeLogs.length === 0 ? (
              <p className="text-emerald-500/80">No output. Run a command to start.</p>
            ) : (
              activeLogs.map((line, index) => (
                <div key={`${line}-${index}`} className="whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))
            )}
            <div ref={logsBottomRef} />
          </div>
        </div>

        <footer className="border-t border-border bg-bg-secondary/70 p-4">
          <div className="flex items-center gap-2">
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendCommand();
                  return;
                }

                if (event.key === "ArrowUp") {
                  if (!activeSession || activeHistory.length === 0) {
                    return;
                  }
                  event.preventDefault();
                  const nextCursor = historyCursor === null ? activeHistory.length - 1 : Math.max(0, historyCursor - 1);
                  setHistoryCursor(nextCursor);
                  setCommand(activeHistory[nextCursor]);
                  return;
                }

                if (event.key === "ArrowDown") {
                  if (!activeSession || activeHistory.length === 0 || historyCursor === null) {
                    return;
                  }
                  event.preventDefault();
                  const nextCursor = Math.min(activeHistory.length, historyCursor + 1);
                  if (nextCursor === activeHistory.length) {
                    setHistoryCursor(null);
                    setCommand("");
                    return;
                  }
                  setHistoryCursor(nextCursor);
                  setCommand(activeHistory[nextCursor]);
                }
              }}
              placeholder="Enter command and press Enter"
              disabled={!activeSession}
              className="h-10 flex-1 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-60"
            />
            <button
              onClick={() => void sendCommand()}
              disabled={!activeSession}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Run
            </button>
          </div>
          <p className="mt-2 text-xs text-text-muted">History navigation: ArrowUp / ArrowDown</p>
        </footer>
      </div>
    </section>
  );
}

export default TerminalPage;
