import type { BaseEntity } from '@sdkwork/openchat-pc-contracts';

export type VideoType = 'neural' | 'matrix' | 'aurora' | 'cyber' | 'nature';

export interface Video extends BaseEntity {
  title: string;
  description?: string;
  author: string;
  authorAvatar?: string;
  thumbnail: string;
  url: string;
  duration: number; // seconds
  likes: number;
  views: number;
  comments: number;
  shares: number;
  type: VideoType;
  hasLiked: boolean;
  hasCollected: boolean;
  tags: string[];
}

export interface VideoComment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: number;
  createTime: number;
}

export interface VideoFilter {
  type?: VideoType;
  search?: string;
}

export interface VideoStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  byType: Record<VideoType, number>;
}


