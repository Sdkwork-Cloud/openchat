import type { BaseEntity } from '@sdkwork/openchat-pc-contracts';

export type ContentType = 'article' | 'video' | 'image' | 'audio';

export interface DiscoverItem extends BaseEntity {
  title: string;
  summary: string;
  cover: string;
  type: ContentType;
  source: string;
  authorAvatar?: string;
  reads: number;
  likes: number;
  tags: string[];
  url?: string;
}

export interface DiscoverCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

export interface DiscoverBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  bgColor: string;
}

export interface DiscoverFilter {
  type?: ContentType;
  category?: string;
  sortBy?: 'hot' | 'new' | 'recommend';
}


