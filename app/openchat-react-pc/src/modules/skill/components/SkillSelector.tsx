import { useState, useEffect } from "react";
import { SkillService } from "../services/skill.service";
import type { SkillMarketItem } from "../entities/skill.entity";
import { Input } from "@/components/ui/Input";

interface SkillSelectorProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
}

export function SkillSelector({
  selectedSkills,
  onSkillsChange,
}: SkillSelectorProps) {
  const [skills, setSkills] = useState<SkillMarketItem[]>([]);
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
    loadSkills();
  }, [activeCategory, searchKeyword]);

  const loadCategories = async () => {
    const data = await SkillService.getCategories();
    setCategories(data);
  };

  const loadSkills = async () => {
    setIsLoading(true);
    const data = await SkillService.getSkills(
      activeCategory === "all" ? undefined : activeCategory,
      searchKeyword || undefined,
    );
    setSkills(data);
    setIsLoading(false);
  };

  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      onSkillsChange(selectedSkills.filter((s) => s !== skillId));
    } else {
      onSkillsChange([...selectedSkills, skillId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="搜索技能..."
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
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
        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
          {skills.map((skill) => {
            const isSelected = selectedSkills.includes(skill.id);
            return (
              <div
                key={skill.id}
                onClick={() => toggleSkill(skill.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-bg-secondary hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{skill.icon}</span>
                  <span className="font-medium text-text-primary text-sm">
                    {skill.name}
                  </span>
                </div>
                <p className="text-xs text-text-muted line-clamp-2">
                  {skill.description}
                </p>
                {isSelected && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    已选择
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedSkills.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-sm text-text-muted">
            已选择 {selectedSkills.length} 个技能
          </p>
        </div>
      )}
    </div>
  );
}

export default SkillSelector;
