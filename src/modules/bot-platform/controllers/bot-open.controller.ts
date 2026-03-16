import { Body, Controller, ForbiddenException, Get, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MultiAuthGuard, RequireAuthStrategies, RequireBotAuth, RequireScopes } from '../../../common/auth/guards/multi-auth.guard';
import { AuthenticatedRequest } from '../../../common/auth/interfaces/authenticated-request.interface';
import { BotService } from '../services/bot.service';
import { WebhookService } from '../services/webhook.service';
import {
  BotOpenProfileResponseDto,
  BotOpenWebhookResultResponseDto,
  BotOpenWebhookStatsResponseDto,
  BotOpenWebhookTestEventRequestDto,
} from '../dto/bot-open.dto';

@ApiTags('bots-open')
@ApiBearerAuth('bot-token')
@UseGuards(MultiAuthGuard)
@RequireBotAuth()
@RequireAuthStrategies('bot-token')
@Controller('bots/open')
export class BotOpenController {
  constructor(
    private readonly botService: BotService,
    private readonly webhookService: WebhookService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前 Bot 信息（Bot Token）' })
  @ApiOkResponse({ description: '获取成功', type: BotOpenProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token 缺失或无效' })
  @ApiForbiddenResponse({ description: '认证策略不匹配或权限不足' })
  async getCurrentBot(
    @Request() req: AuthenticatedRequest,
  ): Promise<BotOpenProfileResponseDto> {
    const botId = this.getBotId(req);
    return this.botService.getBotById(botId);
  }

  @Get('webhook/stats')
  @RequireScopes('webhook')
  @ApiOperation({ summary: '获取当前 Bot 的 Webhook 统计（Bot Token）' })
  @ApiOkResponse({ description: '获取成功', type: BotOpenWebhookStatsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token 缺失或无效' })
  @ApiForbiddenResponse({ description: '认证策略不匹配或 scope 不足（需要 webhook）' })
  async getWebhookStats(
    @Request() req: AuthenticatedRequest,
  ): Promise<BotOpenWebhookStatsResponseDto> {
    const botId = this.getBotId(req);
    return this.webhookService.getWebhookStats(botId);
  }

  @Post('webhook/test-event')
  @RequireScopes('webhook')
  @ApiOperation({ summary: '触发当前 Bot 的 Webhook 测试事件（Bot Token）' })
  @ApiBody({ type: BotOpenWebhookTestEventRequestDto })
  @ApiCreatedResponse({ description: '触发成功', type: BotOpenWebhookResultResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token 缺失或无效' })
  @ApiForbiddenResponse({ description: '认证策略不匹配或 scope 不足（需要 webhook）' })
  async sendWebhookTestEvent(
    @Request() req: AuthenticatedRequest,
    @Body() body: BotOpenWebhookTestEventRequestDto,
  ): Promise<BotOpenWebhookResultResponseDto> {
    const botId = this.getBotId(req);
    const eventType = body.eventType || 'bot.webhook.test';
    return this.webhookService.sendEvent(botId, eventType, body.data || {});
  }

  private getBotId(req: AuthenticatedRequest): string {
    const botId = req.auth.botId;
    if (!botId) {
      throw new ForbiddenException('Bot authentication required');
    }
    return botId;
  }
}
