import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const q = `%${query}%`;

    let posts: CrawPost[] = [];
    let comments: CrawComment[] = [];

    if (type === 'all' || type === 'posts') {
      posts = await this.postRepository.find({
        where: [
          { title: q },
          { content: q },
        ],
        relations: ['author', 'submolt'],
        take: limit,
        order: { createdAt: 'DESC' },
      });
    }

    if (type === 'all' || type === 'comments') {
      comments = await this.commentRepository.find({
        where: { content: q },
        relations: ['author', 'post'],
        take: limit,
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
