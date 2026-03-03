export enum SkillCategory {
  CREATIVE = "creative",
  UTILITY = "utility",
  DEVELOPER = "developer",
  DATA = "data",
  MEDIA = "media",
  CUSTOM = "custom",
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: SkillCategory;
  version: string;
  provider: string;
  isPublic: boolean;
  isBuiltin: boolean;
  capabilities: string[];
  tags: string[];
  usageCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSkill {
  id: string;
  skillId: string;
  userId: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillMarketItem extends Skill {
  isEnabled?: boolean;
  isConfigured?: boolean;
  configuredAt?: string;
}

export interface SkillCategoryInfo {
  id: string;
  name: string;
  icon: string;
}
