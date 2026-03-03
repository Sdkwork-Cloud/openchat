import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import {
  CreateTimelinePostDto,
  GetTimelineFeedQueryDto,
  ToggleTimelineLikeDto,
} from './dto/timeline.dto';
import { TimelineFeedPage, TimelinePostView } from './timeline.interface';
import { TimelineService } from './timeline.service';

@ApiTags('timeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post('posts')
  @ApiOperation({ summary: 'Create a timeline post' })
  @ApiResponse({ status: 201, description: 'Post created' })
  async createPost(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateTimelinePostDto,
  ): Promise<{ post: TimelinePostView; audienceCount: number }> {
    const result = await this.timelineService.createPost(user.id, dto);
    return {
      post: await this.timelineService.getPost(result.post.id, user.id),
      audienceCount: result.audienceCount,
    };
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get timeline feed' })
  @ApiResponse({ status: 200, description: 'Feed fetched' })
  async getFeed(
    @CurrentUser() user: UserEntity,
    @Query() query: GetTimelineFeedQueryDto,
  ): Promise<TimelineFeedPage> {
    return this.timelineService.getFeed(user.id, query);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: 'Get timeline post detail' })
  @ApiParam({ name: 'postId', description: 'Timeline post ID' })
  async getPost(
    @CurrentUser() user: UserEntity,
    @Param('postId') postId: string,
  ): Promise<TimelinePostView> {
    return this.timelineService.getPost(postId, user.id);
  }

  @Get('users/:userId/posts')
  @ApiOperation({ summary: 'Get user timeline posts' })
  @ApiParam({ name: 'userId', description: 'Author user ID' })
  async getUserPosts(
    @CurrentUser() user: UserEntity,
    @Param('userId') userId: string,
    @Query() query: GetTimelineFeedQueryDto,
  ): Promise<TimelineFeedPage> {
    return this.timelineService.getUserPosts(user.id, userId, query);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: 'Delete own timeline post' })
  @ApiParam({ name: 'postId', description: 'Timeline post ID' })
  async deletePost(
    @CurrentUser() user: UserEntity,
    @Param('postId') postId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.timelineService.deletePost(user.id, postId);
    return { success };
  }

  @Post('posts/:postId/likes')
  @ApiOperation({ summary: 'Like or unlike timeline post' })
  @ApiParam({ name: 'postId', description: 'Timeline post ID' })
  async toggleLike(
    @CurrentUser() user: UserEntity,
    @Param('postId') postId: string,
    @Body() dto: ToggleTimelineLikeDto,
  ): Promise<{ liked: boolean; likeCount: number }> {
    return this.timelineService.toggleLike(user.id, postId, dto);
  }
}
