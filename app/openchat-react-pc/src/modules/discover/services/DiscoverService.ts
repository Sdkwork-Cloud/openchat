import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result, Page } from '../../../core/types';
import { DiscoverItem, DiscoverCategory, DiscoverBanner, DiscoverFilter, ContentType } from '../types';

const MOCK_BANNERS: DiscoverBanner[] = [
  {
    id: 'b1',
    title: '数字人克隆计划',
    subtitle: '复刻你的声音与容貌，开启AI新纪元',
    image: 'https://picsum.photos/1200/400?random=1',
    link: '/agents',
    bgColor: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
  },
  {
    id: 'b2',
    title: 'AI 绘画大赏',
    subtitle: '由 Midjourney V6 全程驱动的创意盛宴',
    image: 'https://picsum.photos/1200/400?random=2',
    link: '/creation',
    bgColor: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)'
  },
  {
    id: 'b3',
    title: '智能办公新体验',
    subtitle: '让AI成为你的超级助手',
    image: 'https://picsum.photos/1200/400?random=3',
    link: '/chat',
    bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  }
];

const MOCK_CATEGORIES: DiscoverCategory[] = [
  { id: 'all', name: '全部', icon: 'compass', color: '#3b82f6', count: 128 },
  { id: 'ai', name: 'AI技术', icon: 'bot', color: '#8b5cf6', count: 45 },
  { id: 'design', name: '设计', icon: 'palette', color: '#ec4899', count: 32 },
  { id: 'tech', name: '科技', icon: 'cpu', color: '#10b981', count: 28 },
  { id: 'life', name: '生活', icon: 'coffee', color: '#f59e0b', count: 23 }
];

const MOCK_ITEMS: Partial<DiscoverItem>[] = [
  {
    id: 'd1',
    title: 'GPT-5 即将发布：AI能力将迎来质的飞跃',
    summary: 'OpenAI CEO Sam Altman 在最新采访中透露，GPT-5 将在推理能力和多模态处理上有重大突破...',
    cover: 'https://picsum.photos/600/400?random=11',
    type: 'article',
    source: 'AI前沿',
    reads: 12500,
    likes: 892,
    tags: ['AI', 'GPT', 'OpenAI']
  },
  {
    id: 'd2',
    title: '用Midjourney创作赛博朋克风格城市景观',
    summary: '本教程将教你如何使用Midjourney V6创作令人惊叹的赛博朋克风格城市景观，包含详细的提示词技巧。',
    cover: 'https://picsum.photos/600/400?random=12',
    type: 'video',
    source: '创意工坊',
    reads: 8900,
    likes: 654,
    tags: ['Midjourney', '教程', 'AI绘画']
  },
  {
    id: 'd3',
    title: '2024年前端开发趋势预测',
    summary: '从React Server Components到AI辅助编程，本文深入分析即将改变前端开发的技术趋势。',
    cover: 'https://picsum.photos/600/400?random=13',
    type: 'article',
    source: '技术博客',
    reads: 6700,
    likes: 423,
    tags: ['前端', 'React', '趋势']
  },
  {
    id: 'd4',
    title: '数字游民的生活方式：在巴厘岛工作的365天',
    summary: '一位远程工作者分享他在巴厘岛生活的真实体验，包括成本、工作效率和生活质量的平衡。',
    cover: 'https://picsum.photos/600/400?random=14',
    type: 'article',
    source: '生活方式',
    reads: 5400,
    likes: 367,
    tags: ['数字游民', '远程工作', '生活']
  },
  {
    id: 'd5',
    title: 'Claude 3 实测：对比GPT-4的表现如何？',
    summary: 'Anthropic最新发布的Claude 3在多项基准测试中超越了GPT-4，我们进行了详细的实际应用测试。',
    cover: 'https://picsum.photos/600/400?random=15',
    type: 'video',
    source: 'AI评测',
    reads: 11200,
    likes: 756,
    tags: ['Claude', 'AI', '评测']
  },
  {
    id: 'd6',
    title: '极简主义设计：少即是多的艺术',
    summary: '探索极简主义设计的核心原则，以及如何在现代UI设计中运用这些理念创造更好的用户体验。',
    cover: 'https://picsum.photos/600/400?random=16',
    type: 'article',
    source: '设计周刊',
    reads: 4300,
    likes: 298,
    tags: ['设计', 'UI/UX', '极简主义']
  }
];

class DiscoverServiceImpl extends AbstractStorageService<DiscoverItem> {
  constructor() {
    super('sys_discover_v1');
  }

  protected async onInitialize() {
    const list = await this.loadData();
    if (list.length === 0) {
      const now = Date.now();
      for (const item of MOCK_ITEMS) {
        await this.saveItem({
          ...item,
          createTime: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
          updateTime: now
        } as DiscoverItem);
      }
    }
  }

  async getBanners(): Promise<Result<DiscoverBanner[]>> {
    return { success: true, data: MOCK_BANNERS };
  }

  async getCategories(): Promise<Result<DiscoverCategory[]>> {
    return { success: true, data: MOCK_CATEGORIES };
  }

  async getFeed(filter: DiscoverFilter = {}, page: number = 1, size: number = 12): Promise<Result<Page<DiscoverItem>>> {
    const all = await this.loadData();
    let filtered = all;

    if (filter.type) {
      filtered = filtered.filter(item => item.type === filter.type);
    }

    if (filter.category && filter.category !== 'all') {
      filtered = filtered.filter(item => item.tags.some(tag => tag.toLowerCase().includes(filter.category!.toLowerCase())));
    }

    // Sort
    if (filter.sortBy === 'hot') {
      filtered.sort((a, b) => b.reads - a.reads);
    } else if (filter.sortBy === 'new') {
      filtered.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
    } else {
      // Recommend: mix of likes and recency
      filtered.sort((a, b) => (b.likes * 10 + b.reads) - (a.likes * 10 + a.reads));
    }

    const total = filtered.length;
    const start = (page - 1) * size;
    const content = filtered.slice(start, start + size);

    return {
      success: true,
      data: {
        content,
        total,
        page,
        size,
        totalPages: Math.ceil(total / size)
      }
    };
  }

  async search(query: string): Promise<Result<DiscoverItem[]>> {
    if (!query.trim()) {
      return { success: true, data: [] };
    }

    const all = await this.loadData();
    const lowerQuery = query.toLowerCase();
    
    const results = all.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.summary.toLowerCase().includes(lowerQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    return { success: true, data: results.slice(0, 20) };
  }

  async getTrending(): Promise<Result<DiscoverItem[]>> {
    const all = await this.loadData();
    const sorted = all.sort((a, b) => (b.reads + b.likes * 10) - (a.reads + a.likes * 10));
    return { success: true, data: sorted.slice(0, 5) };
  }
}

export const DiscoverService = new DiscoverServiceImpl();
