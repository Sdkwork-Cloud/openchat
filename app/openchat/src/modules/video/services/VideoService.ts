
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';
import { smartRecommendShuffle } from '../../../utils/algorithms';

export type VideoType = 'neural' | 'matrix' | 'aurora';

export interface Video extends BaseEntity {
  title: string;
  author: string;
  likes: string; // Display string (e.g. "10.2w")
  likesCount: number; // Numeric for calculation
  comments: string;
  type: VideoType;
  hasLiked: boolean;
  score?: number; // Runtime score for recommendation
}

const SEED_VIDEOS: Partial<Video>[] = [
  { id: 'v_1', title: 'Neural Network Dreaming', author: 'Omni Vision', likes: '10.2w', likesCount: 102000, comments: '882', type: 'neural', hasLiked: false },
  { id: 'v_2', title: 'Data Stream Flow', author: 'Tech Core', likes: '5.6w', likesCount: 56000, comments: '341', type: 'matrix', hasLiked: false },
  { id: 'v_3', title: 'Aurora AI', author: 'Nature Bot', likes: '21.8w', likesCount: 218000, comments: '1.2k', type: 'aurora', hasLiked: false },
  { id: 'v_4', title: 'Generative Art', author: 'Creative AI', likes: '8.9w', likesCount: 89000, comments: '556', type: 'neural', hasLiked: false },
  { id: 'v_5', title: 'System Core', author: 'Admin', likes: '99.9w', likesCount: 999900, comments: '9999', type: 'matrix', hasLiked: false }
];

class VideoServiceImpl extends AbstractStorageService<Video> {
  protected STORAGE_KEY = 'sys_videos_v2';
  
  // User Interest Profile (Runtime Memory)
  private userInterests: Record<VideoType, number> = {
      'neural': 0.8, 
      'matrix': 0.5,
      'aurora': 0.2
  };

  constructor() {
      super();
      this.initMockData();
  }

  private async initMockData() {
      const list = await this.loadData();
      if (list.length === 0) {
          const now = Date.now();
          for (const v of SEED_VIDEOS) {
              await this.save({ ...v, createTime: now, updateTime: now } as Video);
          }
      }
  }

  /**
   * Advanced Recommendation Engine
   * Combines content-based filtering with a weighted shuffle.
   */
  async getRecommendedVideos(page: number = 1, size: number = 10): Promise<Result<Page<Video>>> {
    // 1. Load fresh data from storage (to get latest like status)
    const list = await this.loadData();

    // 2. Apply Scoring Algorithm
    const scoredContent = smartRecommendShuffle(list, (video) => {
        // Logarithmic popularity score
        const popularityScore = Math.log10(video.likesCount + 1) * 10;
        
        // Personal Interest Boost
        const interestBoost = (this.userInterests[video.type] || 0) * 50;
        
        // Interaction Boost
        const likeBoost = video.hasLiked ? -20 : 0; // Slightly penalize already liked videos to show new content? Or boost? Let's say we want variety.
        
        return popularityScore + interestBoost + likeBoost;
    }, 0.3); // 30% Randomness factor to prevent echo chamber

    // 3. Pagination
    const total = scoredContent.length;
    const totalPages = Math.ceil(total / size);
    const startIndex = (page - 1) * size;
    const pagedContent = scoredContent.slice(startIndex, startIndex + size);

    return {
      success: true,
      data: {
        content: pagedContent,
        total,
        page,
        size,
        totalPages
      }
    };
  }

  async toggleLike(id: string): Promise<Result<void>> {
    const { data: video } = await this.findById(id);
    if (video) {
        video.hasLiked = !video.hasLiked;
        video.likesCount += video.hasLiked ? 1 : -1;
        
        // Update display string roughly
        if (video.likesCount > 10000) {
            video.likes = (video.likesCount / 10000).toFixed(1) + 'w';
        } else {
            video.likes = video.likesCount.toString();
        }

        // Reinforce Learning: Update Interest Profile
        if (video.hasLiked) {
            this.userInterests[video.type] = Math.min(1, (this.userInterests[video.type] || 0) + 0.15);
        }

        await this.save(video);
        return { success: true };
    }
    return { success: false, message: 'Video not found' };
  }
}

export const VideoService = new VideoServiceImpl();
