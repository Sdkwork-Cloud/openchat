import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WukongIMAdminSendMessageDto {
  @ApiProperty({ example: 'group-123' })
  channelId: string;

  @ApiProperty({ example: 2 })
  channelType: number;

  @ApiProperty({ example: 'hello world' })
  payload: string;

  @ApiPropertyOptional({ example: 'msg-001' })
  clientMsgNo?: string;
}

export class WukongIMAdminCreateChannelDto {
  @ApiProperty({ example: 'group-123' })
  channelId: string;

  @ApiProperty({ example: 2 })
  channelType: number;

  @ApiPropertyOptional({ example: 'Operators Group' })
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/group.png' })
  avatar?: string;
}

export class WukongIMAdminDeleteChannelDto {
  @ApiProperty({ example: 'group-123' })
  channelId: string;

  @ApiProperty({ example: 2 })
  channelType: number;
}

export class WukongIMAdminSubscribersDto {
  @ApiProperty({ example: 'group-123' })
  channelId: string;

  @ApiProperty({ example: 2 })
  channelType: number;

  @ApiProperty({ type: [String], example: ['u1', 'u2'] })
  subscribers: string[];
}
