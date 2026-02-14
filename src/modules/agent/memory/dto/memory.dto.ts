import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';

export enum MemoryType {
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
  WORKING = 'working',
}

export enum MemorySource {
  CONVERSATION = 'conversation',
  DOCUMENT = 'document',
  SYSTEM = 'system',
  USER = 'user',
  KNOWLEDGE = 'knowledge',
}

export class StoreMemoryDto {
  @ApiProperty({ description: 'Memory content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Memory type', enum: MemoryType })
  @IsOptional()
  @IsEnum(MemoryType)
  type?: MemoryType;

  @ApiPropertyOptional({ description: 'Memory source', enum: MemorySource })
  @IsOptional()
  @IsEnum(MemorySource)
  source?: MemorySource;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SearchMemoryDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ description: 'Memory type', enum: MemoryType })
  @IsOptional()
  @IsEnum(MemoryType)
  type?: MemoryType;

  @ApiPropertyOptional({ description: 'Result limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;
}

export class AddKnowledgeDocumentDto {
  @ApiProperty({ description: 'Document title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Document content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Source path' })
  @IsOptional()
  @IsString()
  sourcePath?: string;

  @ApiPropertyOptional({ description: 'Source type' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SearchKnowledgeDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ description: 'Result limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;
}
