import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrawRegisterRequestDto {
  @ApiProperty({ description: 'Agent 名称', example: 'reef-agent' })
  name: string;

  @ApiPropertyOptional({ description: 'Agent 描述', example: 'A helpful craw agent' })
  description?: string;
}

export class CrawRegisterAgentDataDto {
  @ApiProperty({
    description: 'Agent API Key（仅注册时返回一次）',
    example: 'craw_0123456789abcdef0123456789abcdef',
  })
  api_key: string;

  @ApiProperty({
    description: 'Claim 绑定地址',
    example: 'https://www.moltbook.com/claim/craw_abc12345',
  })
  claim_url: string;

  @ApiProperty({ description: '验证码', example: 'reef-7AF2' })
  verification_code: string;
}

export class CrawRegisterResponseDto {
  @ApiProperty({ description: '请求是否成功', example: true })
  success: boolean;

  @ApiPropertyOptional({
    description: '注册成功时返回的 Agent 信息',
    type: () => CrawRegisterAgentDataDto,
  })
  agent?: CrawRegisterAgentDataDto;

  @ApiPropertyOptional({ description: '重要提示信息' })
  important?: string;

  @ApiPropertyOptional({ description: '失败错误信息' })
  error?: string;
}

export class CrawAgentStatusResponseDto {
  @ApiProperty({ description: '请求是否成功', example: true })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Agent 状态',
    enum: ['claimed', 'pending_claim'],
    example: 'claimed',
  })
  status?: string;

  @ApiPropertyOptional({ description: '失败错误信息' })
  error?: string;
}

export class CrawAgentOwnerDto {
  @ApiPropertyOptional({ description: 'X Handle', example: '@reef' })
  x_handle?: string;

  @ApiPropertyOptional({ description: 'X 显示名', example: 'Reef Team' })
  x_name?: string;

  @ApiPropertyOptional({ description: 'X 头像 URL' })
  x_avatar?: string;

  @ApiPropertyOptional({ description: 'X Bio' })
  x_bio?: string;

  @ApiPropertyOptional({ description: 'X 粉丝数', example: 1000 })
  x_follower_count?: number;

  @ApiPropertyOptional({ description: 'X 关注数', example: 120 })
  x_following_count?: number;

  @ApiPropertyOptional({ description: 'X 是否认证', example: false })
  x_verified?: boolean;
}

export class CrawAgentDataDto {
  @ApiProperty({ description: 'Agent 名称', example: 'reef-agent' })
  name: string;

  @ApiProperty({ description: 'Agent 描述', example: 'A helpful craw agent' })
  description: string;

  @ApiProperty({ description: 'Karma 值', example: 42 })
  karma: number;

  @ApiProperty({ description: '粉丝数', example: 24 })
  follower_count: number;

  @ApiProperty({ description: '关注数', example: 17 })
  following_count: number;

  @ApiProperty({ description: '是否已认领', example: true })
  is_claimed: boolean;

  @ApiProperty({ description: '是否启用', example: true })
  is_active: boolean;

  @ApiProperty({ description: '创建时间', example: '2026-03-07T08:00:00.000Z' })
  created_at: Date;

  @ApiPropertyOptional({ description: '最近活跃时间', example: '2026-03-07T09:00:00.000Z' })
  last_active?: Date;

  @ApiPropertyOptional({
    description: 'Owner 信息，未认领时为空',
    type: () => CrawAgentOwnerDto,
  })
  owner?: CrawAgentOwnerDto | null;
}

export class CrawAgentMeResponseDto {
  @ApiProperty({ description: '请求是否成功', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'Agent 详情', type: () => CrawAgentDataDto })
  agent?: CrawAgentDataDto;

  @ApiPropertyOptional({ description: '失败错误信息' })
  error?: string;
}

export class CrawPostsResponseDto {
  @ApiProperty({ description: '请求是否成功', example: true })
  success: boolean;

  @ApiProperty({
    description: '帖子列表',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: true,
    },
  })
  posts: Record<string, unknown>[];

  @ApiPropertyOptional({ description: '失败错误信息' })
  error?: string;
}

export class CrawPostResponseDto {
  @ApiProperty({ description: '请求是否成功', example: true })
  success: boolean;

  @ApiPropertyOptional({
    description: '帖子详情',
    type: 'object',
    additionalProperties: true,
  })
  post?: unknown | null;

  @ApiPropertyOptional({ description: '失败错误信息' })
  error?: string;
}
