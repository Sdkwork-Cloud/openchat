/**
 * 悟空IM 控制器 V2
 * 提供IM连接配置和相关API
 * 
 * 架构：
 * 1. 前端通过此控制器发送消息
 * 2. 前端通过此控制器同步消息
 * 3. 前端通过此控制器获取连接配置
 */

import { Controller, Get, Post, Body, Query, Logger, UseGuards, Request } from '@nestjs/common';
import { WukongIMServiceV2 } from './wukongim.service.v2';
import { WukongIMChannelType } from './wukongim.constants';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@ApiTags('悟空IM')
@Controller('im')
export class WukongIMControllerV2 {
  private readonly logger = new Logger(WukongIMControllerV2.name);

  constructor(private readonly wukongIMService: WukongIMServiceV2) {}

  /**
   * 获取悟空IM连接配置（给客户端使用）
   */
  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取悟空IM连接配置' })
  @ApiResponse({ status: 200, description: '返回连接配置' })
  async getConfig(@Request() req: { user: { userId: string } }) {
    this.logger.log(`获取悟空IM连接配置: ${req.user.userId}`);
    
    const config = this.wukongIMService.getConnectionConfig(req.user.userId);
    
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
    @Request() req: { user: { userId: string } },
    @Body('expireSeconds') expireSeconds?: number,
  ) {
    try {
      const token = await this.wukongIMService.getUserToken(
        req.user.userId,
        expireSeconds || 86400,
      );

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
    @Request() req: { user: { userId: string } },
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
        fromUid: req.user.userId,
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
   * 同步消息
   */
  @Get('message/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '同步消息' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  async syncMessages(
    @Request() req: { user: { userId: string } },
    @Query('channelId') channelId?: string,
    @Query('channelType') channelType?: number,
    @Query('lastMessageSeq') lastMessageSeq?: number,
    @Query('limit') limit: number = 50,
  ) {
    try {
      const result = await this.wukongIMService.syncMessages(
        req.user.userId,
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

}
