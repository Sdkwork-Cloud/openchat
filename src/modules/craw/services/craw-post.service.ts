import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { CrawPost, CrawComment } from '../entities/craw-post.entity';
import { CrawAgent } from '../entities/craw-agent.entity';
import { CrawSubmolt } from '../entities/craw-submolt.entity';
import { CrawVote } from '../entities/craw-submolt.entity';

export interface CreatePostDto {
  submolt: string;
  title: string;
  content?: string;
  url?: string;
}

export interface CreateCommentDto {
  content: string;
  parentId?: string;
}

@Injectable()
export class CrawPostService {
  constructor(
    @InjectRepository(CrawPost)
    private postRepository: Repository<CrawPost>,
    @InjectRepository(CrawComment)
    private commentRepository: Repository<CrawComment>,
    @InjectRepository(CrawVote)
    private voteRepository: Repository<CrawVote>,
    @InjectRepository(CrawAgent)
    private agentRepository: Repository<CrawAgent>,
    @InjectRepository(CrawSubmolt)
    private submoltRepository: Repository<CrawSubmolt>,
  ) {}

  async createPost(apiKey: string, dto: CreatePostDto): Promise<CrawPost> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const submolt = await this.submoltRepository.findOne({ where: { name: dto.submolt } });
    if (!submolt) throw new Error('Submolt not found');

    const post = this.postRepository.create({
      title: dto.title,
      content: dto.content,
      url: dto.url,
      authorId: agent.id,
      submoltId: submolt.id,
    });

    return this.postRepository.save(post);
  }

  async getFeed(sort: string = 'hot', limit: number = 25, apiKey?: string): Promise<CrawPost[]> {
    const query = this.postRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.submolt', 'submolt')
      .where('post.isDeleted = :isDeleted', { isDeleted: false });

    switch (sort) {
      case 'new':
        query.orderBy('post.createdAt', 'DESC');
        break;
      case 'top':
        query.orderBy('post.upvotes', 'DESC');
        break;
      case 'rising':
        query.orderBy('post.createdAt', 'DESC').addOrderBy('post.upvotes', 'DESC');
        break;
      default:
        query.orderBy('(post.upvotes - post.downvotes)', 'DESC');
    }

    return query.take(limit).getMany();
  }

  async getSubmoltFeed(submoltName: string, sort: string = 'hot', limit: number = 25): Promise<CrawPost[]> {
    const query = this.postRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.submolt', 'submolt')
      .where('submolt.name = :name', { name: submoltName })
      .andWhere('post.isDeleted = :isDeleted', { isDeleted: false });

    switch (sort) {
      case 'new':
        query.orderBy('post.createdAt', 'DESC');
        break;
      case 'top':
        query.orderBy('post.upvotes', 'DESC');
        break;
      default:
        query.orderBy('(post.upvotes - post.downvotes)', 'DESC');
    }

    return query.take(limit).getMany();
  }

  async getPost(postId: string): Promise<CrawPost | null> {
    return this.postRepository.findOne({
      where: { id: postId },
      relations: ['author', 'submolt'],
    });
  }

  async deletePost(apiKey: string, postId: string): Promise<void> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    if (post.authorId !== agent.id) throw new Error('Not authorized');

    post.isDeleted = true;
    await this.postRepository.save(post);
  }

  async createComment(apiKey: string, postId: string, dto: CreateCommentDto): Promise<CrawComment> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const comment = this.commentRepository.create({
      content: dto.content,
      authorId: agent.id,
      postId: post.id,
      parentId: dto.parentId,
    });

    post.commentCount++;
    await this.postRepository.save(post);

    return this.commentRepository.save(comment);
  }

  async getComments(postId: string, sort: string = 'top'): Promise<CrawComment[]> {
    const query = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.parentId IS NULL');

    switch (sort) {
      case 'new':
        query.orderBy('comment.createdAt', 'DESC');
        break;
      case 'controversial':
        query.orderBy('comment.upvotes', 'ASC').addOrderBy('comment.downvotes', 'DESC');
        break;
      default:
        query.orderBy('comment.upvotes', 'DESC');
    }

    return query.getMany();
  }

  async upvotePost(apiKey: string, postId: string): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const existingVote = await this.voteRepository.findOne({
      where: { agentId: agent.id, targetId: postId, targetType: 'post', voteType: 'upvote' },
    });

    if (existingVote) {
      await this.voteRepository.remove(existingVote);
      post.upvotes--;
    } else {
      const downvote = await this.voteRepository.findOne({
        where: { agentId: agent.id, targetId: postId, targetType: 'post', voteType: 'downvote' },
      });
      if (downvote) {
        await this.voteRepository.remove(downvote);
        post.downvotes--;
      }

      const vote = this.voteRepository.create({
        agentId: agent.id,
        targetId: postId,
        targetType: 'post',
        voteType: 'upvote',
      });
      await this.voteRepository.save(vote);
      post.upvotes++;
    }

    await this.postRepository.save(post);

    return {
      success: true,
      message: 'Upvoted! 🦞',
      author: { name: post.author?.name },
      already_following: false,
      suggestion: '',
    };
  }

  async downvotePost(apiKey: string, postId: string): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const existingVote = await this.voteRepository.findOne({
      where: { agentId: agent.id, targetId: postId, targetType: 'post', voteType: 'downvote' },
    });

    if (existingVote) {
      await this.voteRepository.remove(existingVote);
      post.downvotes--;
    } else {
      const upvote = await this.voteRepository.findOne({
        where: { agentId: agent.id, targetId: postId, targetType: 'post', voteType: 'upvote' },
      });
      if (upvote) {
        await this.voteRepository.remove(upvote);
        post.upvotes--;
      }

      const vote = this.voteRepository.create({
        agentId: agent.id,
        targetId: postId,
        targetType: 'post',
        voteType: 'downvote',
      });
      await this.voteRepository.save(vote);
      post.downvotes++;
    }

    await this.postRepository.save(post);

    return {
      success: true,
      message: 'Downvoted!',
      author: { name: post.author?.name },
      already_following: false,
      suggestion: '',
    };
  }

  async upvoteComment(apiKey: string, commentId: string): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) throw new Error('Comment not found');

    const existingVote = await this.voteRepository.findOne({
      where: { agentId: agent.id, targetId: commentId, targetType: 'comment', voteType: 'upvote' },
    });

    if (existingVote) {
      await this.voteRepository.remove(existingVote);
      comment.upvotes--;
    } else {
      const downvote = await this.voteRepository.findOne({
        where: { agentId: agent.id, targetId: commentId, targetType: 'comment', voteType: 'downvote' },
      });
      if (downvote) {
        await this.voteRepository.remove(downvote);
        comment.downvotes--;
      }

      const vote = this.voteRepository.create({
        agentId: agent.id,
        targetId: commentId,
        targetType: 'comment',
        voteType: 'upvote',
      });
      await this.voteRepository.save(vote);
      comment.upvotes++;
    }

    await this.commentRepository.save(comment);

    return { success: true, message: 'Upvoted!' };
  }

  async pinPost(apiKey: string, postId: string): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['submolt'],
    });
    if (!post) throw new Error('Post not found');

    post.isPinned = true;
    post.pinnedAt = new Date();
    await this.postRepository.save(post);

    return { success: true, message: 'Post pinned!' };
  }

  async unpinPost(apiKey: string, postId: string): Promise<any> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    post.isPinned = false;
    await this.postRepository.save(post);

    return { success: true, message: 'Post unpinned!' };
  }
}
