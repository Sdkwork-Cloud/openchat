import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToolService } from "../services/tool.service";
import type { ToolMarketItem } from "../entities/tool.entity";
import { ToolCard } from "../components/ToolCard";
import { Input } from "@/components/ui/Input";

export function ToolMarketPage() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<ToolMarketItem[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; icon: string }[]
  >([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "successRate" | "newest">(
    "popular",
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTools();
  }, [activeCategory, searchKeyword, sortBy]);

  const loadCategories = async () => {
    const data = await ToolService.getCategories();
    setCategories(data);
  };

  const loadTools = async () => {
    setIsLoading(true);
    const data = await ToolService.getTools(
      activeCategory === "all" ? undefined : activeCategory,
      searchKeyword || undefined,
      sortBy,
    );
    setTools(data);
    setIsLoading(false);
  };

  const handleAdd = async (toolId: string) => {
    await ToolService.addTool(toolId);
    loadTools();
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-shrink-0 px-6 py-5 border-b border-border bg-bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mr-4">
              <span className="text-xl">🔧</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                API 工具市场
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                发现并添加各种 API 工具
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="搜索工具..."
              value={searchKeyword}
              onChange={setSearchKeyword}
              className="w-64"
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-3 border-b border-border bg-bg-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? "bg-primary text-white"
                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 px-3 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary"
          >
            <option value="popular">最热</option>
            <option value="successRate">成功率</option>
            <option value="newest">最新</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tools.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted page-enter">
            <svg
              className="w-12 h-12 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p>暂无工具</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool, index) => (
              <div
                key={tool.id}
                className="stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ToolCard
                  tool={tool}
                  onAdd={handleAdd}
                  onClick={() => navigate(`/tools/configure/${tool.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolMarketPage;
