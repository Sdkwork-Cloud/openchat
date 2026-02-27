import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result, Page } from '../../../core/types';
import { AppEvents, eventEmitter } from '../../../core/events';
import { Moment, MomentFilter, PublishMomentData, SocialStats, Comment } from '../types';

const MOCK_DATA_INIT: Partial<Moment>[] = [
  {
    id: '101', 
    author: 'Omni Vision', 
    authorId: 'user_1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omni',
    content: '今天体验了最新的 Omni AI 架构，不仅算法顶尖，交互也做到了极致。Tech Blue 的设计语言非常清爽！📱🚀\n\n#AI #Tech #Design',
    images: [
      'https://picsum.photos/800/600?random=11', 
      'https://picsum.photos/800/600?random=12',
      'https://picsum.photos/800/600?random=13'
    ],
    comments: [
      { id: 'c1', userId: 'user_2', userName: 'Elon', text: 'Looks amazing!', createTime: Date.now() - 3600000 }
    ],
    likes: 42,
    hasLiked: false,
    likedBy: ['user_3', 'user_4'],
    location: '上海 · 张江',
    isPublic: true
  },
  {
    id: '102', 
    author: 'Creative AI', 
    authorId: 'user_5',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Creative',
    content: '生成式 AI 正在改变我们的创作方式。刚刚用 Midjourney 创作了一组赛博朋克风格的作品，效果惊艳！\n\n#GenerativeAI #Midjourney #Art',
    images: [
      'https://picsum.photos/800/800?random=21', 
      'https://picsum.photos/800/800?random=22',
      'https://picsum.photos/800/800?random=23',
      'https://picsum.photos/800/800?random=24'
    ],
    comments: [
      { id: 'c2', userId: 'user_6', userName: 'Alice', text: '太酷了！能分享一下提示词吗？', createTime: Date.now() - 7200000 },
      { id: 'c3', userId: 'user_5', userName: 'Creative AI', text: '回复 Alice: 主要用了 neon lights, cyberpunk city 这些关键词', createTime: Date.now() - 7000000, replyTo: { userId: 'user_6', userName: 'Alice' } }
    ],
    likes: 128,
    hasLiked: true,
    likedBy: ['user_1', 'user_2', 'user_3'],
    location: '北京 · 798',
    isPublic: true
  },
  {
    id: '103', 
    author: 'Tech Lead', 
    authorId: 'user_7',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech',
    content: '周末加班优化了列表滚动性能，Virtual List 确实是提升体验的关键。分享一下我的心得：\n\n1. 使用 requestAnimationFrame 优化渲染\n2. 合理的缓冲区域设置\n3. 图片懒加载和占位符\n\n#Frontend #Performance #React',
    images: [],
    comments: [],
    likes: 89,
    hasLiked: false,
    likedBy: ['user_1', 'user_5'],
    isPublic: true
  },
  {
    id: '104', 
    author: '产品经理小王', 
    authorId: 'user_8',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wang',
    content: '用户调研的一些发现：大多数用户更喜欢简洁的界面，但功能不能少。这就是设计的艺术 - 做减法比做加法更难。\n\n#UX #ProductDesign #UserResearch',
    images: ['https://picsum.photos/800/600?random=31'],
    comments: [
      { id: 'c4', userId: 'user_9', userName: '设计师小李', text: '深有体会！', createTime: Date.now() - 18000000 }
    ],
    likes: 56,
    hasLiked: false,
    likedBy: [],
    location: '深圳 · 南山',
    isPublic: true
  },
  {
    id: '105', 
    author: 'AI User', 
    authorId: 'current_user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    content: '今天开始用 OpenChat 了，界面真的很清爽！期待更多的功能更新。',
    images: [],
    comments: [
      { id: 'c5', userId: 'user_1', userName: 'Omni Vision', text: '欢迎！有问题随时交流', createTime: Date.now() - 86400000 }
    ],
    likes: 12,
    hasLiked: true,
    likedBy: ['user_1', 'user_2'],
    isPublic: true
  }
];

class MomentsServiceImpl extends AbstractStorageService<Moment> {
  constructor() {
    super('sys_moments_pc_v1');
  }

