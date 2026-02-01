import { Injectable, Logger, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { BotEntity, BotIntent, BotScope, BotStatus, BotStats, WebhookConfig } from '../entities/bot.entity';

/**
 * Bot 创建参数
 */
export interface CreateBotParams {
  name: string;
  username: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents?: BotIntent[];
  scopes?: BotScope[];
  createdBy: string;
}

/**
 * Bot 更新参数
 */
export interface UpdateBotParams {
  name?: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents?: BotIntent[];
  scopes?: BotScope[];
  status?: BotStatus;
}

/**
 * Bot Token 信息
 */
export interface BotTokenInfo {
  token: string;                 // 明文 Token（仅创建时返回）
  tokenHash: string;             // Token 哈希
  appId: string;                 // 应用 ID
}

/**
 * Bot 响应（不包含敏感信息）
 */
export interface BotResponse {
  id: string;
  name: string;
  username: string;
  appId: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents: number;
  scopes: BotScope[];
  status: BotStatus;
  stats?: BotStats;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bot 服务
 * 管理 Bot 的注册、认证、生命周期
 */
@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @InjectRepository(BotEntity)
    private botRepository: Repository<BotEntity>,
  ) {}

  /**
   * 创建 Bot
   * 生成唯一的 appId 和 token
   */
  async createBot(params: CreateBotParams): Promise<{ bot: BotResponse; token: string }> {
    // 检查用户名是否已存在
    const existingBot = await this.botRepository.findOne({
      where: { username: params.username }
    });

    if (existingBot) {
      throw new ConflictException(`Bot username '${params.username}' already exists`);
    }

    // 生成 Token 和 AppId
    const { token, tokenHash, appId } = await this.generateToken();

    // 计算 intents 位掩码
    const intents = params.intents?.reduce((acc, intent) => acc | intent, 0) || 0;

    // 创建 Bot 实体
    const bot = this.botRepository.create({
      ...params,
      appId,
      tokenHash,
      intents,
      scopes: params.scopes || ['bot:basic'],
      status: 'inactive',          // 默认未激活
      stats: {
        totalMessagesSent: 0,
        totalMessagesReceived: 0,
        totalUsersInteracted: 0,
        totalGroupsJoined: 0,
        totalCommandsExecuted: 0,
        totalInteractions: 0
      }
    });

    const savedBot = await this.botRepository.save(bot);

    this.logger.log(`Bot created: ${savedBot.username} (${savedBot.appId})`);

    return {
      bot: this.toBotResponse(savedBot),
      token  // 仅创建时返回明文 Token
    };
  }

  /**
   * 获取 Bot 列表
   */
  async getBots(options: {
    createdBy?: string;
    status?: BotStatus;
    page?: number;
    limit?: number;
  } = {}): Promise<{ bots: BotResponse[]; total: number }> {
    const { createdBy, status, page = 1, limit = 20 } = options;

    const queryBuilder = this.botRepository.createQueryBuilder('bot');

    if (createdBy) {
      queryBuilder.andWhere('bot.createdBy = :createdBy', { createdBy });
    }

    if (status) {
      queryBuilder.andWhere('bot.status = :status', { status });
    }

    // 排除已删除的
    queryBuilder.andWhere('bot.status != :deletedStatus', { deletedStatus: 'deleted' });

    const [bots, total] = await queryBuilder
      .orderBy('bot.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      bots: bots.map(bot => this.toBotResponse(bot)),
      total
    };
  }

  /**
   * 获取 Bot 详情
   */
  async getBotById(id: string): Promise<BotResponse> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status === 'deleted') {
      throw new NotFoundException(`Bot with id '${id}' not found`);
    }

    return this.toBotResponse(bot);
  }

  /**
   * 通过用户名获取 Bot
   */
  async getBotByUsername(username: string): Promise<BotResponse> {
    const bot = await this.botRepository.findOne({ where: { username } });

    if (!bot || bot.status === 'deleted') {
      throw new NotFoundException(`Bot with username '${username}' not found`);
    }

    return this.toBotResponse(bot);
  }

  /**
   * 通过 AppId 获取 Bot
   */
  async getBotByAppId(appId: string): Promise<BotResponse> {
    const bot = await this.botRepository.findOne({ where: { appId } });

    if (!bot || bot.status === 'deleted') {
      throw new NotFoundException(`Bot with appId '${appId}' not found`);
    }

    return this.toBotResponse(bot);
  }

  /**
   * 验证 Bot Token
   * 返回 Bot 实体（如果验证成功）
   */
  async verifyToken(token: string): Promise<BotEntity | null> {
    // Token 格式: oc_bot_<appId>_<random32>
    const parts = token.split('_');
    if (parts.length !== 4 || parts[0] !== 'oc' || parts[1] !== 'bot') {
      return null;
    }

    const appId = parts[2];

    // 查找 Bot（包含 tokenHash）
    const bot = await this.botRepository.findOne({
      where: { appId },
      select: ['id', 'appId', 'tokenHash', 'status', 'intents', 'scopes', 'name', 'username', 'webhook'],
    });

    if (!bot || bot.status !== 'active') {
      return null;
    }

    // 验证 Token 哈希
    const isValid = await bcrypt.compare(token, bot.tokenHash);

    return isValid ? bot : null;
  }

  /**
   * 更新 Bot
   */
  async updateBot(id: string, userId: string, params: UpdateBotParams): Promise<BotResponse> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status === 'deleted') {
      throw new NotFoundException(`Bot with id '${id}' not found`);
    }

    // 检查权限（只有创建者或管理员可以更新）
    if (bot.createdBy !== userId && !bot.isAdmin()) {
      throw new ForbiddenException('You do not have permission to update this bot');
    }

    // 更新字段
    if (params.name !== undefined) bot.name = params.name;
    if (params.description !== undefined) bot.description = params.description;
    if (params.avatar !== undefined) bot.avatar = params.avatar;
    if (params.homepage !== undefined) bot.homepage = params.homepage;
    if (params.developerName !== undefined) bot.developerName = params.developerName;
    if (params.developerEmail !== undefined) bot.developerEmail = params.developerEmail;
    if (params.intents !== undefined) {
      bot.intents = params.intents.reduce((acc, intent) => acc | intent, 0);
    }
    if (params.scopes !== undefined) bot.scopes = params.scopes;
    if (params.status !== undefined) {
      bot.status = params.status;
      if (params.status === 'active' && !bot.activatedAt) {
        bot.activatedAt = new Date();
      }
    }

    const updatedBot = await this.botRepository.save(bot);

    this.logger.log(`Bot updated: ${updatedBot.username}`);

    return this.toBotResponse(updatedBot);
  }

  /**
   * 重新生成 Token
   */
  async regenerateToken(id: string, userId: string): Promise<{ token: string }> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status === 'deleted') {
      throw new NotFoundException(`Bot with id '${id}' not found`);
    }

    // 检查权限
    if (bot.createdBy !== userId && !bot.isAdmin()) {
      throw new ForbiddenException('You do not have permission to regenerate token');
    }

    // 生成新 Token
    const { token, tokenHash } = await this.generateToken(bot.appId);

    bot.tokenHash = tokenHash;
    bot.lastTokenRotatedAt = new Date();

    await this.botRepository.save(bot);

    this.logger.log(`Token regenerated for bot: ${bot.username}`);

    return { token };
  }

  /**
   * 删除 Bot（软删除）
   */
  async deleteBot(id: string, userId: string): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status === 'deleted') {
      throw new NotFoundException(`Bot with id '${id}' not found`);
    }

    // 检查权限
    if (bot.createdBy !== userId && !bot.isAdmin()) {
      throw new ForbiddenException('You do not have permission to delete this bot');
    }

    bot.status = 'deleted';
    bot.deletedBy = userId;
    bot.deletedAt = new Date();

    await this.botRepository.save(bot);

    this.logger.log(`Bot deleted: ${bot.username}`);
  }

  /**
   * 设置 Webhook
   */
  async setWebhook(id: string, userId: string, config: WebhookConfig): Promise<BotResponse> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status === 'deleted') {
      throw new NotFoundException(`Bot with id '${id}' not found`);
    }

    // 检查权限
    if (bot.createdBy !== userId && !bot.isAdmin()) {
      throw new ForbiddenException('You do not have permission to set webhook');
    }

    // 验证 URL 必须是 HTTPS
    if (!config.url.startsWith('https://')) {
      throw new ForbiddenException('Webhook URL must use HTTPS');
    }

    bot.webhook = config;

    const updatedBot = await this.botRepository.save(bot);

    this.logger.log(`Webhook set for bot: ${bot.username}`);

    return this.toBotResponse(updatedBot);
  }

  /**
   * 删除 Webhook
   */
  async deleteWebhook(id: string, userId: string): Promise<BotResponse> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status === 'deleted') {
      throw new NotFoundException(`Bot with id '${id}' not found`);
    }

    // 检查权限
    if (bot.createdBy !== userId && !bot.isAdmin()) {
      throw new ForbiddenException('You do not have permission to delete webhook');
    }

    bot.webhook = undefined;

    const updatedBot = await this.botRepository.save(bot);

    this.logger.log(`Webhook deleted for bot: ${bot.username}`);

    return this.toBotResponse(updatedBot);
  }

  /**
   * 更新 Bot 统计信息
   */
  async updateStats(id: string, updates: Partial<BotStats>): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status !== 'active') {
      return;
    }

    bot.updateStats(updates);
    await this.botRepository.save(bot);
  }

  /**
   * 增加消息发送计数
   */
  async incrementMessagesSent(id: string): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status !== 'active') {
      return;
    }

    bot.incrementMessagesSent();
    await this.botRepository.save(bot);
  }

  /**
   * 增加消息接收计数
   */
  async incrementMessagesReceived(id: string): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id } });

    if (!bot || bot.status !== 'active') {
      return;
    }

    bot.incrementMessagesReceived();
    await this.botRepository.save(bot);
  }

  // ========== 私有方法 ==========

  /**
   * 生成 Token
   */
  private async generateToken(existingAppId?: string): Promise<BotTokenInfo> {
    // 生成 AppId（如果未提供）
    const appId = existingAppId || crypto.randomBytes(16).toString('hex');

    // 生成随机 Token
    const randomPart = crypto.randomBytes(32).toString('hex');
    const token = `oc_bot_${appId}_${randomPart}`;

    // 哈希 Token
    const tokenHash = await bcrypt.hash(token, 10);

    return { token, tokenHash, appId };
  }

  /**
   * 转换为 Bot 响应（移除敏感信息）
   */
  private toBotResponse(bot: BotEntity): BotResponse {
    return {
      id: bot.id,
      name: bot.name,
      username: bot.username,
      appId: bot.appId,
      description: bot.description,
      avatar: bot.avatar,
      homepage: bot.homepage,
      developerName: bot.developerName,
      developerEmail: bot.developerEmail,
      intents: bot.intents,
      scopes: bot.scopes,
      status: bot.status,
      stats: bot.stats,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt
    };
  }
}
