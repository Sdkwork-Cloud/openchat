import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawSubmolt, CrawSubmoltSubscriber, CrawSubmoltModerator } from '../entities/craw-submolt.entity';
import { CrawAgent } from '../entities/craw-agent.entity';

export interface CreateSubmoltDto {
  name: string;
  displayName: string;
  description?: string;
  allowCrypto?: boolean;
}

export interface UpdateSubmoltSettingsDto {
  description?: string;
  bannerColor?: string;
  themeColor?: string;
}

@Injectable()
export class CrawSubmoltService {
  constructor(
    @InjectRepository(CrawSubmolt)
    private submoltRepository: Repository<CrawSubmolt>,
    @InjectRepository(CrawSubmoltSubscriber)
    private subscriberRepository: Repository<CrawSubmoltSubscriber>,
    @InjectRepository(CrawSubmoltModerator)
    private moderatorRepository: Repository<CrawSubmoltModerator>,
    @InjectRepository(CrawAgent)
    private agentRepository: Repository<CrawAgent>,
  ) {}

  async create(apiKey: string, dto: CreateSubmoltDto): Promise<CrawSubmolt> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const existing = await this.submoltRepository.findOne({ where: { name: dto.name } });
    if (existing) throw new Error('Submolt name already exists');

    const submolt = this.submoltRepository.create({
      name: dto.name,
      displayName: dto.displayName,
      description: dto.description,
      allowCrypto: dto.allowCrypto ?? false,
      ownerId: agent.id,
    });

    const saved = await this.submoltRepository.save(submolt);

    const moderator = this.moderatorRepository.create({
      submoltId: saved.id,
      agentId: agent.id,
      role: 'owner',
    });
    await this.moderatorRepository.save(moderator);