  protected async onInitialize() {
    const list = await this.loadData();
    if (list.length === 0) {
      const now = Date.now();
      for (const m of MOCK_DATA_INIT) {
        const timeOffset = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
        await this.saveItem({
          ...m,
          createTime: now - timeOffset,
          updateTime: now
        } as Moment);
      }
    }
  }

  async getFeed(filter: MomentFilter = {}, page: number = 1, size: number = 10): Promise<Result<Page<Moment>>> {
    const all = await this.loadData();
    let filtered = all;

    if (filter.authorId) {
      filtered = filtered.filter(m => m.authorId === filter.authorId);
    }

    if (filter.isPublic !== undefined) {
      filtered = filtered.filter(m => m.isPublic === filter.isPublic);
    }

    if (filter.startTime !== undefined) {
      filtered = filtered.filter(m => m.createTime && m.createTime >= filter.startTime!);
    }

    if (filter.endTime !== undefined) {
      filtered = filtered.filter(m => m.createTime && m.createTime <= filter.endTime!);
    }

    // Sort by createTime desc
    filtered.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));

    const total = filtered.length;
    const start = (page - 1) * size;
    const content = filtered.slice(start, start + size).map(m => ({
      ...m,
      displayTime: this.formatTime(m.createTime || Date.now())
    }));

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

  async publish(data: PublishMomentData): Promise<Result<Moment>> {
    const now = Date.now();
    const moment: Moment = {
      id: `moment_${now}_${Math.random().toString(36).substr(2, 9)}`,
      author: 'AI User',
      authorId: 'current_user',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      content: data.content,
      images: data.images,
      comments: [],
      likes: 0,
      hasLiked: false,
      likedBy: [],
      location: data.location,
      isPublic: data.isPublic,
      createTime: now,
      updateTime: now
    };

    await this.saveItem(moment);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true, data: moment };
  }

  async likeMoment(id: string): Promise<Result<void>> {
    const { data: moment } = await this.getById(id);
    if (!moment) return { success: false, error: 'Moment not found' };

    const userId = 'current_user';
    const hasLiked = moment.likedBy.includes(userId);

    if (hasLiked) {
      moment.likedBy = moment.likedBy.filter((uid: string) => uid !== userId);
      moment.likes--;
      moment.hasLiked = false;
    } else {
      moment.likedBy.push(userId);
      moment.likes++;
      moment.hasLiked = true;
    }

    await this.saveItem(moment);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true };
  }

  async addComment(momentId: string, text: string, replyTo?: { userId: string; userName: string }): Promise<Result<Comment>> {
    const { data: moment } = await this.getById(momentId);
    if (!moment) return { success: false, error: 'Moment not found' };

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'current_user',
      userName: 'AI User',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      text,
      createTime: Date.now(),
      replyTo
    };

    moment.comments.push(comment);
    await this.saveItem(moment);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true, data: comment };
  }

  async deleteComment(momentId: string, commentId: string): Promise<Result<void>> {
    const { data: moment } = await this.getById(momentId);
    if (!moment) return { success: false, error: 'Moment not found' };

    moment.comments = moment.comments.filter((c: Comment) => c.id !== commentId);
    await this.saveItem(moment);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true };
  }

  async deleteMoment(id: string): Promise<Result<void>> {
    await this.delete(id);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true };
  }

  async getStats(userId?: string): Promise<Result<SocialStats>> {
    const all = await this.loadData();
    const userMoments = userId ? all.filter(m => m.authorId === userId) : all;
    
    const stats: SocialStats = {
      totalMoments: userMoments.length,
      totalLikes: userMoments.reduce((sum, m) => sum + m.likes, 0),
      totalComments: userMoments.reduce((sum, m) => sum + m.comments.length, 0),
      followers: 128,
      following: 56
    };

    return { success: true, data: stats };
  }

  private formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const min = 60 * 1000;
    const hour = 60 * min;
    const day = 24 * hour;
    const week = 7 * day;

    if (diff < min) return '刚刚';
    if (diff < hour) return `${Math.floor(diff / min)}分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)}小时前`;
    if (diff < week) return `${Math.floor(diff / day)}天前`;
    
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
}

export const MomentsService = new MomentsServiceImpl();
