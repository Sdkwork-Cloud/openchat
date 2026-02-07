
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';

export interface Comment {
  user: string;
  text: string;
}

export interface Moment extends BaseEntity {
  author: string;
  avatar: string;
  content: string;
  images: string[];
  comments: Comment[];
  likes: number;
  hasLiked: boolean;
  displayTime?: string; // Derived field for UI
}

const MOCK_DATA_INIT: Partial<Moment>[] = [
    {
        id: '101', author: 'Omni Vision', avatar: 'Omni',
        content: '今天体验了最新的 Omni AI 架构，不仅算法顶尖，交互也做到了极致。Tech Blue 的设计语言非常清爽！📱🚀',
        images: ['https://picsum.photos/600/600?random=11', 'https://picsum.photos/600/600?random=12'],
        comments: [{ user: 'Elon', text: 'Looks amazing!' }],
        likes: 42,
        hasLiked: false
    },
    {
        id: '102', author: 'Creative AI', avatar: 'Creative',
        content: '生成式 AI 正在改变我们的创作方式。#GenerativeAI',
        images: ['https://picsum.photos/600/600?random=21', 'https://picsum.photos/600/600?random=22'],
        likes: 128,
        hasLiked: true
    },
    {
        id: '103', author: 'Tech Lead', avatar: 'Tech',
        content: '周末加班优化了列表滚动性能，Virtual List 确实是提升体验的关键。',
        images: [],
        comments: [],
        likes: 8,
        hasLiked: false
    }
];

class MomentsServiceImpl extends AbstractStorageService<Moment> {
  protected STORAGE_KEY = 'sys_moments_v2';

  constructor() {
      super();
      this.initMockData();
  }

  private async initMockData() {
      const list = await this.loadData();
      if (list.length === 0) {
          const now = Date.now();
          for (const m of MOCK_DATA_INIT) {
              // Stagger time for realistic feed
              const timeOffset = Math.floor(Math.random() * 86400000); 
              await this.save({ ...m, createTime: now - timeOffset, updateTime: now } as Moment);
          }
      }
  }

  // Override findAll to inject displayTime
  async getFeed(page: number = 1, size: number = 10): Promise<Result<Page<Moment>>> {
      // Use base generic findAll with standard params
      const result = await this.findAll({ 
          page, 
          size, 
          sortField: 'createTime', 
          sortOrder: 'desc' 
      });

      if (result.data) {
          // Transform data for UI (View Model adaption)
          result.data.content = result.data.content.map(m => ({
              ...m,
              displayTime: this.formatTime(m.createTime)
          }));
      }
      
      return result;
  }

  async likeMoment(id: string): Promise<Result<void>> {
      const { data: moment } = await this.findById(id);
      if (moment) {
          moment.hasLiked = !moment.hasLiked;
          moment.likes += moment.hasLiked ? 1 : -1;
          await this.save(moment); // Abstract save handles update
          return { success: true };
      }
      return { success: false, message: 'Not found' };
  }

  private formatTime(timestamp: number): string {
      const diff = Date.now() - timestamp;
      const min = 60 * 1000;
      const hour = 60 * min;
      const day = 24 * hour;

      if (diff < min) return '刚刚';
      if (diff < hour) return `${Math.floor(diff / min)}分钟前`;
      if (diff < day) return `${Math.floor(diff / hour)}小时前`;
      return `${Math.floor(diff / day)}天前`;
  }
}

export const MomentsService = new MomentsServiceImpl();
