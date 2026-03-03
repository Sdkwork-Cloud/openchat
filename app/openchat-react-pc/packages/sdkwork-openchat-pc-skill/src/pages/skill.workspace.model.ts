import type { SkillMarketItem } from "../entities/skill.entity";

export type SkillPipelineStage = "all" | "enabled" | "disabled" | "needs_config";
export type SkillScope = "workspace" | "team" | "global";

export interface SkillWorkspaceSummary {
  total: number;
  enabled: number;
  disabled: number;
  needsConfig: number;
}

export interface SkillConfigValidation {
  valid: boolean;
  warnings: string[];
}

export interface SkillWorkspaceLibrary {
  enabled: SkillMarketItem[];
  favorites: SkillMarketItem[];
  recent: SkillMarketItem[];
}

interface BuildSkillWorkspaceLibraryInput {
  favoriteSkillIds: string[];
  recentSkillIds: string[];
}

function byScore(left: SkillMarketItem, right: SkillMarketItem): number {
  const leftScore = left.rating * 10_000 + left.usageCount;
  const rightScore = right.rating * 10_000 + right.usageCount;
  return rightScore - leftScore;
}

function needsConfig(skill: SkillMarketItem): boolean {
  return Boolean(skill.isEnabled) && !Boolean(skill.isConfigured);
}

function uniqueIdList(ids: string[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];

  ids.forEach((id) => {
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    list.push(id);
  });

  return list;
}

export function buildSkillWorkspaceSummary(skills: SkillMarketItem[]): SkillWorkspaceSummary {
  const enabled = skills.filter((item) => Boolean(item.isEnabled)).length;
  const disabled = skills.length - enabled;
  const needsConfigCount = skills.filter(needsConfig).length;

  return {
    total: skills.length,
    enabled,
    disabled,
    needsConfig: needsConfigCount,
  };
}

export function filterSkillsByStage(
  skills: SkillMarketItem[],
  stage: SkillPipelineStage,
): SkillMarketItem[] {
  if (stage === "enabled") {
    return skills.filter((item) => Boolean(item.isEnabled)).sort(byScore);
  }
  if (stage === "disabled") {
    return skills.filter((item) => !item.isEnabled).sort(byScore);
  }
  if (stage === "needs_config") {
    return skills.filter(needsConfig).sort(byScore);
  }
  return [...skills].sort(byScore);
}

export function buildSkillWorkspaceLibrary(
  skills: SkillMarketItem[],
  input: BuildSkillWorkspaceLibraryInput,
): SkillWorkspaceLibrary {
  const enabled = skills.filter((item) => Boolean(item.isEnabled)).sort(byScore);
  const enabledMap = new Map(enabled.map((item) => [item.id, item]));

  const favoriteSkillIds = uniqueIdList(input.favoriteSkillIds);
  const favorites = favoriteSkillIds.map((skillId) => enabledMap.get(skillId)).filter((item): item is SkillMarketItem => Boolean(item));

  const recentSkillIds = uniqueIdList(input.recentSkillIds);
  const recent = recentSkillIds.map((skillId) => enabledMap.get(skillId)).filter((item): item is SkillMarketItem => Boolean(item));

  return {
    enabled,
    favorites,
    recent,
  };
}

export function getSkillConfigValidation(config: Record<string, unknown>): SkillConfigValidation {
  const warnings: string[] = [];

  if (typeof config.enabled !== "boolean") {
    warnings.push("Missing required key 'enabled' (boolean).");
  }

  const scope = config.scope;
  if (scope !== undefined && scope !== "workspace" && scope !== "team" && scope !== "global") {
    warnings.push("Invalid 'scope', expected workspace | team | global.");
  }

  const timeout = config.timeout;
  if (timeout !== undefined && (!Number.isFinite(timeout) || Number(timeout) <= 0)) {
    warnings.push("Invalid 'timeout', expected a positive number.");
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
