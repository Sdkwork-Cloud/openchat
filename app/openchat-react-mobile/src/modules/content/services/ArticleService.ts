
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';
import { smartRecommendShuffle } from '../../../utils/algorithms';

export interface Article extends BaseEntity {
    title: string;
    summary: string;
    cover: string; 
    source: string;
    reads: number;
    tags: string[];
    type: 'news' | 'video' | 'ad';
    contentBody?: string;
    authorAvatar?: string;
    authorDesc?: string;
    publishTimeStr?: string;
    comments?: Array<{ user: string; text: string; likes: number }>;
}

const SEED_ARTICLES: Partial<Article>[] = [
    { id: 'art_1', title: 'OpenAI 发布 Sora: 视频生成的 GPT-3 时刻？', summary: '深度解析 Sora 的技术原理与行业影响...', cover: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500', source: '科技前沿', reads: 10240, tags: ['ai', 'tech'], type: 'news' },
    { id: 'art_2', title: '2024 年前端架构趋势预测', summary: 'Rust 工具链、Server Components 与边缘计算...', cover: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500', source: '极客时间', reads: 5600, tags: ['dev', 'web'], type: 'news' },
    { id: 'art_3', title: '马斯克：脑机接口的首位人类受试者恢复良好', summary: 'Neuralink 取得重大突破，仅靠意念控制鼠标...', cover: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=500', source: '未来周刊', reads: 89000, tags: ['tech', 'bio'], type: 'news' },
    { id: 'art_4', title: 'React 19 RC 版本发布说明', summary: '没有 memo，没有 useCallback，全新的编译器...', cover: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500', source: 'Frontend Daily', reads: 3200, tags: ['dev', 'react'], type: 'news' },
    { id: 'art_5', title: 'Apple Vision Pro 深度评测', summary: '空间计算时代真的到了吗？', cover: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500', source: '数码评测', reads: 45000, tags: ['tech', 'gadget'], type: 'video' },
    { id: 'art_6', title: '为什么 Python 依然是 AI 领域的霸主', summary: '生态、社区与性能的权衡...', cover: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500', source: 'Pythonist', reads: 12000, tags: ['dev', 'ai'], type: 'news' },
];

class ArticleServiceImpl extends AbstractStorageService<Article> {
    protected STORAGE_KEY = 'sys_articles_v1';

    protected async onInitialize() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            for (const item of SEED_ARTICLES) {
                // 使用 silent: true 避免初始化导致无限刷新
                await this.save({ ...item, createTime: now, updateTime: now } as Article, { silent: true });
            }
        }
    }

    async getRecommendedFeed(page: number = 1, size: number = 10, interestTags: string[] = []): Promise<Result<Page<Article>>> {
        const { data } = await this.findAll({ 
            pageRequest: { page: 1, size: 1000 } 
        });
        const candidates = data?.content || [];

        const scorer = (item: Article) => {
            let score = Math.log10(item.reads + 1) * 10;
            const hasInterest = item.tags.some(t => interestTags.includes(t));
            if (hasInterest) score += 30;
            if (item.type === 'video') score += 5;
            return score;
        };

        const sortedContent = smartRecommendShuffle(candidates, scorer, 0.15);
        const total = sortedContent.length;
        const totalPages = Math.ceil(total / size);
        const startIndex = (page - 1) * size;
        const pagedContent = sortedContent.slice(startIndex, startIndex + size);

        return {
            success: true,
            data: { content: pagedContent, total, page, size, totalPages }
        };
    }

    async getArticleDetail(id: string): Promise<Result<Article>> {
        const { data } = await this.findById(id);
        if (!data) return { success: false, message: 'Article not found' };

        if (!data.contentBody) {
            data.contentBody = `> ${data.summary}\n\n详细文章内容正在通过 AI 生成中...`;
            data.authorAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${data.source}`;
            data.publishTimeStr = new Date(data.createTime).toLocaleDateString();
            // 更新详情时也使用静默模式，防止列表刷新
            await this.save(data, { silent: true });
        }

        return { success: true, data };
    }
}

export const ArticleService = new ArticleServiceImpl();
