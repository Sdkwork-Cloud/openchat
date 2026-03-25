import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceStatus, DeviceType } from '../../iot/entities/device.entity';

export class AdminPaginationQueryDto {
  @ApiPropertyOptional({ description: '1-based page number', example: 1 })
  page?: number;

  @ApiPropertyOptional({ description: 'page size', example: 20 })
  limit?: number;

  @ApiPropertyOptional({ description: 'keyword filter', example: 'alice' })
  keyword?: string;
}

export class AdminUserListQueryDto extends AdminPaginationQueryDto {
  @ApiPropertyOptional({ description: 'user status filter', example: 'online' })
  status?: string;

  @ApiPropertyOptional({ description: 'role filter', example: 'admin' })
  role?: string;
}

export class AdminUserDeviceSessionListQueryDto {
  @ApiPropertyOptional({ description: 'page size', example: 20 })
  limit?: number;
}

export class AdminUserProfileUpdateDto {
  @ApiPropertyOptional({ description: 'nickname override', example: 'Alice Ops' })
  nickname?: string;

  @ApiPropertyOptional({ enum: ['online', 'offline', 'busy'] })
  status?: 'online' | 'offline' | 'busy';

  @ApiPropertyOptional({ description: 'avatar payload or url', type: Object })
  avatar?: unknown;

  @ApiPropertyOptional({
    description: 'custom user resources',
    type: 'object',
    additionalProperties: true,
  })
  resources?: Record<string, unknown>;
}

export class AdminUserRolesUpdateDto {
  @ApiProperty({ type: [String], example: ['admin'] })
  roles: string[];
}

export class AdminUserResetPasswordDto {
  @ApiProperty({ example: 'NewPassword123!' })
  newPassword: string;
}

export class AdminGroupListQueryDto extends AdminPaginationQueryDto {
  @ApiPropertyOptional({ description: 'group status filter', example: 'active' })
  status?: string;

  @ApiPropertyOptional({ description: 'group owner id', example: '1' })
  ownerId?: string;
}

export class AdminGroupUpdateDto {
  @ApiPropertyOptional({ example: 'Operator Room' })
  name?: string;

  @ApiPropertyOptional({ example: 'Operations coordination group' })
  description?: string;

  @ApiPropertyOptional({ example: 'Maintenance starts at 23:00 UTC' })
  announcement?: string;

  @ApiPropertyOptional({ enum: ['active', 'dismissed', 'banned'] })
  status?: 'active' | 'dismissed' | 'banned';

  @ApiPropertyOptional({ example: false })
  muteAll?: boolean;

  @ApiPropertyOptional({ enum: ['free', 'approval', 'forbidden'] })
  joinType?: 'free' | 'approval' | 'forbidden';

  @ApiPropertyOptional({ example: 500 })
  maxMembers?: number;
}

export class AdminGroupMemberUpdateDto {
  @ApiProperty({ example: '2' })
  userId: string;

  @ApiPropertyOptional({ enum: ['admin', 'member'] })
  role?: 'admin' | 'member';
}

export class AdminGroupMemberRoleUpdateDto {
  @ApiProperty({ enum: ['admin', 'member'] })
  role: 'admin' | 'member';
}

export class AdminGroupMemberMuteDto {
  @ApiProperty({ description: 'mute duration in seconds', example: 3600 })
  durationSeconds: number;
}

export class AdminGroupTransferOwnerDto {
  @ApiProperty({ example: '3' })
  newOwnerId: string;
}

export class AdminFriendListQueryDto extends AdminPaginationQueryDto {
  @ApiPropertyOptional({ example: '1' })
  userId?: string;

  @ApiPropertyOptional({ example: 'accepted' })
  status?: string;
}

export class AdminFriendRequestListQueryDto extends AdminPaginationQueryDto {
  @ApiPropertyOptional({ example: '1' })
  userId?: string;

  @ApiPropertyOptional({ example: 'pending' })
  status?: string;
}

export class AdminFriendPairDto {
  @ApiProperty({ example: '1' })
  userId: string;

  @ApiProperty({ example: '2' })
  friendId: string;
}

export class AdminMessageListQueryDto extends AdminPaginationQueryDto {
  @ApiPropertyOptional({ example: '1' })
  fromUserId?: string;

  @ApiPropertyOptional({ example: '2' })
  toUserId?: string;

  @ApiPropertyOptional({ example: 'group-123' })
  groupId?: string;

  @ApiPropertyOptional({ example: 'sent' })
  status?: string;

  @ApiPropertyOptional({ example: 'text' })
  type?: string;
}

export class AdminDeviceListQueryDto extends AdminPaginationQueryDto {
  @ApiPropertyOptional({ example: '1' })
  userId?: string;

  @ApiPropertyOptional({ example: 'online' })
  status?: string;

  @ApiPropertyOptional({ enum: DeviceType })
  type?: string;
}

export class AdminDeviceCreateDto {
  @ApiProperty({ example: 'xiaozhi-001' })
  deviceId: string;

  @ApiProperty({ enum: DeviceType })
  type: DeviceType;

  @ApiProperty({ example: 'Lobby Kiosk' })
  name: string;

  @ApiPropertyOptional({ example: 'Welcome desk device' })
  description?: string;

  @ApiPropertyOptional({ example: '10.0.0.10' })
  ipAddress?: string;

  @ApiPropertyOptional({ example: '00:11:22:33:44:55' })
  macAddress?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { firmware: '1.0.0' },
  })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '1' })
  userId?: string;
}

export class AdminDeviceStatusUpdateDto {
  @ApiProperty({ enum: DeviceStatus })
  status: DeviceStatus;
}

export class AdminDeviceCommandDto {
  @ApiProperty({ example: 'restart' })
  action: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { delaySeconds: 10 },
  })
  params?: Record<string, unknown>;
}

export class AdminConfigListQueryDto {
  @ApiPropertyOptional({ example: 'rtc.' })
  pattern?: string;

  @ApiPropertyOptional({ example: false })
  includeSensitive?: boolean | string;
}

export class AdminConfigUpsertDto {
  @ApiProperty({ example: 'rtc.defaultProvider' })
  key: string;

  @ApiProperty({
    description: 'raw config value',
    type: 'object',
    additionalProperties: true,
    example: { value: 'agora' },
  })
  value: unknown;

  @ApiPropertyOptional({ example: 'Default RTC provider for new sessions' })
  description?: string;
}

export class AdminConfigDeleteResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}

export class AdminAuditLogQueryDto {
  @ApiPropertyOptional({ example: '1' })
  userId?: string;

  @ApiPropertyOptional({ example: 'user' })
  entityType?: string;

  @ApiPropertyOptional({ example: 'user.role.update' })
  action?: string;

  @ApiPropertyOptional({ example: 50 })
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  offset?: number;
}
