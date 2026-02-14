/**
 * IoT控制器
 * 处理IoT相关的HTTP请求
 */

import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IoTService } from './iot.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { DeviceType, DeviceStatus } from './entities/device.entity';
import { RequestWithUser } from '../../common/auth/interfaces/request-with-user.interface';
import { DeviceMessageType } from './entities/device-message.entity';
import { IoTException } from './exceptions/iot.exception';

@ApiTags('iot')
@Controller('iot')
export class IoTController {
  constructor(private iotService: IoTService) {}

  // ==================== 设备管理 ====================

  /**
   * 注册设备
   */
  @Post('devices')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '注册设备' })
  @ApiResponse({ status: 201, description: '设备注册成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiBearerAuth()
  async registerDevice(
    @Request() req: RequestWithUser,
    @Body() deviceData: {
      deviceId: string;
      type: DeviceType;
      name: string;
      description?: string;
      ipAddress?: string;
      macAddress?: string;
      metadata?: any;
      userId?: string;
    },
  ) {
    // 确保设备关联到当前用户
    const registerData = {
      ...deviceData,
      userId: deviceData.userId || req.user?.userId || ''
    };
    return this.iotService.registerDevice(registerData);
  }

  /**
   * 获取设备列表
   */
  @Get('devices')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取设备列表' })
  @ApiResponse({ status: 200, description: '获取设备列表成功' })
  async getDevices(
    @Query('userId') userId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.iotService.getDevices(userId, page, limit);
  }

  /**
   * 获取设备详情
   */
  @Get('devices/:deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取设备详情' })
  @ApiResponse({ status: 200, description: '获取设备详情成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async getDevice(@Param('deviceId') deviceId: string) {
    return this.iotService.getDevice(deviceId);
  }

  /**
   * 更新设备状态
   */
  @Put('devices/:deviceId/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新设备状态' })
  @ApiResponse({ status: 200, description: '更新设备状态成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiBearerAuth()
  async updateDeviceStatus(
    @Param('deviceId') deviceId: string,
    @Body('status') status: DeviceStatus,
  ) {
    return this.iotService.updateDeviceStatus(deviceId, status);
  }

  /**
   * 删除设备
   */
  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除设备' })
  @ApiResponse({ status: 204, description: '删除设备成功' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiBearerAuth()
  async deleteDevice(@Param('deviceId') deviceId: string) {
    await this.iotService.deleteDevice(deviceId);
  }

  // ==================== 消息管理 ====================

  /**
   * 发送消息到设备
   */
  @Post('devices/:deviceId/messages')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '发送消息到设备' })
  @ApiResponse({ status: 201, description: '消息发送成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiBearerAuth()
  async sendMessageToDevice(
    @Param('deviceId') deviceId: string,
    @Body() message: {
      type: DeviceMessageType;
      payload: any;
      topic?: string;
    },
  ) {
    return this.iotService.sendMessageToDevice(deviceId, message);
  }

  /**
   * 获取设备消息历史
   */
  @Get('devices/:deviceId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取设备消息历史' })
  @ApiResponse({ status: 200, description: '获取消息历史成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  async getDeviceMessages(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit: number = 100,
    @Query('before') before?: string,
  ) {
    return this.iotService.getDeviceMessages(
      deviceId,
      limit,
      before ? new Date(before) : undefined,
    );
  }

  // ==================== 设备控制 ====================

  /**
   * 控制设备
   */
  @Post('devices/:deviceId/control')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '控制设备' })
  @ApiResponse({ status: 200, description: '设备控制成功' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiBearerAuth()
  async controlDevice(
    @Param('deviceId') deviceId: string,
    @Body() command: {
      action: string;
      params?: any;
    },
  ) {
    return this.iotService.controlDevice(deviceId, command);
  }
}
