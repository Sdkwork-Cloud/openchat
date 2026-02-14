import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export enum AgentType {
  CHAT = 'chat',
  TASK = 'task',
  KNOWLEDGE = 'knowledge',
  ASSISTANT = 'assistant',
  CUSTOM = 'custom',
}

export enum AgentStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  CHATTING = 'chatting',
  EXECUTING = 'executing',
  ERROR = 'error',
  DISABLED = 'disabled',
  MAINTENANCE = 'maintenance',
}

export class AgentConfig {
  @ApiPropertyOptional({ description: '模型名称' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: '温度参数', minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: '最大Token数' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ description: '系统提示词' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ description: '欢迎消息' })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: '工具列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @ApiPropertyOptional({ description: '技能列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'LLM配置' })
  @IsOptional()
  @IsObject()
  llm?: {
    provider: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  };
}

export class CreateAgent {
  @ApiProperty({ description: '智能体名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '智能体描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '智能体头像URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: '智能体类型', enum: AgentType })
  @IsOptional()
  @IsEnum(AgentType)
  type?: AgentType;

  @ApiPropertyOptional({ description: '智能体配置' })
  @IsOptional()
  @IsObject()
  config?: AgentConfig;

  @ApiPropertyOptional({ description: '是否公开' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateAgent {
  @ApiPropertyOptional({ description: '智能体名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '智能体描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '智能体头像URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: '智能体类型', enum: AgentType })
  @IsOptional()
  @IsEnum(AgentType)
  type?: AgentType;

  @ApiPropertyOptional({ description: '智能体配置' })
  @IsOptional()
  @IsObject()
  config?: AgentConfig;

  @ApiPropertyOptional({ description: '是否公开' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: '智能体状态', enum: AgentStatus })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;
}

export class CreateSession {
  @ApiPropertyOptional({ description: '会话标题' })
  @IsOptional()
  @IsString()
  title?: string;
}

export class SendMessage {
  @ApiProperty({ description: '消息内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: '是否流式输出' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

export class AddTool {
  @ApiProperty({ description: '工具名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '工具描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '工具参数Schema' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '工具配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class AddSkill {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ description: '技能名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '技能描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '技能版本' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: '技能配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class ExecuteSkill {
  @ApiProperty({ description: '技能ID' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiPropertyOptional({ description: '技能输入参数' })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
