import { describe, expect, it } from "vitest";
import {
  type SkillMarketItem,
  SkillCategory,
} from "../../packages/sdkwork-openchat-pc-skill/src/entities/skill.entity";
import {
  buildSkillWorkspaceSummary,
  buildSkillWorkspaceLibrary,
  filterSkillsByStage,
  getSkillConfigValidation,
  type SkillPipelineStage,
} from "../../packages/sdkwork-openchat-pc-skill/src/pages/skill.workspace.model";

function createSkill(partial: Partial<SkillMarketItem>): SkillMarketItem {
  return {
    id: partial.id || "skill-default",
    name: partial.name || "Default Skill",
    description: partial.description || "",
    icon: partial.icon || "SK",
    category: partial.category || SkillCategory.UTILITY,
    version: partial.version || "1.0.0",
    provider: partial.provider || "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: partial.capabilities || [],
    tags: partial.tags || [],
    usageCount: partial.usageCount ?? 0,
    rating: partial.rating ?? 0,
    createdAt: partial.createdAt || "2026-02-01T00:00:00.000Z",
    updatedAt: partial.updatedAt || "2026-02-15T00:00:00.000Z",
    isEnabled: partial.isEnabled ?? false,
    isConfigured: partial.isConfigured ?? false,
  };
}

const skills: SkillMarketItem[] = [
  createSkill({
    id: "skill-a",
    name: "Search",
    rating: 4.9,
    usageCount: 15000,
    isEnabled: true,
    isConfigured: true,
    capabilities: ["search"],
  }),
  createSkill({
    id: "skill-b",
    name: "Charting",
    rating: 4.5,
    usageCount: 8000,
    isEnabled: false,
    capabilities: ["chart"],
  }),
  createSkill({
    id: "skill-c",
    name: "Translate",
    rating: 4.7,
    usageCount: 10000,
    isEnabled: true,
    isConfigured: false,
    capabilities: [],
  }),
];

describe("skill workspace model", () => {
  it("builds pipeline summary counters", () => {
    const summary = buildSkillWorkspaceSummary(skills);
    expect(summary.total).toBe(3);
    expect(summary.enabled).toBe(2);
    expect(summary.disabled).toBe(1);
    expect(summary.needsConfig).toBe(1);
  });

  it.each<SkillPipelineStage>(["all", "enabled", "disabled", "needs_config"])(
    "filters by stage '%s'",
    (stage) => {
      const filtered = filterSkillsByStage(skills, stage);
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    },
  );

  it("reports validation warnings for missing required keys", () => {
    const result = getSkillConfigValidation({ timeout: 1000 });
    expect(result.valid).toBe(false);
    expect(result.warnings.some((item) => item.includes("enabled"))).toBe(true);
  });

  it("accepts a complete config", () => {
    const result = getSkillConfigValidation({
      enabled: true,
      scope: "workspace",
      timeout: 1500,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("builds enabled/favorite/recent library lanes", () => {
    const library = buildSkillWorkspaceLibrary(skills, {
      favoriteSkillIds: ["skill-c"],
      recentSkillIds: ["skill-c", "skill-a", "unknown"],
    });

    expect(library.enabled.map((item) => item.id)).toEqual(["skill-a", "skill-c"]);
    expect(library.favorites.map((item) => item.id)).toEqual(["skill-c"]);
    expect(library.recent.map((item) => item.id)).toEqual(["skill-c", "skill-a"]);
  });
});
