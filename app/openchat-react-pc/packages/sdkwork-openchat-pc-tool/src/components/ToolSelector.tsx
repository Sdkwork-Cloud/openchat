import { useEffect, useState } from "react";
import { Input } from "@sdkwork/openchat-pc-ui";
import type { ToolMarketItem } from "../entities/tool.entity";
import { ToolResultService } from "../services";

interface ToolSelectorProps {
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
}

interface ToolCategoryOption {
  id: string;
  name: string;
  icon: string;
}

export function ToolSelector({ selectedTools, onToolsChange }: ToolSelectorProps) {
  const [tools, setTools] = useState<ToolMarketItem[]>([]);
  const [categories, setCategories] = useState<ToolCategoryOption[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

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
          setErrorText(result.error || result.message || "Failed to load tool categories.");
          return;
        }
        setCategories(result.data);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCategories([{ id: "all", name: "All", icon: "ALL" }]);
        setErrorText(error instanceof Error ? error.message : "Failed to load tool categories.");
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
      try {
        const result = await ToolResultService.getTools(
          activeCategory === "all" ? undefined : activeCategory,
          searchKeyword.trim() || undefined,
        );
        if (cancelled) {
          return;
        }
        if (!result.success || !result.data) {
          setTools([]);
          setErrorText(result.error || result.message || "Failed to load tools.");
          return;
        }
        setTools(result.data);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setTools([]);
        setErrorText(error instanceof Error ? error.message : "Failed to load tools.");
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
  }, [activeCategory, searchKeyword]);

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter((id) => id !== toolId));
      return;
    }
    onToolsChange([...selectedTools, toolId]);
  };

  const getMethodColor = (method: string) => {
    if (method === "GET") {
      return "bg-blue-100 text-blue-700";
    }
    if (method === "POST") {
      return "bg-green-100 text-green-700";
    }
    if (method === "PUT") {
      return "bg-yellow-100 text-yellow-700";
    }
    if (method === "DELETE") {
      return "bg-red-100 text-red-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search tools..."
          value={searchKeyword}
          onChange={setSearchKeyword}
          className="flex-1"
          prefix={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              activeCategory === category.id
                ? "bg-primary text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      {errorText ? (
        <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
          {errorText}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : tools.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-secondary p-6 text-center text-sm text-text-muted">
          No tools found.
        </div>
      ) : (
        <div className="grid max-h-[300px] grid-cols-1 gap-3 overflow-y-auto">
          {tools.map((tool) => {
            const isSelected = selectedTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                className={`cursor-pointer rounded-lg border p-3 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-bg-secondary hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-secondary">{tool.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{tool.name}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs ${getMethodColor(tool.method)}`}>
                        {tool.method}
                      </span>
                    </div>
                    <p className="truncate text-xs text-text-muted">{tool.description}</p>
                  </div>
                  {isSelected ? (
                    <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      />
                    </svg>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTools.length > 0 ? (
        <div className="border-t border-border pt-2">
          <p className="text-sm text-text-muted">Selected tools: {selectedTools.length}</p>
        </div>
      ) : null}
    </div>
  );
}

export default ToolSelector;
