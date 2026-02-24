
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page, FilterCriterion } from '../../../core/types';
import { smartRecommendShuffle, calculateSimilarity } from '../../../utils/algorithms';

// --- FIX: Export types so components can import them from this service module ---
export type CreationType = 'image' | 'video' | 'music' | 'text' | 'imported';

export interface CreationItem extends BaseEntity {
  title: string;
  type: string; // 'image' | 'video' | 'music'
  prompt: string;
  ratio: string;
  style: string;
  url: string;
  isPublic: boolean;
  author: string;
  likes: number;
}

class CreationServiceImpl extends AbstractStorageService<CreationItem> {
  protected STORAGE_KEY = 'sys_creations_v1';

  async getInspirationFeed(page: number = 1, size: number = 10, category?: string): Promise<Result<Page<CreationItem>>> {
      const filters: FilterCriterion[] = [{ field: 'isPublic', operator: 'eq', value: true }];
      const listResult = await this.findAll({ filters });
      let list = listResult.data?.content || [];

      if (category && category !== '推荐') {
          list = list.filter(item => item.style?.includes(category) || item.type === category);
      }

      // Smart Recommendation Shuffle
      const sortedContent = smartRecommendShuffle(list, (item) => Math.log10(item.likes + 1) * 10);

      const total = sortedContent.length;
      const startIndex = (page - 1) * size;
      const pagedContent = sortedContent.slice(startIndex, startIndex + size);

      return {
          success: true,
          data: { content: pagedContent, total, page, size, totalPages: Math.ceil(total / size) }
      };
  }

  async getRelatedCreations(targetId: string): Promise<Result<CreationItem[]>> {
      const { data: current } = await this.findById(targetId);
      if (!current) return { success: false, data: [] };

      const { data: pool } = await this.findAll({ 
          filters: [{ field: 'id', operator: 'neq', value: current.id }],
          pageRequest: { page: 1, size: 100 } 
      });
      
      const candidates = pool?.content || [];

      // Precision Similarity Algorithm
      const scored = candidates.map(item => {
          let score = 0;
          if (item.type === current.type) score += 50;
          if (item.style === current.style) score += 30;
          const textSimilarity = calculateSimilarity(item.prompt, current.prompt);
          score += (textSimilarity / 100) * 20;
          return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return { success: true, data: scored.slice(0, 6).map(s => s.item) };
  }

  async getMyCreations(type?: string): Promise<Result<CreationItem[]>> {
      const filters: FilterCriterion[] = [{ field: 'author', operator: 'eq', value: 'Me' }];
      if (type && type !== '全部') filters.push({ field: 'type', operator: 'eq', value: type });

      const { data } = await this.findAll({ filters, sort: { field: 'createTime', order: 'desc' } });
      return { success: true, data: data?.content || [] };
  }

  // --- FIX: Added missing methods for CreationServiceImpl expected by UI components ---
  async create(item: Partial<CreationItem>): Promise<Result<CreationItem>> {
      return await this.save(item);
  }

  async getById(id: string): Promise<Result<CreationItem>> {
      return await this.findById(id);
  }

  async search(query: string): Promise<Result<CreationItem[]>> {
      const { data } = await this.findAll({
          keywords: query,
          pageRequest: { page: 1, size: 100 }
      });
      return { success: true, data: data?.content || [] };
  }
}

export const CreationService = new CreationServiceImpl();
