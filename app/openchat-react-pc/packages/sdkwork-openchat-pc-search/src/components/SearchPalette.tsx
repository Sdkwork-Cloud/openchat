import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Clock3,
  Command,
  FileText,
  Loader2,
  Search as SearchIcon,
  Settings2,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { SearchResultService, SearchService } from "../services";
import type { SearchResultItem, SearchResultType, SearchSuggestion } from "../types";

export interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchFilterOption {
  id: SearchResultType | "all";
  label: string;
}

const FILTERS: SearchFilterOption[] = [
  { id: "all", label: "All" },
  { id: "agent", label: "Agents" },
  { id: "contact", label: "Contacts" },
  { id: "file", label: "Files" },
  { id: "command", label: "Commands" },
  { id: "setting", label: "Settings" },
];

function getResultIcon(item: SearchResultItem) {
  if (typeof item.icon === "string" && item.icon.length <= 4) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-bg-tertiary text-xs font-semibold text-text-primary">
        {item.icon}
      </span>
    );
  }

  switch (item.type) {
    case "agent":
      return <Bot className="h-4 w-4 text-primary" />;
    case "contact":
      return <UserRound className="h-4 w-4 text-primary" />;
    case "file":
    case "article":
    case "creation":
      return <FileText className="h-4 w-4 text-primary" />;
    case "command":
      return <Command className="h-4 w-4 text-primary" />;
    case "setting":
      return <Settings2 className="h-4 w-4 text-primary" />;
    default:
      return <SearchIcon className="h-4 w-4 text-primary" />;
  }
}

function getSuggestionIcon(type: SearchSuggestion["type"]) {
  switch (type) {
    case "history":
      return <Clock3 className="h-3.5 w-3.5 text-text-muted" />;
    case "trending":
      return <TrendingUp className="h-3.5 w-3.5 text-text-muted" />;
    default:
      return <SearchIcon className="h-3.5 w-3.5 text-text-muted" />;
  }
}

function resolvePath(item: SearchResultItem): string | null {
  switch (item.type) {
    case "agent":
      return `/chat?agentId=${encodeURIComponent(item.id)}&agentName=${encodeURIComponent(item.title)}`;
    case "contact":
      return `/chat?contactId=${encodeURIComponent(item.id)}&contactName=${encodeURIComponent(item.title)}`;
    case "setting":
      return "/settings";
    case "command":
      if (item.meta?.command === "settings:open") {
        return "/settings";
      }
      return "/chat";
    default:
      return null;
  }
}

