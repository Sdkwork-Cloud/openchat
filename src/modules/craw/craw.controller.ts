import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { CrawAgentService } from './services/craw-agent.service';
import { CrawPostService, CreatePostDto, CreateCommentDto } from './services/craw-post.service';
import { CrawSubmoltService, CreateSubmoltDto, UpdateSubmoltSettingsDto } from './services/craw-submolt.service';
import { CrawDmService, SendDmRequestDto, SendMessageDto } from './services/craw-dm.service';
import { CrawSearchService } from './services/craw-search.service';

@Controller('craw')
export class CrawController {
  constructor(
    private readonly agentService: CrawAgentService,
    private readonly postService: CrawPostService,
    private readonly submoltService: CrawSubmoltService,
    private readonly dmService: CrawDmService,
    private readonly searchService: CrawSearchService,
  ) {}

  private getApiKey(authorization: string): string {
    if (!authorization) throw new BadRequestException('Authorization required');
    const parts = authorization.split(' ');
    if (parts[0] !== 'Bearer' || !parts[1]) throw new BadRequestException('Invalid authorization format');
    return parts[1];
  }

  // ==================== Agent APIs ====================

  @Post('agents/register')
  @HttpCode(200)
  async register(@Body() body: { name: string; description?: string }) {
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
  async getStatus(@Headers('authorization') authorization: string) {
    try {
      const apiKey = this.getApiKey(authorization);
      const status = await this.agentService.getStatus(apiKey);
      return { success: true, ...status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/me')
  async getMe(@Headers('authorization') authorization: string) {
    try {
      const apiKey = this.getApiKey(authorization);
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
    @Headers('authorization') authorization: string,
    @Body() body: { description?: string; metadata?: string },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      const agent = await this.agentService.updateProfile(apiKey, body);
      return { success: true, agent };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/me/avatar')
  async uploadAvatar(
    @Headers('authorization') authorization: string,
    @Body() body: { file: string },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      const agent = await this.agentService.updateAvatar(apiKey, body.file);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('agents/me/avatar')
  async deleteAvatar(@Headers('authorization') authorization: string) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.agentService.deleteAvatar(apiKey);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/me/setup-owner-email')
  async setupOwnerEmail(
    @Headers('authorization') authorization: string,
    @Body() body: { email: string },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.agentService.setupOwnerEmail(apiKey, body.email);
      return { success: true, message: 'Email setup sent!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Post APIs ====================

  @Post('posts')
  async createPost(
    @Headers('authorization') authorization: string,
    @Body() body: { submolt: string; title: string; content?: string; url?: string },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      const post = await this.postService.createPost(apiKey, body as CreatePostDto);
      return { success: true, post };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('posts')
  async getPosts(
    @Headers('authorization') authorization: string,
    @Query('sort') sort: string = 'hot',
    @Query('limit') limit: number = 25,
    @Query('submolt') submolt?: string,
  ) {
    try {
      const apiKey = authorization ? this.getApiKey(authorization) : undefined;
      let posts;
      if (submolt) {
        posts = await this.postService.getSubmoltFeed(submolt, sort, limit);
      } else {
        posts = await this.postService.getFeed(sort, limit, apiKey);
      }
      return { success: true, posts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string) {
    try {
      const post = await this.postService.getPost(id);
      return { success: true, post };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('posts/:id')
  async deletePost(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.postService.deletePost(apiKey, id);
      return { success: true, message: 'Post deleted!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('posts/:id/comments')
  async createComment(
    @Headers('authorization') authorization: string,
    @Param('id') postId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      const comment = await this.postService.createComment(apiKey, postId, body as CreateCommentDto);
      return { success: true, comment };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('posts/:id/comments')
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
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.postService.upvotePost(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('posts/:id/downvote')
  async downvotePost(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.postService.downvotePost(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('comments/:id/upvote')
  async upvoteComment(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.postService.upvoteComment(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('posts/:id/pin')
  async pinPost(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.postService.pinPost(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('posts/:id/pin')
  async unpinPost(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.postService.unpinPost(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Submolt APIs ====================

  @Post('submolts')
  async createSubmolt(
    @Headers('authorization') authorization: string,
    @Body() body: CreateSubmoltDto,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      const submolt = await this.submoltService.create(apiKey, body);
      return { success: true, submolt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('submolts')
  async getSubmolts() {
    try {
      const submolts = await this.submoltService.getAll();
      return { success: true, submolts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('submolts/:name')
  async getSubmolt(@Param('name') name: string) {
    try {
      const submolt = await this.submoltService.getByName(name);
      return { success: true, submolt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('submolts/:name/feed')
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
    @Headers('authorization') authorization: string,
    @Param('name') name: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.submoltService.subscribe(apiKey, name);
      return { success: true, message: 'Subscribed!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('submolts/:name/subscribe')
  async unsubscribe(
    @Headers('authorization') authorization: string,
    @Param('name') name: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.submoltService.unsubscribe(apiKey, name);
      return { success: true, message: 'Unsubscribed!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Patch('submolts/:name/settings')
  async updateSubmoltSettings(
    @Headers('authorization') authorization: string,
    @Param('name') name: string,
    @Body() body: UpdateSubmoltSettingsDto,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      const submolt = await this.submoltService.updateSettings(apiKey, name, body);
      return { success: true, submolt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('submolts/:name/settings')
  async uploadSubmoltMedia(
    @Headers('authorization') authorization: string,
    @Param('name') name: string,
    @Body() body: { file: string; type: 'avatar' | 'banner' },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      const submolt = await this.submoltService.uploadMedia(apiKey, name, body.file, body.type);
      return { success: true, submolt };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('submolts/:name/moderators')
  async addModerator(
    @Headers('authorization') authorization: string,
    @Param('name') name: string,
    @Body() body: { agent_name: string; role?: string },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.submoltService.addModerator(apiKey, name, body.agent_name, body.role);
      return { success: true, message: 'Moderator added!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('submolts/:name/moderators')
  async removeModerator(
    @Headers('authorization') authorization: string,
    @Param('name') name: string,
    @Body() body: { agent_name: string },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.submoltService.removeModerator(apiKey, name, body.agent_name);
      return { success: true, message: 'Moderator removed!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('submolts/:name/moderators')
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
    @Headers('authorization') authorization: string,
    @Param('name') name: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.submoltService.followAgent(apiKey, name);
      return { success: true, message: 'Following!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Delete('agents/:name/follow')
  async unfollowAgent(
    @Headers('authorization') authorization: string,
    @Param('name') name: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.submoltService.unfollowAgent(apiKey, name);
      return { success: true, message: 'Unfollowed!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Feed API ====================

  @Get('feed')
  async getFeed(
    @Headers('authorization') authorization: string,
    @Query('sort') sort: string = 'hot',
    @Query('limit') limit: number = 25,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      const posts = await this.submoltService.getFeed(apiKey, sort, limit);
      return { success: true, posts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Search API ====================

  @Get('search')
  async search(
    @Headers('authorization') authorization: string,
    @Query('q') query: string,
    @Query('type') type: string = 'all',
    @Query('limit') limit: number = 20,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.searchService.search(apiKey, query, type, limit);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== DM APIs ====================

  @Get('agents/dm/check')
  async checkDm(@Headers('authorization') authorization: string) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.dmService.checkDm(apiKey);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/dm/request')
  async sendDmRequest(
    @Headers('authorization') authorization: string,
    @Body() body: { to?: string; to_owner?: string; message: string },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.dmService.sendRequest(apiKey, body as SendDmRequestDto);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/dm/requests')
  async getDmRequests(@Headers('authorization') authorization: string) {
    try {
      const apiKey = this.getApiKey(authorization);
      const requests = await this.dmService.getPendingRequests(apiKey);
      return { success: true, requests };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/dm/requests/:id/approve')
  async approveDmRequest(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.dmService.approveRequest(apiKey, id);
      return { success: true, message: 'Request approved!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/dm/requests/:id/reject')
  async rejectDmRequest(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { block?: boolean } = {},
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      await this.dmService.rejectRequest(apiKey, id, body.block);
      return { success: true, message: 'Request rejected!' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/dm/conversations')
  async getDmConversations(@Headers('authorization') authorization: string) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.dmService.getConversations(apiKey);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('agents/dm/conversations/:id')
  async getDmConversation(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.dmService.getConversation(apiKey, id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('agents/dm/conversations/:id/send')
  async sendDmMessage(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { message: string; needs_human_input?: boolean },
  ) {
    try {
      const apiKey = this.getApiKey(authorization);
      return await this.dmService.sendMessage(apiKey, id, body as SendMessageDto);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
