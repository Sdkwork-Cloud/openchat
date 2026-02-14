/**
 * 悟空IM 控制器
 * 提供IM连接配置和相关API
 */

import { Controller, Get, Post, Body, Query, Logger, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { WukongIMService } from './wukongim.service';
import { WukongIMChannelType } from './wukongim.constants';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@ApiTags('悟空IM')
@Controller('im')
export class WukongIMController {
  private readonly logger = new Logger(WukongIMController.name);

  constructor(private readonly wukongIMService: WukongIMService) {}

  /**
   * 获取悟空IM连接配置（给客户端使用）
   */
  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取悟空IM连接配置' })
  @ApiResponse({ status: 200, description: '返回连接配置' })
  async getConfig(@Request() req: ExpressRequest & { user: { id: string } }) {
    this.logger.log(`获取悟空IM连接配置: ${req.user.id}`);
    
    const config = this.wukongIMService.getConnectionConfig(req.user.id);
    
    return {
      success: true,
      data: config,
    };
  }

  /**
   * 获取用户Token
   */
  @Post('token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取悟空IM用户Token' })
  @ApiResponse({ status: 200, description: '返回Token' })
  async getToken(
    @Request() req: ExpressRequest & { user: { id: string } },
  ) {
    try {
      const token = await this.wukongIMService.getUserToken(req.user.id);

      return {
        success: true,
        data: { token },
      };
    } catch (error: any) {
      this.logger.error(`获取Token失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 发送消息
   */
  @Post('message/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发送消息' })
  @ApiResponse({ status: 200, description: '消息发送成功' })
  async sendMessage(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() body: {
      channelId: string;
      channelType: number;
      payload: string;
      clientMsgNo?: string;
    },
  ) {
    try {
      const result = await this.wukongIMService.sendMessage({
        channelId: body.channelId,
        channelType: body.channelType as WukongIMChannelType,
        fromUid: req.user.id,
        payload: body.payload,
        clientMsgNo: body.clientMsgNo,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`发送消息失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 批量发送消息
   */
  @Post('message/sendbatch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量发送消息' })
  @ApiResponse({ status: 200, description: '批量消息发送成功' })
  async sendBatchMessages(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() messages: {
      channelId: string;
      channelType: number;
      payload: string;
      clientMsgNo?: string;
    }[],
  ) {
    try {
      const options = messages.map(msg => ({
        channelId: msg.channelId,
        channelType: msg.channelType as WukongIMChannelType,
        fromUid: req.user.id,
        payload: msg.payload,
        clientMsgNo: msg.clientMsgNo,
      }));

      const result = await this.wukongIMService.sendBatchMessages(options);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`批量发送消息失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 同步消息
   */
  @Get('message/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步消息' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  async syncMessages(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Query('channelId') channelId: string,
    @Query('channelType') channelType: number,
    @Query('lastMessageSeq') lastMessageSeq?: number,
    @Query('limit') limit: number = 50,
  ) {
    try {
      if (!channelId || !channelType) {
        return {
          success: false,
          message: 'channelId and channelType are required',
        };
      }

      const result = await this.wukongIMService.syncMessages(
        req.user.id,
        channelId,
        channelType as WukongIMChannelType,
        lastMessageSeq,
        limit,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`同步消息失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 创建频道
   */
  @Post('channel/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建频道' })
  @ApiResponse({ status: 200, description: '频道创建成功' })
  async createChannel(
    @Body() body: {
      channelId: string;
      channelType: number;
      name?: string;
      avatar?: string;
    },
  ) {
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
    } catch (error: any) {
      this.logger.error(`创建频道失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 删除频道
   */
  @Post('channel/delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除频道' })
  @ApiResponse({ status: 200, description: '频道删除成功' })
  async deleteChannel(
    @Body('channelId') channelId: string,
    @Body('channelType') channelType: number,
  ) {
    try {
      const result = await this.wukongIMService.deleteChannel(
        channelId,
        channelType as WukongIMChannelType,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`删除频道失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 添加订阅者
   */
  @Post('channel/subscriber/add')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加订阅者' })
  @ApiResponse({ status: 200, description: '添加订阅者成功' })
  async addSubscribers(
    @Body() body: {
      channelId: string;
      channelType: number;
      subscribers: string[];
    },
  ) {
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
    } catch (error: any) {
      this.logger.error(`添加订阅者失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 移除订阅者
   */
  @Post('channel/subscriber/remove')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '移除订阅者' })
  @ApiResponse({ status: 200, description: '移除订阅者成功' })
  async removeSubscribers(
    @Body() body: {
      channelId: string;
      channelType: number;
      subscribers: string[];
    },
  ) {
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
    } catch (error: any) {
      this.logger.error(`移除订阅者失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 健康检查
   */
  @Get('health')
  @ApiOperation({ summary: '悟空IM健康检查' })
  @ApiResponse({ status: 200, description: '健康状态' })
  async healthCheck() {
    const isHealthy = await this.wukongIMService.healthCheck();
    return {
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 获取系统信息
   */
  @Get('system/info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取悟空IM系统信息' })
  @ApiResponse({ status: 200, description: '返回系统信息' })
  async getSystemInfo() {
    try {
      const result = await this.wukongIMService.getSystemInfo();
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`获取系统信息失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
