import { useState, useEffect } from "react";
import { ToolService } from "../services/tool.service";
import type { ToolMarketItem } from "../entities/tool.entity";
import { Input } from "@/components/ui/Input";

interface ToolSelectorProps {
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
}

export function ToolSelector({
  selectedTools,
  onToolsChange,
}: ToolSelectorProps) {
  const [tools, setTools] = useState<ToolMarketItem[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; icon: string }[]
  >([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTools();
  }, [activeCategory, searchKeyword]);

  const loadCategories = async () => {
    const data = await ToolService.getCategories();
    setCategories(data);
  };

  const loadTools = async () => {
    setIsLoading(true);
    const data = await ToolService.getTools(
      activeCategory === "all" ? undefined : activeCategory,
      searchKeyword || undefined,
    );
    setTools(data);
    setIsLoading(false);
  };

  const toggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter((t) => t !== toolId));
    } else {
      onToolsChange([...selectedTools, toolId]);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-100 text-blue-700";
      case "POST":
        return "bg-green-100 text-green-700";
      case "PUT":
        return "bg-yellow-100 text-yellow-700";
      case "DELETE":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="搜索工具..."
          value={searchKeyword}
          onChange={setSearchKeyword}
          className="flex-1"
          prefix={
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 7 0 0 7 0114 0z"
              />
            </svg>
          }
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? "bg-primary text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
          {tools.map((tool) => {
            const isSelected = selectedTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-bg-secondary hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tool.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">
                        {tool.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded ${getMethodColor(
                          tool.method,
                        )}`}
                      >
                        {tool.method}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {tool.description}
                    </p>
                  </div>
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTools.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-sm text-text-muted">
            已选择 {selectedTools.length} 个工具
          </p>
        </div>
      )}
    </div>
  );
}

export default ToolSelector;
