import type { BaseEntity } from '@sdkwork/openchat-pc-contracts';

export type CreationType = 'image' | 'video' | 'music' | 'text' | '3d';

export interface CreationItem extends BaseEntity {
  title: string;
  type: CreationType;
  prompt: string;
  negativePrompt?: string;
  ratio: string;
  style: string;
  url: string;
  thumbnail?: string;
  isPublic: boolean;
  author: string;
  authorAvatar?: string;
  likes: number;
  views: number;
  model?: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
}

export interface CreationTemplate {
  id: string;
  name: string;
  description: string;
  type: CreationType;
  preview: string;
  defaultPrompt: string;
  defaultNegativePrompt?: string;
  defaultRatio: string;
  defaultStyle: string;
}

export interface CreationParams {
  prompt: string;
  negativePrompt?: string;
  type: CreationType;
  ratio: string;
  style: string;
  model?: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
}

export interface CreationFilter {
  type?: CreationType;
  style?: string;
  author?: string;
  isPublic?: boolean;
}

export interface CreationStats {
  totalCreations: number;
  totalLikes: number;
  totalViews: number;
  byType: Record<CreationType, number>;
}


