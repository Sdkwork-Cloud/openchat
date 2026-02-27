import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result, Page } from '../../../core/types';
import { AppEvents, eventEmitter } from '../../../core/events';
import { CreationItem, CreationType, CreationFilter, CreationStats, CreationTemplate, CreationParams } from '../types';

const MOCK_CREATIONS: Partial<CreationItem>[] = [
  {
    id: 'c1',
    title: '赛博朋克城市',
    type: 'image',
    prompt: 'A futuristic cyberpunk city at night, neon lights, rain, flying cars, tall skyscrapers, detailed, 8k',
    negativePrompt: 'blurry, low quality, distorted',
    ratio: '16:9',
    style: '赛博朋克',
    url: 'https://picsum.photos/800/450?random=101',
    thumbnail: 'https://picsum.photos/400/225?random=101',
    isPublic: true,
    author: 'Creative AI',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Creative',
    likes: 128,
    views: 2340,
    model: 'Midjourney V6',
    seed: 12345,
    steps: 30,
    cfgScale: 7
  },
  {
    id: 'c2',
    title: '梦幻森林',
    type: 'image',
    prompt: 'Enchanted forest with glowing mushrooms, fairy lights, misty atmosphere, magical creatures',
    ratio: '1:1',
    style: '二次元',
    url: 'https://picsum.photos/600/600?random=102',
    thumbnail: 'https://picsum.photos/300/300?random=102',
    isPublic: true,
    author: 'Art Master',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Art',
    likes: 89,
    views: 1560,
    model: 'Stable Diffusion XL',
    seed: 67890,
    steps: 25,
    cfgScale: 8
  },
  {
    id: 'c3',
    title: '未来城市宣传片',
    type: 'video',
    prompt: 'Cinematic video of a futuristic city, drone shots, time-lapse, 4k quality',
    ratio: '16:9',
    style: '3D',
    url: 'https://picsum.photos/800/450?random=103',
    thumbnail: 'https://picsum.photos/400/225?random=103',
    isPublic: true,
    author: 'Video Pro',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Video',
    likes: 256,
    views: 4560,
    model: 'Sora',
    seed: 11111,
    steps: 50,
    cfgScale: 7
  },
  {
    id: 'c4',
    title: '电子音乐',
    type: 'music',
    prompt: 'Electronic music with synthwave vibes, upbeat tempo, futuristic sound',
    ratio: '1:1',
    style: '赛博',
    url: 'https://picsum.photos/600/600?random=104',
    thumbnail: 'https://picsum.photos/300/300?random=104',
    isPublic: true,
    author: 'Music Maker',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Music',
    likes: 67,
    views: 890,
    model: 'Suno AI',
    seed: 22222,
    steps: 40,
    cfgScale: 6
  },
  {
    id: 'c5',
    title: '3D角色模型',
    type: '3d',
    prompt: 'Cute 3D character, chibi style, colorful, game asset',
    ratio: '1:1',
    style: '二次元',
    url: 'https://picsum.photos/600/600?random=105',
    thumbnail: 'https://picsum.photos/300/300?random=105',
    isPublic: true,
    author: '3D Artist',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3D',
    likes: 145,
    views: 2100,
    model: 'Blender AI',
    seed: 33333,
    steps: 35,
    cfgScale: 7.5
  },
  {
    id: 'c6',
    title: '水墨山水画',
    type: 'image',
    prompt: 'Traditional Chinese ink painting, mountains and rivers, misty clouds, artistic',
    ratio: '3:4',
    style: '绘图',
    url: 'https://picsum.photos/600/800?random=106',
    thumbnail: 'https://picsum.photos/300/400?random=106',
    isPublic: true,
    author: 'Ink Master',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ink',
    likes: 234,
    views: 3450,
    model: 'Midjourney V6',
    seed: 44444,
    steps: 30,
    cfgScale: 7
  }
];

const TEMPLATES: CreationTemplate[] = [
  {
    id: 't1',
    name: 'AI绘图',
    description: '使用Midjourney或Stable Diffusion生成高质量图片',
    type: 'image',
    preview: 'https://picsum.photos/300/200?random=201',
    defaultPrompt: 'A beautiful landscape with mountains and lake, sunset, 8k, detailed',
    defaultNegativePrompt: 'blurry, low quality, distorted',
    defaultRatio: '16:9',
    defaultStyle: '绘图'
  },
  {
    id: 't2',
    name: '视频生成',
    description: '使用Sora生成创意视频内容',
    type: 'video',
    preview: 'https://picsum.photos/300/200?random=202',
    defaultPrompt: 'Cinematic video of nature, slow motion, 4k quality',
    defaultRatio: '16:9',
    defaultStyle: '3D'
  },
  {
    id: 't3',
    name: 'AI音乐',
    description: '使用Suno创作独特音乐作品',
    type: 'music',
    preview: 'https://picsum.photos/300/200?random=203',
    defaultPrompt: 'Upbeat electronic music with synthwave elements',
    defaultRatio: '1:1',
    defaultStyle: '赛博'
  },
  {
    id: 't4',
    name: '3D建模',
    description: '生成3D角色和场景模型',
    type: '3d',
    preview: 'https://picsum.photos/300/200?random=204',
    defaultPrompt: 'Cute 3D character, stylized, colorful',
    defaultRatio: '1:1',
    defaultStyle: '二次元'
  }
];

class CreationServiceImpl extends AbstractStorageService<CreationItem> {
  constructor() {
    super('sys_creations_pc_v1');
  }

  protected async onInitialize() {
    const list = await this.loadData();
    if (list.length === 0) {
      const now = Date.now();
      for (const item of MOCK_CREATIONS) {
        await this.saveItem({
          ...item,
          createTime: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
          updateTime: now
        } as CreationItem);
      }
    }
  }

