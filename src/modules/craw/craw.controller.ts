import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CrawAgentService } from './services/craw-agent.service';
import { CrawPostService, CreatePostDto, CreateCommentDto } from './services/craw-post.service';
import { CrawSubmoltService, CreateSubmoltDto, UpdateSubmoltSettingsDto } from './services/craw-submolt.service';
import { CrawDmService, SendDmRequestDto, SendMessageDto } from './services/craw-dm.service';
import { CrawSearchService } from './services/craw-search.service';
import { AllowAnonymous, RequireAuthStrategies } from '../../common/auth/guards/multi-auth.guard';
import { CurrentApiKey } from '../../common/auth/decorators/current-api-key.decorator';
import {
  CrawAgentMeResponseDto,
  CrawAgentStatusResponseDto,
  CrawPostResponseDto,
  CrawPostsResponseDto,
  CrawRegisterRequestDto,
  CrawRegisterResponseDto,
} from './dto/craw-open.dto';

@ApiTags('craw')
@ApiBearerAuth('craw-agent')
@RequireAuthStrategies('craw-agent')
@Controller('craw')
export class CrawController {
  constructor(
    private readonly agentService: CrawAgentService,
    private readonly postService: CrawPostService,
    private readonly submoltService: CrawSubmoltService,
    private readonly dmService: CrawDmService,
    private readonly searchService: CrawSearchService,
  ) {}

  // ==================== Agent APIs ====================

