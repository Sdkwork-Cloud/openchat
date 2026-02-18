import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiPropertyOptional({ description: 'Request message', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}

export class HandleFriendRequestDto {
  @ApiProperty({ description: 'Request ID' })
  @IsString()
  @IsNotEmpty()
  requestId: string;
}

export class FriendRequestQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ['pending', 'accepted', 'rejected'] })
  @IsOptional()
  @IsString()
  status?: 'pending' | 'accepted' | 'rejected';
}

export class BlockUserDto {
  @ApiProperty({ description: 'User ID to block' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
