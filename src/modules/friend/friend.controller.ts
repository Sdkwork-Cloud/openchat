import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FriendService } from './friend.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import {
  SendFriendRequestDto,
  HandleFriendRequestDto,
  FriendRequestQueryDto,
} from './dto/friend.dto';
import {
  ApiSuccessResponse,
  ApiPagedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '../../common/decorators/response.decorator';
import { ApiResponseDto } from '../../common/dto/response.dto';
import {
  Audit,
  AuditCreate,
  AuditDelete,
  AuditUpdate,
} from '../../common/interceptors/audit.interceptor';
import { AuditAction } from '../../common/entities/audit-log.entity';
import { RateLimitAuth } from '../../common/decorators/rate-limit.decorator';

@ApiTags('friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  @RateLimitAuth()
  @AuditCreate('friend_request', (args) => args[1]?.toUserId)
  @ApiOperation({ summary: 'Send friend request' })
  @ApiSuccessResponse('Friend request sent successfully')
  @ApiBadRequestResponse('Friend request already sent or friendship exists')
  async sendFriendRequest(
    @CurrentUser() user: UserEntity,
    @Body() dto: SendFriendRequestDto,
  ): Promise<ApiResponseDto<{ success: boolean; requestId: string }>> {
    const request = await this.friendService.sendFriendRequest(
      user.id,
      dto.toUserId,
      dto.message,
    );
    return {
      success: true,
      requestId: request.id,
    } as any;
  }

  @Post('request/:id/accept')
  @Audit({ action: AuditAction.UPDATE, entityType: 'friend_request' })
  @ApiOperation({ summary: 'Accept friend request' })
  @ApiSuccessResponse('Friend request accepted')
  @ApiNotFoundResponse('Friend request not found')
  async acceptFriendRequest(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<ApiResponseDto<{ success: boolean }>> {
    await this.friendService.acceptFriendRequest(id, user.id);
    return { success: true } as any;
  }

  @Post('request/:id/reject')
  @Audit({ action: AuditAction.UPDATE, entityType: 'friend_request' })
  @ApiOperation({ summary: 'Reject friend request' })
  @ApiSuccessResponse('Friend request rejected')
  async rejectFriendRequest(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<{ success: boolean }>> {
    await this.friendService.rejectFriendRequest(id);
    return { success: true } as any;
  }

  @Delete('request/:id')
  @AuditDelete('friend_request', (args) => args[1])
  @ApiOperation({ summary: 'Cancel friend request' })
  @ApiSuccessResponse('Friend request cancelled')
  async cancelFriendRequest(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<{ success: boolean }>> {
    await this.friendService.cancelFriendRequest(id);
    return { success: true } as any;
  }

  @Delete(':friendId')
  @AuditDelete('friend', (args) => args[2])
  @ApiOperation({ summary: 'Remove friend' })
  @ApiSuccessResponse('Friend removed')
  async removeFriend(
    @CurrentUser() user: UserEntity,
    @Param('friendId') friendId: string,
  ): Promise<ApiResponseDto<{ success: boolean }>> {
    await this.friendService.removeFriend(user.id, friendId);
    return { success: true } as any;
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get friend requests' })
  @ApiSuccessResponse('Friend requests retrieved')
  async getFriendRequests(
    @CurrentUser() user: UserEntity,
    @Query() query: FriendRequestQueryDto,
  ): Promise<ApiResponseDto<any[]>> {
    const requests = await this.friendService.getFriendRequests(
      user.id,
      query.status,
    );
    return requests as any;
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get sent friend requests' })
  @ApiSuccessResponse('Sent friend requests retrieved')
  async getSentFriendRequests(
    @CurrentUser() user: UserEntity,
  ): Promise<ApiResponseDto<any[]>> {
    const requests = await this.friendService.getSentFriendRequests(user.id);
    return requests as any;
  }

  @Get()
  @ApiOperation({ summary: 'Get friends list' })
  @ApiSuccessResponse('Friends list retrieved')
  async getFriends(
    @CurrentUser() user: UserEntity,
  ): Promise<ApiResponseDto<string[]>> {
    const friends = await this.friendService.getFriends(user.id);
    return friends as any;
  }

  @Get(':friendId/check')
  @ApiOperation({ summary: 'Check friendship status' })
  @ApiSuccessResponse('Friendship status checked')
  async checkFriendship(
    @CurrentUser() user: UserEntity,
    @Param('friendId') friendId: string,
  ): Promise<ApiResponseDto<{ isFriend: boolean }>> {
    const isFriend = await this.friendService.checkFriendship(user.id, friendId);
    return { isFriend } as any;
  }

  @Post(':friendId/block')
  @Audit({ action: AuditAction.UPDATE, entityType: 'friend' })
  @ApiOperation({ summary: 'Block friend' })
  @ApiSuccessResponse('Friend blocked')
  async blockFriend(
    @CurrentUser() user: UserEntity,
    @Param('friendId') friendId: string,
  ): Promise<ApiResponseDto<{ success: boolean }>> {
    await this.friendService.blockFriend(user.id, friendId);
    return { success: true } as any;
  }

  @Post(':friendId/unblock')
  @Audit({ action: AuditAction.UPDATE, entityType: 'friend' })
  @ApiOperation({ summary: 'Unblock friend' })
  @ApiSuccessResponse('Friend unblocked')
  async unblockFriend(
    @CurrentUser() user: UserEntity,
    @Param('friendId') friendId: string,
  ): Promise<ApiResponseDto<{ success: boolean }>> {
    await this.friendService.unblockFriend(user.id, friendId);
    return { success: true } as any;
  }

  @Get(':friendId/blocked')
  @ApiOperation({ summary: 'Check if blocked' })
  @ApiSuccessResponse('Block status checked')
  async checkBlocked(
    @CurrentUser() user: UserEntity,
    @Param('friendId') friendId: string,
  ): Promise<ApiResponseDto<{ isBlocked: boolean }>> {
    const isBlocked = await this.friendService.checkBlocked(user.id, friendId);
    return { isBlocked } as any;
  }
}
