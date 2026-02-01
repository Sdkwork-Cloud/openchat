import { Controller, Post, Get, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AIBotService } from './ai-bot.service';
import { AIBot, BotMessage } from './ai-bot.interface';

@ApiTags('AI Bot')
@Controller('ai-bots')
export class AIBotController {
  constructor(private readonly aiBotService: AIBotService) {}

  // 创建Bot
  @Post()
  @ApiOperation({ summary: 'Create a new AI Bot' })
  @ApiResponse({ status: 201, description: 'Bot created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        config: { type: 'object' },
        isActive: { type: 'boolean' },
      },
      required: ['name', 'description', 'type'],
    },
  })
  async createBot(@Body() bot: Omit<AIBot, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIBot> {
    return this.aiBotService.createBot(bot);
  }

  // 获取所有Bot
  @Get()
  @ApiOperation({ summary: 'Get all AI Bots' })
  @ApiResponse({ status: 200, description: 'Bots retrieved successfully' })
  async getBots(): Promise<AIBot[]> {
    return this.aiBotService.getBots();
  }

  // 获取单个Bot
  @Get(':id')
  @ApiOperation({ summary: 'Get an AI Bot by ID' })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  @ApiResponse({ status: 200, description: 'Bot retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async getBot(@Param('id') id: string): Promise<AIBot | null> {
    return this.aiBotService.getBot(id);
  }

  // 更新Bot
  @Put(':id')
  @ApiOperation({ summary: 'Update an AI Bot' })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        config: { type: 'object' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Bot updated successfully' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async updateBot(@Param('id') id: string, @Body() bot: Partial<AIBot>): Promise<AIBot> {
    return this.aiBotService.updateBot(id, bot);
  }

  // 删除Bot
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an AI Bot' })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  @ApiResponse({ status: 204, description: 'Bot deleted successfully' })
  async deleteBot(@Param('id') id: string): Promise<void> {
    await this.aiBotService.deleteBot(id);
  }

  // 激活Bot
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate an AI Bot' })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  @ApiResponse({ status: 200, description: 'Bot activated successfully' })
  async activateBot(@Param('id') id: string): Promise<{ success: boolean }> {
    const result = await this.aiBotService.activateBot(id);
    return { success: result };
  }

  // 停用Bot
  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate an AI Bot' })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  @ApiResponse({ status: 200, description: 'Bot deactivated successfully' })
  async deactivateBot(@Param('id') id: string): Promise<{ success: boolean }> {
    const result = await this.aiBotService.deactivateBot(id);
    return { success: result };
  }

  // 处理Bot消息
  @Post(':id/messages')
  @ApiOperation({ summary: 'Process a message with AI Bot' })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['userId', 'message'],
    },
  })
  @ApiResponse({ status: 200, description: 'Message processed successfully' })
  async processMessage(
    @Param('id') botId: string,
    @Body('userId') userId: string,
    @Body('message') message: string,
  ): Promise<BotMessage> {
    return this.aiBotService.processMessage(botId, userId, message);
  }
}
