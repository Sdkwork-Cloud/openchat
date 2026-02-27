import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SkillService } from "../services/skill.service";
import type { SkillMarketItem } from "../entities/skill.entity";
import { SkillCard } from "../components/SkillCard";
import { Input } from "@/components/ui/Input";

export function SkillMarketPage() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillMarketItem[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; icon: string }[]
  >([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "rating" | "newest">(
    "popular",
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadSkills();
  }, [activeCategory, searchKeyword, sortBy]);

  const loadCategories = async () => {
    const data = await SkillService.getCategories();
    setCategories(data);
  };

  const loadSkills = async () => {
    setIsLoading(true);
    const data = await SkillService.getSkills(
      activeCategory === "all" ? undefined : activeCategory,
      searchKeyword || undefined,
      sortBy,
    );
    setSkills(data);
    setIsLoading(false);
  };

  const handleEnable = async (skillId: string) => {
    await SkillService.enableSkill(skillId);
    loadSkills();
  };

  const handleDisable = async (skillId: string) => {
    await SkillService.disableSkill(skillId);
    loadSkills();
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-shrink-0 px-6 py-5 border-b border-border bg-bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mr-4">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">技能市场</h1>
              <p className="text-xs text-text-muted mt-0.5">
                发现并启用各种 AI 技能
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="搜索技能..."
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
            <option value="rating">评分</option>
            <option value="newest">最新</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
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
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>暂无技能</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onEnable={handleEnable}
                onDisable={handleDisable}
                onClick={() => navigate(`/skills/${skill.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SkillMarketPage;