    return saved;
  }

  async getAll(): Promise<CrawSubmolt[]> {
    return this.submoltRepository.find({ order: { subscriberCount: 'DESC' } });
  }

  async getByName(name: string): Promise<CrawSubmolt> {
    const submolt = await this.submoltRepository.findOne({ where: { name } });
    if (!submolt) throw new Error('Submolt not found');
    return submolt;
  }

  async subscribe(apiKey: string, name: string): Promise<void> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const submolt = await this.submoltRepository.findOne({ where: { name } });
    if (!submolt) throw new Error('Submolt not found');

    const existing = await this.subscriberRepository.findOne({
      where: { agentId: agent.id, submoltId: submolt.id },
    });

    if (!existing) {
      const subscriber = this.subscriberRepository.create({
        agentId: agent.id,
        submoltId: submolt.id,
      });
      await this.subscriberRepository.save(subscriber);

      submolt.subscriberCount++;
      await this.submoltRepository.save(submolt);
    }
  }

  async unsubscribe(apiKey: string, name: string): Promise<void> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const submolt = await this.submoltRepository.findOne({ where: { name } });
    if (!submolt) throw new Error('Submolt not found');

    const subscriber = await this.subscriberRepository.findOne({
      where: { agentId: agent.id, submoltId: submolt.id },
    });

    if (subscriber) {
      await this.subscriberRepository.remove(subscriber);

      submolt.subscriberCount = Math.max(0, submolt.subscriberCount - 1);
      await this.submoltRepository.save(submolt);
    }
  }

  async updateSettings(apiKey: string, name: string, dto: UpdateSubmoltSettingsDto): Promise<CrawSubmolt> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const submolt = await this.submoltRepository.findOne({ where: { name } });
    if (!submolt) throw new Error('Submolt not found');

    const isModerator = await this.moderatorRepository.findOne({
      where: { submoltId: submolt.id, agentId: agent.id },
    });

    if (!isModerator) throw new Error('Not authorized to update settings');

    if (dto.description !== undefined) submolt.description = dto.description;
    if (dto.bannerColor !== undefined) submolt.bannerColor = dto.bannerColor;
    if (dto.themeColor !== undefined) submolt.themeColor = dto.themeColor;

    return this.submoltRepository.save(submolt);
  }

  async uploadMedia(apiKey: string, name: string, file: string, type: 'avatar' | 'banner'): Promise<CrawSubmolt> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    const submolt = await this.submoltRepository.findOne({ where: { name } });
    if (!submolt) throw new Error('Submolt not found');

    const isModerator = await this.moderatorRepository.findOne({
      where: { submoltId: submolt.id, agentId: agent.id },
    });

    if (!isModerator) throw new Error('Not authorized to upload media');

    if (type === 'avatar') {
      submolt.avatar = file;
    } else {
      submolt.banner = file;
    }

    return this.submoltRepository.save(submolt);
  }

  async addModerator(apiKey: string, name: string, agentName: string, role: string = 'moderator'): Promise<void> {
    const owner = await this.agentRepository.findOne({ where: { apiKey } });
    if (!owner) throw new Error('Invalid API key');

    const submolt = await this.submoltRepository.findOne({ where: { name } });
    if (!submolt) throw new Error('Submolt not found');

    const isOwner = await this.moderatorRepository.findOne({
      where: { submoltId: submolt.id, agentId: owner.id, role: 'owner' },
    });
    if (!isOwner) throw new Error('Only owner can add moderators');

    const newMod = await this.agentRepository.findOne({ where: { name: agentName } });
    if (!newMod) throw new Error('Agent not found');

    const existing = await this.moderatorRepository.findOne({
      where: { submoltId: submolt.id, agentId: newMod.id },
    });

    if (!existing) {
      const moderator = this.moderatorRepository.create({
        submoltId: submolt.id,
        agentId: newMod.id,
        role,
      });
      await this.moderatorRepository.save(moderator);
    }
  }

  async removeModerator(apiKey: string, name: string, agentName: string): Promise<void> {
    const owner = await this.agentRepository.findOne({ where: { apiKey } });
    if (!owner) throw new Error('Invalid API key');

    const submolt = await this.submoltRepository.findOne({ where: { name } });
    if (!submolt) throw new Error('Submolt not found');

    const isOwner = await this.moderatorRepository.findOne({
      where: { submoltId: submolt.id, agentId: owner.id, role: 'owner' },
    });
    if (!isOwner) throw new Error('Only owner can remove moderators');

    const mod = await this.agentRepository.findOne({ where: { name: agentName } });
    if (!mod) throw new Error('Agent not found');

    const moderator = await this.moderatorRepository.findOne({
      where: { submoltId: submolt.id, agentId: mod.id },
    });

    if (moderator && moderator.role !== 'owner') {
      await this.moderatorRepository.remove(moderator);
    }
  }

  async getModerators(name: string): Promise<CrawAgent[]> {
    const submolt = await this.submoltRepository.findOne({ where: { name } });
    if (!submolt) throw new Error('Submolt not found');

    const moderators = await this.moderatorRepository.find({
      where: { submoltId: submolt.id },
      relations: ['agent'],
    });

    return moderators.map(m => m.agent);
  }

  async followAgent(apiKey: string, agentName: string): Promise<void> {
    const follower = await this.agentRepository.findOne({ where: { apiKey } });
    if (!follower) throw new Error('Invalid API key');

    const following = await this.agentRepository.findOne({ where: { name: agentName } });
    if (!following) throw new Error('Agent not found');

    // 这里应该有一个follow表，暂时简化处理
    follower.followingCount++;
    await this.agentRepository.save(follower);
  }

  async unfollowAgent(apiKey: string, agentName: string): Promise<void> {
    const follower = await this.agentRepository.findOne({ where: { apiKey } });
    if (!follower) throw new Error('Invalid API key');

    const following = await this.agentRepository.findOne({ where: { name: agentName } });
    if (!following) throw new Error('Agent not found');

    follower.followingCount = Math.max(0, follower.followingCount - 1);
    await this.agentRepository.save(follower);
  }

  async getFeed(apiKey: string, sort: string = 'hot', limit: number = 25): Promise<any[]> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) throw new Error('Invalid API key');

    // 获取订阅的submolts
    const subscriptions = await this.subscriberRepository.find({
      where: { agentId: agent.id },
    });
    const submoltIds = subscriptions.map(s => s.submoltId);

    // 获取关注列表 (简化)
    // 返回空列表，实际应该从follow表获取
    const posts = await this.submoltRepository
      .createQueryBuilder('submolt')
      .innerJoin('submolt.posts', 'post')
      .where('submolt.id IN (:...submoltIds)', { submoltIds })
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.submolt', 'submolt')
      .orderBy('post.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return posts;
  }
}
