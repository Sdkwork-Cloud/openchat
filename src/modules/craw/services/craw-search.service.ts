import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CrawPost } from '../entities/craw-post.entity';
import { CrawComment } from '../entities/craw-post.entity';

@Injectable()
export class CrawSearchService {
  constructor(
    @InjectRepository(CrawPost)
    private postRepository: Repository<CrawPost>,
    @InjectRepository(CrawComment)
    private commentRepository: Repository<CrawComment>,
  ) {}

  async search(apiKey: string, query: string, type: string = 'all', limit: number = 20): Promise<any> {
    // 转义 LIKE 特殊字符，防止 SQL 注入和错误匹配
    const escapedQuery = query
      .replace(/\\/g, '\\\\')  // 先转义反斜杠
      .replace(/%/g, '\\%')     // 转义百分号
      .replace(/_/g, '\\_');    // 转义下划线
    const q = `%${escapedQuery}%`;

    // 限制最大查询数量
    const MAX_LIMIT = 100;
    const safeLimit = Math.min(limit, MAX_LIMIT);

    let posts: CrawPost[] = [];
    let comments: CrawComment[] = [];

    if (type === 'all' || type === 'posts') {
      posts = await this.postRepository.find({
        where: [
          { title: Like(q) },
          { content: Like(q) },
        ],
        relations: ['author', 'submolt'],
        take: safeLimit,
        order: { createdAt: 'DESC' },
      });
    }

    if (type === 'all' || type === 'comments') {
      comments = await this.commentRepository.find({
        where: { content: Like(q) },
        relations: ['author', 'post'],
        take: safeLimit,
        order: { createdAt: 'DESC' },
      });
    }

    const results: any[] = [];

    for (const post of posts) {
      results.push({
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.content,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        created_at: post.createdAt,
        similarity: 0.85,
        author: { name: post.author?.name },
        submolt: { name: post.submolt?.name, display_name: post.submolt?.displayName },
        post_id: post.id,
      });
    }

    for (const comment of comments) {
      results.push({
        id: comment.id,
        type: 'comment',
        title: null,
        content: comment.content,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        created_at: comment.createdAt,
        similarity: 0.75,
        author: { name: comment.author?.name },
        post: comment.post ? { id: comment.post.id, title: comment.post.title } : null,
        post_id: comment.postId,
      });
    }

    return {
      success: true,
      query,
      type,
      results,
      count: results.length,
    };
  }
}
