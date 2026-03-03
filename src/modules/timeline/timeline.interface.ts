export enum TimelineVisibility {
  PUBLIC = 'public',
  FRIENDS = 'friends',
  PRIVATE = 'private',
  CUSTOM = 'custom',
}

export enum TimelinePostStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export enum TimelineDistributionMode {
  PUSH = 'push',
  PULL = 'pull',
  HYBRID = 'hybrid',
}

export enum TimelineFeedItemStatus {
  ACTIVE = 'active',
  REMOVED = 'removed',
}

export interface TimelineMediaItem {
  type: 'image' | 'video' | 'file' | 'link';
  url: string;
  width?: number;
  height?: number;
  duration?: number;
  coverUrl?: string;
  extra?: Record<string, any>;
}

export interface TimelinePostView {
  id: string;
  authorId: string;
  visibility: TimelineVisibility;
  distributionMode: TimelineDistributionMode;
  text?: string;
  media?: TimelineMediaItem[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  publishedAt: Date;
  likedByMe: boolean;
  extra?: Record<string, any>;
}

export interface TimelineFeedPage {
  items: TimelinePostView[];
  nextCursor?: string;
}