export function SearchPalette({ isOpen, onClose }: SearchPaletteProps) {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchResultType | "all">("all");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<SearchSuggestion[]>([]);
  const [history, setHistory] = useState<SearchSuggestion[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorText, setErrorText] = useState("");

  const hasQuery = query.trim().length > 0;
  const showSuggestionPanel = !hasQuery;

  const groupedResults = useMemo(() => {
    if (activeFilter !== "all") {
      return [{ label: FILTERS.find((item) => item.id === activeFilter)?.label || "Results", items: results }];
    }

    const order: SearchResultType[] = ["agent", "contact", "file", "command", "setting", "chat", "article", "creation"];
    return order
      .map((type) => ({
        label: FILTERS.find((item) => item.id === type)?.label || type,
        items: results.filter((item) => item.type === type),
      }))
      .filter((group) => group.items.length > 0);
  }, [activeFilter, results]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setIsLoadingInitial(true);
    setErrorText("");

    const loadBootstrapData = async () => {
      try {
        const [historyResult, trendingResult, suggestionResult] = await Promise.all([
          SearchResultService.getHistory(),
          SearchResultService.getTrending(),
          SearchResultService.getSuggestions(""),
        ]);

        if (cancelled) {
          return;
        }

        if (!historyResult.success || !trendingResult.success || !suggestionResult.success) {
          setErrorText(
            historyResult.error ||
              historyResult.message ||
              trendingResult.error ||
              trendingResult.message ||
              suggestionResult.error ||
              suggestionResult.message ||
              "Failed to load search context.",
          );
        }

        setHistory(
          (historyResult.data || []).map((item) => ({
            id: item.id,
            text: item.query,
            type: "history",
          })),
        );
        setTrending(trendingResult.data || []);
        setSuggestions(suggestionResult.data || []);
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "Failed to load search context.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInitial(false);
        }
      }
    };

    void loadBootstrapData();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setErrorText("");

    const run = async () => {
      if (!hasQuery) {
        setResults([]);
        setIsSearching(false);
        try {
          const suggestionResult = await SearchResultService.getSuggestions("");
          if (!cancelled) {
            if (!suggestionResult.success) {
              setSuggestions([]);
              return;
            }
            setSuggestions(suggestionResult.data || []);
          }
        } catch {
          if (!cancelled) {
            setSuggestions([]);
          }
        }
        return;
      }

      setIsSearching(true);
      try {
        const [searchResult, suggestionResult] = await Promise.all([
          SearchResultService.search(query, {
            type: activeFilter,
            sortBy: "relevance",
          }),
          SearchResultService.getSuggestions(query),
        ]);

        if (cancelled) {
          return;
        }

        if (!searchResult.success || !suggestionResult.success) {
          setResults([]);
          setSuggestions([]);
          setErrorText(
            searchResult.error ||
              searchResult.message ||
              suggestionResult.error ||
              suggestionResult.message ||
              "Search failed.",
          );
          return;
        }

        const list = searchResult.data || [];
        setResults(list);
        setSuggestions(suggestionResult.data || []);
        void SearchResultService.addHistory(query, list.length);
      } catch (error) {
        if (!cancelled) {
          setResults([]);
          setErrorText(error instanceof Error ? error.message : "Search failed.");
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    timer = setTimeout(() => {
      void run();
    }, 220);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeFilter, hasQuery, isOpen, query]);

  const handleSelectResult = (item: SearchResultItem) => {
    SearchService.executeCommand(item);
    const path = resolvePath(item);
    if (path) {
      navigate(path);
    }
    onClose();
  };

  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
  };

  const handleClearHistory = async () => {
    const result = await SearchResultService.clearHistory();
    if (!result.success) {
      setErrorText(result.error || result.message || "Failed to clear search history.");
      return;
    }
    setHistory([]);
    setSuggestions((prev) => prev.filter((item) => item.type !== "history"));
  };

  const handleRemoveHistory = async (id: string) => {
    const result = await SearchResultService.removeHistoryItem(id);
    if (!result.success) {
      setErrorText(result.error || result.message || "Failed to remove search history item.");
      return;
    }
    setHistory((prev) => prev.filter((item) => item.id !== id));
    setSuggestions((prev) => prev.filter((item) => item.id !== id));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 sm:p-8" onClick={onClose}>
      <div
        className="mt-8 flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-primary shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-border bg-bg-secondary px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center rounded-xl border border-border bg-bg-tertiary px-3">
              <SearchIcon className="h-4 w-4 text-text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search agents, contacts, files, commands..."
                className="h-11 w-full bg-transparent px-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-tertiary text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const active = filter.id === activeFilter;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoadingInitial ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading search context...
            </div>
          ) : null}

          {!isLoadingInitial && errorText ? (
            <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {errorText}
            </div>
          ) : null}

          {!isLoadingInitial && showSuggestionPanel ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Recent searches</h3>
                  {history.length > 0 ? (
                    <button
                      onClick={() => {
                        void handleClearHistory();
                      }}
                      className="text-xs text-text-muted transition-colors hover:text-text-primary"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-text-muted">No recent search history.</p>
                ) : (
                  <ul className="space-y-1">
                    {history.map((item) => (
                      <li key={item.id} className="group flex items-center justify-between">
                        <button
                          onClick={() => handleSelectSuggestion(item.text)}
                          className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                        >
                          {getSuggestionIcon(item.type)}
                          <span className="truncate">{item.text}</span>
                        </button>
                        <button
                          onClick={() => {
                            void handleRemoveHistory(item.id);
                          }}
                          className="ml-2 hidden rounded p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary group-hover:inline-flex"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-border bg-bg-secondary p-4">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">Trending</h3>
                {trending.length === 0 ? (
                  <p className="text-sm text-text-muted">No trending keywords.</p>
                ) : (
                  <ul className="space-y-1">
                    {trending.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => handleSelectSuggestion(item.text)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                        >
                          {getSuggestionIcon(item.type)}
                          <span className="truncate">{item.text}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}

          {!isLoadingInitial && hasQuery ? (
            <div>
              {isSearching ? (
                <div className="flex h-28 items-center justify-center gap-2 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : null}

              {!isSearching && results.length === 0 ? (
                <div className="rounded-xl border border-border bg-bg-secondary p-6 text-sm text-text-muted">
                  No result found for "{query}".
                </div>
              ) : null}

              {!isSearching && results.length > 0 ? (
                <div className="space-y-4">
                  {groupedResults.map((group) => (
                    <section key={group.label} className="rounded-xl border border-border bg-bg-secondary p-3">
                      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {group.label}
                      </h3>
                      <ul className="space-y-1">
                        {group.items.map((item) => (
                          <li key={item.id}>
                            <button
                              onClick={() => handleSelectResult(item)}
                              className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-hover"
                            >
                              <div className="mt-0.5">{getResultIcon(item)}</div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-text-primary">{item.title}</div>
                                {item.subtitle ? (
                                  <div className="truncate text-xs text-text-tertiary">{item.subtitle}</div>
                                ) : null}
                                {item.description ? (
                                  <div className="truncate text-xs text-text-muted">{item.description}</div>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : null}

              {!isSearching && suggestions.length > 0 ? (
                <section className="mt-4 rounded-xl border border-border bg-bg-secondary p-3">
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Related suggestions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectSuggestion(item.text)}
                        className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SearchPalette;
