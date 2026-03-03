import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimelineVisibility } from '../timeline.interface';

export class TimelineMediaItemDto {
  @ApiProperty({
    enum: ['image', 'video', 'file', 'link'],
    description: 'Media type',
  })
  @IsString()
  type: 'image' | 'video' | 'file' | 'link';

  @ApiProperty({ description: 'Media URL' })
  @IsString()
  @MaxLength(2048)
  url: string;

  @ApiPropertyOptional({ description: 'Media width' })
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ description: 'Media height' })
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ description: 'Media duration (seconds)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Video/file cover URL' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'Extended metadata' })
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;
}

export class CreateTimelinePostDto {
  @ApiPropertyOptional({ description: 'Post text content' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @ApiPropertyOptional({
    description: 'Post media list',
    type: [TimelineMediaItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TimelineMediaItemDto)
  media?: TimelineMediaItemDto[];

  @ApiProperty({
    enum: TimelineVisibility,
    default: TimelineVisibility.FRIENDS,
    description: 'Post visibility scope',
  })
  @IsEnum(TimelineVisibility)
  visibility: TimelineVisibility = TimelineVisibility.FRIENDS;

  @ApiPropertyOptional({
    type: [String],
    description: 'Only for CUSTOM visibility',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsString({ each: true })
  customAudienceIds?: string[];

  @ApiPropertyOptional({ description: 'Extended post metadata' })
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;
}

export class GetTimelineFeedQueryDto {
  @ApiPropertyOptional({ description: 'Cursor for keyset pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ToggleTimelineLikeDto {
  @ApiPropertyOptional({
    description: 'Desired like state. If omitted, it toggles current state',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  liked?: boolean;
}
