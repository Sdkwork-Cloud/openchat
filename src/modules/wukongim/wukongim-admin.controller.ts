import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { assertAdminAccess } from '../../common/auth/admin-access.util';
import { AuthenticatedRequest } from '../../common/auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { WukongIMChannelType } from './wukongim.constants';
import { WukongIMService } from './wukongim.service';

@ApiTags('wukongim-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wukongim')
export class WukongIMAdminController {
  private readonly logger = new Logger(WukongIMAdminController.name);

  constructor(private readonly wukongIMService: WukongIMService) {}

  @Post('message/send')
  @ApiOperation({ summary: 'Send a WuKongIM control-plane message' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      channelId: string;
      channelType: number;
      payload: string;
      clientMsgNo?: string;
    },
  ) {
    this.assertAdmin(req);

    try {
      const result = await this.wukongIMService.sendMessage({
        channelId: body.channelId,
        channelType: body.channelType as WukongIMChannelType,
        fromUid: req.auth.userId,
        payload: body.payload,
        clientMsgNo: body.clientMsgNo,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send message: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }

  @Post('message/sendbatch')
  @ApiOperation({ summary: 'Send WuKongIM control-plane messages in batch' })
  @ApiResponse({ status: 200, description: 'Batch send completed' })
  async sendBatchMessages(
    @Request() req: AuthenticatedRequest,
    @Body()
    messages: Array<{
      channelId: string;
      channelType: number;
      payload: string;
      clientMsgNo?: string;
    }>,
  ) {
    this.assertAdmin(req);

    try {
      const options = messages.map((msg) => ({
        channelId: msg.channelId,
        channelType: msg.channelType as WukongIMChannelType,
        fromUid: req.auth.userId,
        payload: msg.payload,
        clientMsgNo: msg.clientMsgNo,
      }));

      const result = await this.wukongIMService.sendBatchMessages(options);
      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send batch messages: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }

  @Get('message/sync')
  @ApiOperation({ summary: 'Sync WuKongIM messages from control plane' })
  @ApiResponse({ status: 200, description: 'Message list returned' })
  async syncMessages(
    @Request() req: AuthenticatedRequest,
    @Query('channelId') channelId: string,
    @Query('channelType') channelType: number,
    @Query('lastMessageSeq') lastMessageSeq?: number,
    @Query('limit') limit: number = 50,
  ) {
    this.assertAdmin(req);

    try {
      if (!channelId || !channelType) {
        return {
          success: false,
          message: 'channelId and channelType are required',
        };
      }

      const result = await this.wukongIMService.syncMessages(
        req.auth.userId,
        channelId,
        channelType as WukongIMChannelType,
        lastMessageSeq,
        limit,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync messages: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }

  @Post('channel/create')
  @ApiOperation({ summary: 'Create WuKongIM channel' })
  @ApiResponse({ status: 200, description: 'Channel created' })
  async createChannel(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      channelId: string;
      channelType: number;
      name?: string;
      avatar?: string;
    },
  ) {
    this.assertAdmin(req);

    try {
      const result = await this.wukongIMService.createChannel({
        channelId: body.channelId,
        channelType: body.channelType as WukongIMChannelType,
        name: body.name,
        avatar: body.avatar,
      });
      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create channel: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }

  @Post('channel/delete')
  @ApiOperation({ summary: 'Delete WuKongIM channel' })
  @ApiResponse({ status: 200, description: 'Channel deleted' })
  async deleteChannel(
    @Request() req: AuthenticatedRequest,
    @Body('channelId') channelId: string,
    @Body('channelType') channelType: number,
  ) {
    this.assertAdmin(req);

    try {
      const result = await this.wukongIMService.deleteChannel(
        channelId,
        channelType as WukongIMChannelType,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete channel: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }

  @Post('channel/subscriber/add')
  @ApiOperation({ summary: 'Add channel subscribers' })
  @ApiResponse({ status: 200, description: 'Subscribers added' })
  async addSubscribers(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      channelId: string;
      channelType: number;
      subscribers: string[];
    },
  ) {
    this.assertAdmin(req);

    try {
      const result = await this.wukongIMService.addSubscribers(
        body.channelId,
        body.channelType as WukongIMChannelType,
        body.subscribers,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to add subscribers: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }

  @Post('channel/subscriber/remove')
  @ApiOperation({ summary: 'Remove channel subscribers' })
  @ApiResponse({ status: 200, description: 'Subscribers removed' })
  async removeSubscribers(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      channelId: string;
      channelType: number;
      subscribers: string[];
    },
  ) {
    this.assertAdmin(req);

    try {
      const result = await this.wukongIMService.removeSubscribers(
        body.channelId,
        body.channelType as WukongIMChannelType,
        body.subscribers,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to remove subscribers: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check WuKongIM control-plane health' })
  @ApiResponse({ status: 200, description: 'Health status returned' })
  async healthCheck(@Request() req: AuthenticatedRequest) {
    this.assertAdmin(req);

    const isHealthy = await this.wukongIMService.healthCheck();
    return {
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('system/info')
  @ApiOperation({ summary: 'Get WuKongIM system info' })
  @ApiResponse({ status: 200, description: 'System info returned' })
  async getSystemInfo(@Request() req: AuthenticatedRequest) {
    this.assertAdmin(req);

    try {
      const result = await this.wukongIMService.getSystemInfo();
      return {
        success: true,
        data: result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get system info: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }

  private assertAdmin(req: AuthenticatedRequest): void {
    assertAdminAccess({
      roles: req.auth.roles,
      metadata: req.auth.metadata,
    });
  }
}
