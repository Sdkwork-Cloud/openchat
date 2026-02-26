import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawAgent } from '../entities/craw-agent.entity';
import * as crypto from 'crypto';

@Injectable()
export class CrawAgentService {
  constructor(
    @InjectRepository(CrawAgent)
    private agentRepository: Repository<CrawAgent>,
  ) {}

  async register(name: string, description: string): Promise<CrawAgent> {
    const existing = await this.agentRepository.findOne({ where: { name } });
    if (existing) {
      throw new Error('Agent name already exists');
    }

    const agent = this.agentRepository.create({
      name,
      description,
      apiKey: `craw_${this.generateApiKey()}`,
      claimUrl: `https://www.moltbook.com/claim/craw_${this.generateClaimId()}`,
      verificationCode: this.generateVerificationCode(),
    });

    return this.agentRepository.save(agent);
  }

  async getStatus(apiKey: string): Promise<{ status: string }> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) {
      throw new Error('Invalid API key');
    }

    return { status: agent.isClaimed ? 'claimed' : 'pending_claim' };
  }

  async getMe(apiKey: string): Promise<CrawAgent> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) {
      throw new Error('Invalid API key');
    }
    return agent;
  }

  async getProfile(name: string): Promise<CrawAgent> {
    const agent = await this.agentRepository.findOne({ where: { name } });
    if (!agent) {
      throw new Error('Agent not found');
    }
    return agent;
  }

  async updateProfile(apiKey: string, data: { description?: string; metadata?: string }): Promise<CrawAgent> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) {
      throw new Error('Invalid API key');
    }

    if (data.description) agent.description = data.description;
    if (data.metadata) agent.metadata = data.metadata;

    return this.agentRepository.save(agent);
  }

  async updateAvatar(apiKey: string, avatar: string): Promise<CrawAgent> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) {
      throw new Error('Invalid API key');
    }

    agent.avatar = avatar;
    return this.agentRepository.save(agent);
  }

  async deleteAvatar(apiKey: string): Promise<void> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) {
      throw new Error('Invalid API key');
    }

    agent.avatar = null as any;
    await this.agentRepository.save(agent);
  }

  async setupOwnerEmail(apiKey: string, email: string): Promise<void> {
    // 实现邮箱设置逻辑
  }

  async claim(apiKey: string, claimData: any): Promise<void> {
    const agent = await this.agentRepository.findOne({ where: { apiKey } });
    if (!agent) {
      throw new Error('Invalid API key');
    }

    agent.isClaimed = true;
    agent.ownerXHandle = claimData.x_handle;
    agent.ownerXName = claimData.x_name;
    agent.ownerXAvatar = claimData.x_avatar;
    agent.ownerXBio = claimData.x_bio;
    agent.ownerXFollowerCount = claimData.x_follower_count;
    agent.ownerXFollowingCount = claimData.x_following_count;
    agent.ownerXVerified = claimData.x_verified;

    await this.agentRepository.save(agent);
  }

  private generateApiKey(): string {
    // 使用加密安全的随机字符串生成API Key
    return crypto.randomBytes(16).toString('hex');
  }

  private generateClaimId(): string {
    // 使用加密安全的随机字符串生成Claim ID
    return crypto.randomBytes(8).toString('hex');
  }

  private generateVerificationCode(): string {
    // 使用加密安全的随机字符串生成验证码
    const randomBytes = crypto.randomBytes(4);
    const code = randomBytes.toString('hex').substring(0, 4).toUpperCase();
    return `reef-${code}`;
  }
}
