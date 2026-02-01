/**
 * 悟空IM 控制器
 * 提供IM连接配置和相关API
 */

import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { WukongIMService, SendMessageOptions, CreateChannelOptions, AddSubscriberOptions } from './wukongim.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('悟空IM')
@Controller('im')
export class WukongIMController {
  private readonly logger = new Logger(WukongIMController.name);

  constructor(private readonly wukongIMService: WukongIMService) {}

  /**
   * 获取悟空IM连接配置
   * 客户端使用此配置连接悟空IM服务器
   */
  @Get('config')
  @ApiOperation({ summary: '获取悟空IM连接配置' })
  @ApiResponse({ status: 200, description: '返回连接配置' })
  getConfig() {
    this.logger.log('获取悟空IM连接配置');
    return {
      success: true,
      data: this.wukongIMService.getConnectionConfig(),
    };
  }

  /**
   * 发送消息
   */
  @Post('message/send')
  @ApiOperation({ summary: '发送消息' })
  @ApiResponse({ status: 200, description: '消息发送成功' })
  async sendMessage(@Body() options: SendMessageOptions) {
    try {
      const result = await this.wukongIMService.sendMessage(options);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
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
  @ApiOperation({ summary: '批量发送消息' })
  @ApiResponse({ status: 200, description: '批量消息发送成功' })
  async sendBatchMessages(@Body() messages: SendMessageOptions[]) {
    try {
      const result = await this.wukongIMService.sendBatchMessages(messages);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`批量发送消息失败: ${error.message}`);
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
  @ApiOperation({ summary: '创建频道' })
  @ApiResponse({ status: 200, description: '频道创建成功' })
  async createChannel(@Body() options: CreateChannelOptions) {
    try {
      const result = await this.wukongIMService.createChannel(options);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
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
  @ApiOperation({ summary: '删除频道' })
  @ApiResponse({ status: 200, description: '频道删除成功' })
  async deleteChannel(
    @Body('channelId') channelId: string,
    @Body('channelType') channelType: number,
  ) {
    try {
      const result = await this.wukongIMService.deleteChannel(channelId, channelType);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
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
  @ApiOperation({ summary: '添加订阅者' })
  @ApiResponse({ status: 200, description: '添加订阅者成功' })
  async addSubscribers(@Body() options: AddSubscriberOptions) {
    try {
      const result = await this.wukongIMService.addSubscribers(options);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
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
  @ApiOperation({ summary: '移除订阅者' })
  @ApiResponse({ status: 200, description: '移除订阅者成功' })
  async removeSubscribers(@Body() options: AddSubscriberOptions) {
    try {
      const result = await this.wukongIMService.removeSubscribers(options);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`移除订阅者失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 获取频道信息
   */
  @Get('channel/info')
  @ApiOperation({ summary: '获取频道信息' })
  @ApiResponse({ status: 200, description: '返回频道信息' })
  async getChannelInfo(
    @Query('channelId') channelId: string,
    @Query('channelType') channelType: number,
  ) {
    try {
      const result = await this.wukongIMService.getChannelInfo(channelId, channelType);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`获取频道信息失败: ${error.message}`);
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
  @ApiOperation({ summary: '同步消息' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  async syncMessages(
    @Query('uid') uid: string,
    @Query('channelId') channelId: string,
    @Query('channelType') channelType: number,
    @Query('lastMessageSeq') lastMessageSeq?: number,
    @Query('limit') limit: number = 20,
  ) {
    try {
      const result = await this.wukongIMService.syncMessages(
        uid,
        channelId,
        channelType,
        lastMessageSeq,
        limit,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`同步消息失败: ${error.message}`);
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
}
