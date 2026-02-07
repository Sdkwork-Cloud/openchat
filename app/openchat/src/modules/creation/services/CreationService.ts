
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';
import { smartRecommendShuffle } from '../../../utils/algorithms';

export type CreationType = 'image' | 'video' | 'music' | 'text';

export interface CreationItem extends BaseEntity {
  title: string;
  type: CreationType;
  url?: string; // Image URL, Video Thumbnail, etc.
  prompt: string;
  author: string; // 'Me' or others for feed
  likes: number;
  ratio?: string; // '1:1', '16:9' etc.
  style?: string;
  isPublic: boolean; // True for Feed, False for My Creations
}

// Mock Data for Public Feed
const FEED_SEEDS: Partial<CreationItem>[] = [
  { id: 'feed_101', type: 'image', title: 'Cyberpunk City', prompt: 'Futuristic city...', author: 'Neo', likes: 12000, ratio: '9:16', style: 'cyber', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=600', isPublic: true },
  { id: 'feed_102', type: 'image', title: 'Future Moto', prompt: 'Sci-fi motorcycle...', author: 'Mechanic', likes: 8500, ratio: '16:9', style: '3d', url: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?q=80&w=600', isPublic: true },
  { id: 'feed_103', type: 'image', title: 'Neon Portrait', prompt: 'Cyberpunk girl...', author: 'Artist X', likes: 120000, ratio: '3:4', style: 'photo', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600', isPublic: true },
  { id: 'feed_104', type: 'image', title: 'Abstract Fluid', prompt: '3D abstract...', author: 'Motion', likes: 2100, ratio: '1:1', style: '3d', url: 'https://images.unsplash.com/photo-1614728853913-1e22ba61d527?q=80&w=600', isPublic: true },
  { id: 'feed_105', type: 'video', title: 'Ocean Waves', prompt: 'Drone shot...', author: 'Nature', likes: 5000, ratio: '16:9', style: 'real', url: '', isPublic: true },
];

class CreationServiceImpl extends AbstractStorageService<CreationItem> {
  protected STORAGE_KEY = 'sys_creations_v1';

  constructor() {
      super();
      this.initFeedData();
  }

  private async initFeedData() {
      const list = await this.loadData();
      // Only seed if completely empty to avoid duplicates on reload
      if (list.length === 0) {
          const now = Date.now();
          for (const item of FEED_SEEDS) {
              await this.save({ ...item, createTime: now, updateTime: now } as CreationItem);
          }
          // Seed some "My Creations" for demo
          await this.save({ 
              id: 'my_1', type: 'image', title: '我的第一张 AI 画作', prompt: 'A cat in space', 
              author: 'Me', likes: 0, ratio: '1:1', style: 'anime', 
              url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SpaceCat', 
              isPublic: false, createTime: now - 100000, updateTime: now 
          } as CreationItem);
      }
  }

  /**
   * Get the public inspiration feed using a smart shuffle algorithm.
   */
  async getInspirationFeed(page: number = 1, size: number = 10, category?: string): Promise<Result<Page<CreationItem>>> {
      const list = await this.loadData();
      
      // 1. Filter: Public Only + Optional Category (mapped to style or tag)
      let filtered = list.filter(item => item.isPublic);
      
      if (category && category !== '推荐') {
          // Simple fuzzy mapping for demo
          const map: Record<string, string> = { '赛博': 'cyber', '3D': '3d', '二次元': 'anime' };
          const styleKey = map[category] || category;
          filtered = filtered.filter(item => item.style?.includes(styleKey) || item.title.includes(category));
      }

      // 2. Algorithm: Weighted Shuffle based on likes (Popularity)
      const sortedContent = smartRecommendShuffle(filtered, (item) => Math.log10(item.likes + 1) * 10);

      // 3. Pagination
      const total = sortedContent.length;
      const totalPages = Math.ceil(total / size);
      const startIndex = (page - 1) * size;
      const pagedContent = sortedContent.slice(startIndex, startIndex + size);

      return {
          success: true,
          data: { content: pagedContent, total, page, size, totalPages }
      };
  }

  /**
   * Get User's private creations
   */
  async getMyCreations(type?: string): Promise<Result<CreationItem[]>> {
      const list = await this.loadData();
      let myItems = list.filter(item => !item.isPublic || item.author === 'Me');
      
      // Sort by newest first
      myItems.sort((a, b) => b.createTime - a.createTime);

      if (type && type !== '全部') {
          const map: Record<string, string> = { '图片': 'image', '视频': 'video', '音乐': 'music', '文本': 'text' };
          const typeKey = map[type] || type;
          myItems = myItems.filter(item => item.type === typeKey);
      }

      return { success: true, data: myItems };
  }

  async create(data: Partial<CreationItem>): Promise<Result<CreationItem>> {
      return await this.save({
          ...data,
          author: 'Me',
          likes: 0,
          isPublic: false, // Default to private
          createTime: Date.now(),
          updateTime: Date.now()
      });
  }
}

export const CreationService = new CreationServiceImpl();
