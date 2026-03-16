import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BotOpenStatsDto {
  @ApiProperty({ description: 'Bot 发送消息总数', example: 1024 })
  totalMessagesSent: number;

  @ApiProperty({ description: 'Bot 接收消息总数', example: 980 })
  totalMessagesReceived: number;

  @ApiProperty({ description: 'Bot 交互用户总数', example: 340 })
  totalUsersInteracted: number;

  @ApiProperty({ description: 'Bot 加入群组总数', example: 12 })
  totalGroupsJoined: number;

  @ApiProperty({ description: 'Bot 执行命令总数', example: 440 })
  totalCommandsExecuted: number;

  @ApiProperty({ description: 'Bot 交互总数', example: 2100 })
  totalInteractions: number;

  @ApiPropertyOptional({
    description: '最后活跃时间',
    example: '2026-03-07T08:30:00.000Z',
  })
  lastActivityAt?: Date;
}

export class BotOpenProfileResponseDto {
  @ApiProperty({ description: 'Bot ID', example: '9ac47057-2f34-4ad5-8f0e-cc2d897d13ff' })
  id: string;

  @ApiProperty({ description: 'Bot 名称', example: 'Support Helper' })
  name: string;

  @ApiProperty({ description: 'Bot 用户名', example: 'support-helper' })
  username: string;

  @ApiProperty({ description: 'Bot App ID', example: 'a31f2ea6cfc84dd79f03a5987f5f7b8a' })
  appId: string;

  @ApiPropertyOptional({ description: 'Bot 描述' })
  description?: string;

  @ApiPropertyOptional({ description: 'Bot 头像 URL' })
  avatar?: string;

  @ApiPropertyOptional({ description: 'Bot 主页 URL' })
  homepage?: string;

  @ApiPropertyOptional({ description: '开发者名称' })
  developerName?: string;

  @ApiPropertyOptional({ description: '开发者邮箱' })
  developerEmail?: string;

  @ApiProperty({ description: 'Intents 位掩码', example: 513 })
  intents: number;

  @ApiProperty({
    description: 'Bot 权限范围',
    type: [String],
    example: ['bot:basic', 'webhook'],
  })
  scopes: string[];

  @ApiProperty({
    description: 'Bot 状态',
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    example: 'active',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Bot 统计信息',
    type: () => BotOpenStatsDto,
  })
  stats?: BotOpenStatsDto;

  @ApiProperty({ description: '创建时间', example: '2026-03-01T08:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2026-03-07T08:00:00.000Z' })
  updatedAt: Date;
}

export class BotOpenWebhookStatsResponseDto {
  @ApiProperty({ description: '是否已配置 webhook', example: true })
  configured: boolean;

  @ApiPropertyOptional({ description: 'Webhook URL', example: 'https://example.com/webhook' })
  url?: string;

  @ApiProperty({
    description: '订阅的事件列表',
    type: [String],
    example: ['message.created', 'bot.webhook.test'],
  })
  events: string[];

  @ApiProperty({ description: '待重试任务数量', example: 0 })
  pendingRetries: number;
}

export class BotOpenWebhookTestEventRequestDto {
  @ApiPropertyOptional({
    description: '事件类型，不传则默认 bot.webhook.test',
    example: 'bot.webhook.test',
  })
  eventType?: string;

  @ApiPropertyOptional({
    description: '测试事件负载',
    type: 'object',
    additionalProperties: true,
    example: { ping: true },
  })
  data?: Record<string, unknown>;
}

export class BotOpenWebhookResultResponseDto {
  @ApiProperty({ description: '是否发送成功', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'Webhook 响应状态码', example: 200 })
  statusCode?: number;

  @ApiPropertyOptional({ description: '错误信息', example: 'Webhook not configured' })
  error?: string;

  @ApiProperty({ description: '重试次数', example: 0 })
  retryCount: number;

  @ApiProperty({ description: '耗时（毫秒）', example: 18 })
  latency: number;
}
