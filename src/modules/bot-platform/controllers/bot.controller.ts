import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import { BotService, CreateBotParams, UpdateBotParams, BotResponse } from '../services/bot.service';
import { WebhookConfig, BotScope } from '../entities/bot.entity';

/**
 * 创建 Bot DTO
 */
class CreateBotDto {
  name: string;
  username: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents?: number[];
  scopes?: BotScope[];
}

/**
 * 更新 Bot DTO
 */
class UpdateBotDto {
  name?: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents?: number[];
  scopes?: BotScope[];
  status?: 'active' | 'inactive' | 'suspended';
}

/**
 * 设置 Webhook DTO
 */
class SetWebhookDto {
  url: string;
  events: string[];
  filters?: {
    conversations?: string[];
    users?: string[];
    groups?: string[];
  };
  retryPolicy?: {
    maxRetries: number;
    backoffType: 'fixed' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };
  timeout?: number;
}

/**
 * Bot 控制器
 * 提供 Bot 管理 API
 */
@ApiTags('bots')
@Controller('v1/bots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BotController {
  constructor(private readonly botService: BotService) {}

  /**
   * 创建 Bot
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建 Bot' })
  @ApiResponse({ status: 201, description: 'Bot 创建成功' })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async createBot(
    @Body() dto: CreateBotDto,
    @Request() req: { user: { userId: string } },
  ): Promise<{ bot: BotResponse; token: string }> {
    const params: CreateBotParams = {
      ...dto,
      createdBy: req.user.userId,
    };
    return this.botService.createBot(params);
  }

  /**
   * 获取 Bot 列表
   */
  @Get()
  @ApiOperation({ summary: '获取 Bot 列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getBots(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Request() req?: { user: { userId: string } },
  ): Promise<{ bots: BotResponse[]; total: number }> {
    return this.botService.getBots({
      createdBy: req!.user.userId,
      status: status as any,
      page: page ? parseInt(page as any, 10) : 1,
      limit: limit ? parseInt(limit as any, 10) : 20,
    });
  }

  /**
   * 获取 Bot 详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取 Bot 详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: 'Bot 不存在' })
  async getBotById(@Param('id') id: string): Promise<BotResponse> {
    return this.botService.getBotById(id);
  }

  /**
   * 更新 Bot
   */
  @Put(':id')
  @ApiOperation({ summary: '更新 Bot' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: 'Bot 不存在' })
  @ApiResponse({ status: 403, description: '无权限' })
  async updateBot(
    @Param('id') id: string,
    @Body() dto: UpdateBotDto,
    @Request() req: { user: { userId: string } },
  ): Promise<BotResponse> {
    return this.botService.updateBot(id, req.user.userId, dto);
  }

  /**
   * 重新生成 Token
   */
  @Post(':id/regenerate-token')
  @ApiOperation({ summary: '重新生成 Bot Token' })
  @ApiResponse({ status: 200, description: 'Token 重新生成成功' })
  @ApiResponse({ status: 404, description: 'Bot 不存在' })
  @ApiResponse({ status: 403, description: '无权限' })
  async regenerateToken(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ): Promise<{ token: string }> {
    return this.botService.regenerateToken(id, req.user.userId);
  }

  /**
   * 删除 Bot
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 Bot' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: 'Bot 不存在' })
  @ApiResponse({ status: 403, description: '无权限' })
  async deleteBot(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ): Promise<void> {
    await this.botService.deleteBot(id, req.user.userId);
  }

  /**
   * 设置 Webhook
   */
  @Post(':id/webhook')
  @ApiOperation({ summary: '设置 Webhook' })
  @ApiResponse({ status: 200, description: 'Webhook 设置成功' })
  @ApiResponse({ status: 404, description: 'Bot 不存在' })
  @ApiResponse({ status: 403, description: '无权限' })
  async setWebhook(
    @Param('id') id: string,
    @Body() dto: SetWebhookDto,
    @Request() req: { user: { userId: string } },
  ): Promise<BotResponse> {
    // 生成签名密钥
    const secret = require('crypto').randomBytes(32).toString('hex');

    const config: WebhookConfig = {
      url: dto.url,
      secret,
      events: dto.events,
      filters: dto.filters,
      retryPolicy: dto.retryPolicy || {
        maxRetries: 3,
        backoffType: 'exponential',
        initialDelay: 1000,
        maxDelay: 30000,
      },
      timeout: dto.timeout || 30000,
    };

    return this.botService.setWebhook(id, req.user.userId, config);
  }

  /**
   * 删除 Webhook
   */
  @Delete(':id/webhook')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 Webhook' })
  @ApiResponse({ status: 204, description: 'Webhook 删除成功' })
  @ApiResponse({ status: 404, description: 'Bot 不存在' })
  @ApiResponse({ status: 403, description: '无权限' })
  async deleteWebhook(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ): Promise<void> {
    await this.botService.deleteWebhook(id, req.user.userId);
  }
}
