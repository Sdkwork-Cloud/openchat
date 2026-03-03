import type { BaseEntity } from '@sdkwork/openchat-pc-contracts';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createTime: number;
  replyTo?: {
    userId: string;
    userName: string;
  };
}

export interface Moment extends BaseEntity {
  author: string;
  authorId: string;
  avatar: string;
  content: string;
  images: string[];
  comments: Comment[];
  likes: number;
  hasLiked: boolean;
  likedBy: string[];
  location?: string;
  displayTime?: string;
  isPublic: boolean;
}

export interface MomentFilter {
  authorId?: string;
  isPublic?: boolean;
  startTime?: number;
  endTime?: number;
}

export interface PublishMomentData {
  content: string;
  images: string[];
  isPublic: boolean;
  location?: string;
}

export interface SocialStats {
  totalMoments: number;
  totalLikes: number;
  totalComments: number;
  followers: number;
  following: number;
}