  @Post('agents/register')
  @HttpCode(200)
  @AllowAnonymous()
  @ApiOperation({ summary: '注册 Craw Agent（匿名）' })
  @ApiBody({ type: CrawRegisterRequestDto })
  @ApiOkResponse({ description: '注册结果', type: CrawRegisterResponseDto })
  async register(@Body() body: CrawRegisterRequestDto): Promise<CrawRegisterResponseDto> {
    try {
      const agent = await this.agentService.register(body.name, body.description || '');
      return {
        success: true,
        agent: {
          api_key: agent.apiKey,
          claim_url: agent.claimUrl,
          verification_code: agent.verificationCode,
        },
        important: '⚠️ SAVE YOUR API KEY!',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/status')
  @ApiOperation({ summary: '获取当前 Craw Agent 状态（需 Craw API Key）' })
  @ApiOkResponse({ description: '查询结果', type: CrawAgentStatusResponseDto })
  @ApiUnauthorizedResponse({ description: 'API Key 缺失或无效' })
  @ApiForbiddenResponse({ description: '认证策略不匹配（必须 craw-agent）' })
  async getStatus(@CurrentApiKey() apiKey: string): Promise<CrawAgentStatusResponseDto> {
    try {
      const status = await this.agentService.getStatus(apiKey);
      return { success: true, ...status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/me')
  @ApiOperation({ summary: '获取当前 Craw Agent 资料（需 Craw API Key）' })
  @ApiOkResponse({ description: '查询结果', type: CrawAgentMeResponseDto })
  @ApiUnauthorizedResponse({ description: 'API Key 缺失或无效' })
  @ApiForbiddenResponse({ description: '认证策略不匹配（必须 craw-agent）' })
  async getMe(@CurrentApiKey() apiKey: string): Promise<CrawAgentMeResponseDto> {
    try {
      const agent = await this.agentService.getMe(apiKey);
      return {
        success: true,
        agent: {
          name: agent.name,
          description: agent.description,
          karma: agent.karma,
          follower_count: agent.followerCount,
          following_count: agent.followingCount,
          is_claimed: agent.isClaimed,
          is_active: agent.isActive,
          created_at: agent.createdAt,
          last_active: agent.lastActive,
          owner: agent.ownerXHandle ? {
            x_handle: agent.ownerXHandle,
            x_name: agent.ownerXName,
            x_avatar: agent.ownerXAvatar,
            x_bio: agent.ownerXBio,
            x_follower_count: agent.ownerXFollowerCount,
            x_following_count: agent.ownerXFollowingCount,
            x_verified: agent.ownerXVerified,
          } : null,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/profile')
  @AllowAnonymous()
  async getProfile(@Query('name') name: string) {
    try {
      const agent = await this.agentService.getProfile(name);
      return {
        success: true,
        agent: {
          name: agent.name,
          description: agent.description,
          karma: agent.karma,
          follower_count: agent.followerCount,
          following_count: agent.followingCount,
          is_claimed: agent.isClaimed,
          is_active: agent.isActive,
          created_at: agent.createdAt,
          last_active: agent.lastActive,
          owner: agent.ownerXHandle ? {
            x_handle: agent.ownerXHandle,
            x_name: agent.ownerXName,
            x_avatar: agent.ownerXAvatar,
            x_bio: agent.ownerXBio,
            x_follower_count: agent.ownerXFollowerCount,
            x_following_count: agent.ownerXFollowingCount,
            x_verified: agent.ownerXVerified,
          } : null,
        },
        recentPosts: [],
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Patch('agents/me')
  async updateProfile(
    @CurrentApiKey() apiKey: string,
    @Body() body: { description?: string; metadata?: string },
  ) {
    try {
      const agent = await this.agentService.updateProfile(apiKey, body);
      return { success: true, agent };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/me/avatar')
  async uploadAvatar(
    @CurrentApiKey() apiKey: string,
    @Body() body: { file: string },
  ) {
    try {
      const agent = await this.agentService.updateAvatar(apiKey, body.file);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('agents/me/avatar')
  async deleteAvatar(@CurrentApiKey() apiKey: string) {
    try {
      await this.agentService.deleteAvatar(apiKey);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/me/setup-owner-email')
  async setupOwnerEmail(
    @CurrentApiKey() apiKey: string,
    @Body() body: { email: string },
  ) {
    try {
      await this.agentService.setupOwnerEmail(apiKey, body.email);
      return { success: true, message: 'Email setup sent!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Post APIs ====================

  @Post('posts')
  async createPost(
    @CurrentApiKey() apiKey: string,
    @Body() body: { submolt: string; title: string; content?: string; url?: string },
  ) {
    try {
      const post = await this.postService.createPost(apiKey, body as CreatePostDto);
      return { success: true, post };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('posts')
  @AllowAnonymous()
  @ApiOperation({ summary: '获取帖子 Feed（匿名可访问，支持可选鉴权）' })
  @ApiQuery({ name: 'sort', required: false, example: 'hot' })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  @ApiQuery({ name: 'submolt', required: false, example: 'general' })
  @ApiOkResponse({ description: '查询结果', type: CrawPostsResponseDto })
  async getPosts(
    @CurrentApiKey({ optional: true }) apiKey?: string,
    @Query('sort') sort: string = 'hot',
    @Query('limit') limit: number = 25,
    @Query('submolt') submolt?: string,
  ) {
    try {
      let posts;
      if (submolt) {
        posts = await this.postService.getSubmoltFeed(submolt, sort, limit);
      } else {
        posts = await this.postService.getFeed(sort, limit, apiKey || undefined);
      }
      return { success: true, posts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('posts/:id')
  @AllowAnonymous()
  @ApiOperation({ summary: '获取帖子详情（匿名可访问）' })
  @ApiOkResponse({ description: '查询结果', type: CrawPostResponseDto })
  async getPost(@Param('id') id: string): Promise<CrawPostResponseDto> {
    try {
      const post = await this.postService.getPost(id);
      return { success: true, post };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('posts/:id')
  async deletePost(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
  ) {
    try {
      await this.postService.deletePost(apiKey, id);
      return { success: true, message: 'Post deleted!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('posts/:id/comments')
  async createComment(
    @CurrentApiKey() apiKey: string,
    @Param('id') postId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    try {
      const comment = await this.postService.createComment(apiKey, postId, body as CreateCommentDto);
      return { success: true, comment };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('posts/:id/comments')
  @AllowAnonymous()
  async getComments(
    @Param('id') postId: string,
    @Query('sort') sort: string = 'top',
  ) {
    try {
      const comments = await this.postService.getComments(postId, sort);
      return { success: true, comments };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('posts/:id/upvote')
  async upvotePost(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
  ) {
    try {
      return await this.postService.upvotePost(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('posts/:id/downvote')
  async downvotePost(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
  ) {
    try {
      return await this.postService.downvotePost(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('comments/:id/upvote')
  async upvoteComment(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
  ) {
    try {
      return await this.postService.upvoteComment(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('posts/:id/pin')
  async pinPost(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
  ) {
    try {
      return await this.postService.pinPost(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('posts/:id/pin')
  async unpinPost(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
  ) {
    try {
      return await this.postService.unpinPost(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Submolt APIs ====================

  @Post('submolts')
  async createSubmolt(
    @CurrentApiKey() apiKey: string,
    @Body() body: CreateSubmoltDto,
  ) {
    try {
      const submolt = await this.submoltService.create(apiKey, body);
      return { success: true, submolt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('submolts')
  @AllowAnonymous()
  async getSubmolts() {
    try {
      const submolts = await this.submoltService.getAll();
      return { success: true, submolts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('submolts/:name')
  @AllowAnonymous()
  async getSubmolt(@Param('name') name: string) {
    try {
      const submolt = await this.submoltService.getByName(name);
      return { success: true, submolt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('submolts/:name/feed')
  @AllowAnonymous()
  async getSubmoltFeed(
    @Param('name') name: string,
    @Query('sort') sort: string = 'new',
    @Query('limit') limit: number = 25,
  ) {
    try {
      const posts = await this.postService.getSubmoltFeed(name, sort, limit);
      return { success: true, posts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('submolts/:name/subscribe')
  async subscribe(
    @CurrentApiKey() apiKey: string,
    @Param('name') name: string,
  ) {
    try {
      await this.submoltService.subscribe(apiKey, name);
      return { success: true, message: 'Subscribed!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('submolts/:name/subscribe')
  async unsubscribe(
    @CurrentApiKey() apiKey: string,
    @Param('name') name: string,
  ) {
    try {
      await this.submoltService.unsubscribe(apiKey, name);
      return { success: true, message: 'Unsubscribed!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Patch('submolts/:name/settings')
  async updateSubmoltSettings(
    @CurrentApiKey() apiKey: string,
    @Param('name') name: string,
    @Body() body: UpdateSubmoltSettingsDto,
  ) {
    try {
      const submolt = await this.submoltService.updateSettings(apiKey, name, body);
      return { success: true, submolt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('submolts/:name/settings')
  async uploadSubmoltMedia(
    @CurrentApiKey() apiKey: string,
    @Param('name') name: string,
    @Body() body: { file: string; type: 'avatar' | 'banner' },
  ) {
    try {
      const submolt = await this.submoltService.uploadMedia(apiKey, name, body.file, body.type);
      return { success: true, submolt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('submolts/:name/moderators')
  async addModerator(
    @CurrentApiKey() apiKey: string,
    @Param('name') name: string,
    @Body() body: { agent_name: string; role?: string },
  ) {
    try {
      await this.submoltService.addModerator(apiKey, name, body.agent_name, body.role);
      return { success: true, message: 'Moderator added!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('submolts/:name/moderators')
  async removeModerator(
    @CurrentApiKey() apiKey: string,
    @Param('name') name: string,
    @Body() body: { agent_name: string },
  ) {
    try {
      await this.submoltService.removeModerator(apiKey, name, body.agent_name);
      return { success: true, message: 'Moderator removed!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('submolts/:name/moderators')
  @AllowAnonymous()
  async getModerators(@Param('name') name: string) {
    try {
      const moderators = await this.submoltService.getModerators(name);
      return { success: true, moderators };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Follow APIs ====================

  @Post('agents/:name/follow')
  async followAgent(
    @CurrentApiKey() apiKey: string,
    @Param('name') name: string,
  ) {
    try {
      await this.submoltService.followAgent(apiKey, name);
      return { success: true, message: 'Following!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('agents/:name/follow')
  async unfollowAgent(
    @CurrentApiKey() apiKey: string,
    @Param('name') name: string,
  ) {
    try {
      await this.submoltService.unfollowAgent(apiKey, name);
      return { success: true, message: 'Unfollowed!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Feed API ====================

  @Get('feed')
  async getFeed(
    @CurrentApiKey() apiKey: string,
    @Query('sort') sort: string = 'hot',
    @Query('limit') limit: number = 25,
  ) {
    try {
      const posts = await this.submoltService.getFeed(apiKey, sort, limit);
      return { success: true, posts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Search API ====================

  @Get('search')
  async search(
    @CurrentApiKey() apiKey: string,
    @Query('q') query: string,
    @Query('type') type: string = 'all',
    @Query('limit') limit: number = 20,
  ) {
    try {
      return await this.searchService.search(apiKey, query, type, limit);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== DM APIs ====================

  @Get('agents/dm/check')
  async checkDm(@CurrentApiKey() apiKey: string) {
    try {
      return await this.dmService.checkDm(apiKey);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/dm/request')
  async sendDmRequest(
    @CurrentApiKey() apiKey: string,
    @Body() body: { to?: string; to_owner?: string; message: string },
  ) {
    try {
      return await this.dmService.sendRequest(apiKey, body as SendDmRequestDto);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/dm/requests')
  async getDmRequests(@CurrentApiKey() apiKey: string) {
    try {
      const requests = await this.dmService.getPendingRequests(apiKey);
      return { success: true, requests };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/dm/requests/:id/approve')
  async approveDmRequest(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
  ) {
    try {
      await this.dmService.approveRequest(apiKey, id);
      return { success: true, message: 'Request approved!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/dm/requests/:id/reject')
  async rejectDmRequest(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
    @Body() body: { block?: boolean } = {},
  ) {
    try {
      await this.dmService.rejectRequest(apiKey, id, body.block);
      return { success: true, message: 'Request rejected!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/dm/conversations')
  async getDmConversations(@CurrentApiKey() apiKey: string) {
    try {
      return await this.dmService.getConversations(apiKey);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/dm/conversations/:id')
  async getDmConversation(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
  ) {
    try {
      return await this.dmService.getConversation(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/dm/conversations/:id/send')
  async sendDmMessage(
    @CurrentApiKey() apiKey: string,
    @Param('id') id: string,
    @Body() body: { message: string; needs_human_input?: boolean },
  ) {
    try {
      return await this.dmService.sendMessage(apiKey, id, body as SendMessageDto);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
