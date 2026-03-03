import { useEffect, useState } from "react";
import { Input } from "@sdkwork/openchat-pc-ui";
import type { SkillCategoryInfo, SkillMarketItem } from "../entities/skill.entity";
import { SkillResultService } from "../services";

interface SkillSelectorProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
}

export function SkillSelector({ selectedSkills, onSkillsChange }: SkillSelectorProps) {
  const [skills, setSkills] = useState<SkillMarketItem[]>([]);
  const [categories, setCategories] = useState<SkillCategoryInfo[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const result = await SkillResultService.getCategories();
        if (!cancelled) {
          if (!result.success || !result.data) {
            setErrorText(result.error || result.message || "Failed to load categories.");
            setCategories([{ id: "all", name: "All", icon: "ALL" }]);
            return;
          }
          setCategories(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : "Failed to load categories.");
          setCategories([{ id: "all", name: "All", icon: "ALL" }]);
        }
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const loadSkills = async () => {
        setIsLoading(true);
        setErrorText("");
        try {
          const result = await SkillResultService.getSkills(
            activeCategory === "all" ? undefined : activeCategory,
            searchKeyword.trim() || undefined,
            "popular",
          );
          if (!cancelled) {
            if (!result.success || !result.data) {
              setErrorText(result.error || result.message || "Failed to load skills.");
              setSkills([]);
              return;
            }
            setSkills(result.data);
          }
        } catch (error) {
          if (!cancelled) {
            setErrorText(error instanceof Error ? error.message : "Failed to load skills.");
            setSkills([]);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      void loadSkills();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeCategory, searchKeyword]);

  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      onSkillsChange(selectedSkills.filter((item) => item !== skillId));
      return;
    }
    onSkillsChange([...selectedSkills, skillId]);
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search skills..."
        value={searchKeyword}
        onChange={setSearchKeyword}
        allowClear
        className="w-full"
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeCategory === category.id
                ? "bg-primary text-white"
                : "border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      {errorText ? (
        <div className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">{errorText}</div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-text-muted">Loading skills...</div>
      ) : skills.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary px-3 py-6 text-center text-sm text-text-muted">
          No skill matches current filter.
        </div>
      ) : (
        <div className="grid max-h-[320px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {skills.map((skill) => {
            const selected = selectedSkills.includes(skill.id);
            return (
              <button
                key={skill.id}
                onClick={() => toggleSkill(skill.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-bg-secondary hover:border-primary/40"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-bg-tertiary text-xs font-semibold text-text-primary">
                    {skill.icon}
                  </span>
                  <span className="truncate text-sm font-medium text-text-primary">{skill.name}</span>
                </div>
                <p className="line-clamp-2 text-xs text-text-muted">{skill.description}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="border-t border-border pt-2 text-xs text-text-muted">
        Selected skills: {selectedSkills.length}
      </div>
    </div>
  );
}

export default SkillSelector;