  async getFeed(filter: CreationFilter = {}, page: number = 1, size: number = 12): Promise<Result<Page<CreationItem>>> {
    let list = await this.loadData();

    if (filter.type) {
      list = list.filter(item => item.type === filter.type);
    }

    if (filter.style) {
      list = list.filter(item => item.style === filter.style);
    }

    if (filter.author) {
      list = list.filter(item => item.author === filter.author);
    }

    if (filter.isPublic !== undefined) {
      list = list.filter(item => item.isPublic === filter.isPublic);
    }

    // Sort by likes and views (popularity)
    list.sort((a, b) => (b.likes * 2 + b.views) - (a.likes * 2 + a.views));

    const total = list.length;
    const start = (page - 1) * size;
    const content = list.slice(start, start + size);

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

  async getMyCreations(type?: CreationType): Promise<Result<CreationItem[]>> {
    let list = await this.loadData();
    list = list.filter(item => item.author === 'Me');
    
    if (type) {
      list = list.filter(item => item.type === type);
    }

    list.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
    return { success: true, data: list };
  }

  async create(params: CreationParams): Promise<Result<CreationItem>> {
    const now = Date.now();
    const item: CreationItem = {
      id: `c_${now}_${Math.random().toString(36).substr(2, 9)}`,
      title: params.prompt.slice(0, 30) + (params.prompt.length > 30 ? '...' : ''),
      type: params.type,
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      ratio: params.ratio,
      style: params.style,
      url: `https://picsum.photos/${params.ratio === '16:9' ? '800/450' : params.ratio === '3:4' ? '600/800' : '600/600'}?random=${now}`,
      thumbnail: `https://picsum.photos/${params.ratio === '16:9' ? '400/225' : params.ratio === '3:4' ? '300/400' : '300/300'}?random=${now}`,
      isPublic: false,
      author: 'Me',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      likes: 0,
      views: 0,
      model: params.model,
      seed: params.seed || Math.floor(Math.random() * 100000),
      steps: params.steps || 30,
      cfgScale: params.cfgScale || 7,
      createTime: now,
      updateTime: now
    };

    await this.saveItem(item);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true, data: item };
  }

  async like(id: string): Promise<Result<void>> {
    const { data: item } = await this.getById(id);
    if (item) {
      item.likes++;
      await this.saveItem(item);
      eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    }
    return { success: true };
  }

  async deleteCreation(id: string): Promise<Result<void>> {
    await this.delete(id);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true };
  }

  async getTemplates(): Promise<Result<CreationTemplate[]>> {
    return { success: true, data: TEMPLATES };
  }

  async getRelatedCreations(targetId: string): Promise<Result<CreationItem[]>> {
    const target = await this.getById(targetId);
    if (!target.data) return { success: false, data: [] };

    const all = await this.loadData();
    const targetItem = target.data;
    if (!targetItem) return { success: true, data: [] };
    
    const related = all
      .filter(item => item.id !== targetId)
      .map(item => {
        let score = 0;
        if (item.type === targetItem.type) score += 50;
        if (item.style === targetItem.style) score += 30;
        // Simple text similarity
        const commonWords = item.prompt.split(' ').filter(word => 
          targetItem.prompt.toLowerCase().includes(word.toLowerCase())
        ).length;
        score += commonWords * 5;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(r => r.item);

    return { success: true, data: related };
  }

  async search(query: string): Promise<Result<CreationItem[]>> {
    if (!query.trim()) return { success: true, data: [] };
    
    const list = await this.loadData();
    const lowerQuery = query.toLowerCase();
    
    const results = list.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.prompt.toLowerCase().includes(lowerQuery) ||
      item.style.toLowerCase().includes(lowerQuery) ||
      item.author.toLowerCase().includes(lowerQuery)
    );

    return { success: true, data: results };
  }

  async getStats(): Promise<Result<CreationStats>> {
    const list = await this.loadData();
    const myCreations = list.filter(item => item.author === 'Me');
    
    const stats: CreationStats = {
      totalCreations: myCreations.length,
      totalLikes: myCreations.reduce((sum, item) => sum + item.likes, 0),
      totalViews: myCreations.reduce((sum, item) => sum + item.views, 0),
      byType: {
        image: myCreations.filter(item => item.type === 'image').length,
        video: myCreations.filter(item => item.type === 'video').length,
        music: myCreations.filter(item => item.type === 'music').length,
        text: myCreations.filter(item => item.type === 'text').length,
        '3d': myCreations.filter(item => item.type === '3d').length
      }
    };

    return { success: true, data: stats };
  }

  getStyles(): string[] {
    return ['全部', '绘图', '视频', '音乐', '3D', '赛博', '二次元', '写实', '抽象'];
  }

  getRatios(): { value: string; label: string }[] {
    return [
      { value: '1:1', label: '1:1 正方形' },
      { value: '16:9', label: '16:9 宽屏' },
      { value: '9:16', label: '9:16 竖屏' },
      { value: '3:4', label: '3:4 肖像' },
      { value: '4:3', label: '4:3 标准' }
    ];
  }

  getModels(type: CreationType): string[] {
    const models: Record<CreationType, string[]> = {
      image: ['Midjourney V6', 'Stable Diffusion XL', 'DALL-E 3', 'Leonardo AI'],
      video: ['Sora', 'Runway Gen-2', 'Pika Labs', 'Stable Video'],
      music: ['Suno AI', 'Udio', 'AIVA', 'Mubert'],
      text: ['GPT-4', 'Claude 3', 'Gemini Pro'],
      '3d': ['Blender AI', 'Meshy', 'Spline AI', 'Luma AI']
    };
    return models[type] || [];
  }
}

export const CreationService = new CreationServiceImpl();
