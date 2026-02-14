import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RTCRoom as RTCRoomEntity } from './rtc-room.entity';
import { RTCToken } from './rtc-token.entity';
import { RTCChannelEntity } from './rtc-channel.entity';
import { RTCVideoRecord } from './rtc-video-record.entity';
import { RTCManager, RTCRoom } from './rtc.interface';
import { rtcChannelFactory } from './channels/rtc-channel.base';
import { RTCChannel, RTCChannelConfig, RTCChannelRoomInfo, RTCChannelToken } from './channels/rtc-channel.interface';

@Injectable()
export class RTCService implements RTCManager {
  private readonly logger = new Logger(RTCService.name);

  constructor(
    @InjectRepository(RTCRoomEntity)
    private rtcRoomRepository: Repository<RTCRoomEntity>,
    @InjectRepository(RTCToken)
    private rtcTokenRepository: Repository<RTCToken>,
    @InjectRepository(RTCChannelEntity)
    private rtcChannelRepository: Repository<RTCChannelEntity>,
    @InjectRepository(RTCVideoRecord)
    private rtcVideoRecordRepository: Repository<RTCVideoRecord>,
  ) {
    // 注册默认的RTC Channel提供�?
    try {
      const { TencentRTCChannel } = require('./channels/tencent');
      const { AlibabaRTCChannel } = require('./channels/alibaba');
      const { BytedanceRTCChannel } = require('./channels/bytedance');
      const { LiveKitRTCChannel } = require('./channels/livekit');

      rtcChannelFactory.registerProvider('tencent', TencentRTCChannel);
      rtcChannelFactory.registerProvider('alibaba', AlibabaRTCChannel);
      rtcChannelFactory.registerProvider('bytedance', BytedanceRTCChannel);
      rtcChannelFactory.registerProvider('livekit', LiveKitRTCChannel);

      this.logger.log('RTC Channel providers registered successfully: ' + JSON.stringify(rtcChannelFactory.getSupportedProviders()));
    } catch (error) {
      this.logger.error('Failed to register RTC Channel providers:', error);
    }
  }

  // 辅助方法：将RTCRoomEntity转换为RTCRoom接口
  private mapToRTCRoom(entity: RTCRoomEntity): RTCRoom {
    return {
      id: entity.id,
      uuid: entity.uuid,
      name: entity.name,
      type: entity.type,
      creatorId: entity.creatorId,
      participants: JSON.parse(entity.participants),
      status: entity.status,
      startedAt: entity.startedAt,
      endedAt: entity.endedAt,
    };
  }

  // 获取或创建RTC Channel实例
  private async getOrCreateChannel(channelId: string): Promise<RTCChannel> {
    const channelEntity = await this.rtcChannelRepository.findOne({ where: { id: channelId } });
    if (!channelEntity) {
      throw new Error('RTC Channel not found');
    }

    // 创建Channel配置
    const config: RTCChannelConfig = {
      provider: channelEntity.provider,
      appId: channelEntity.appId,
      appKey: channelEntity.appKey,
      appSecret: channelEntity.appSecret,
      region: channelEntity.region,
      endpoint: channelEntity.endpoint,
      ...channelEntity.extraConfig,
    };

    // 创建Channel实例
    const channel = rtcChannelFactory.createChannel(channelEntity.provider);
    await channel.initialize(config);

    return channel;
  }

  async createRoom(creatorId: string, type: 'p2p' | 'group', participants: string[], name?: string, channelId?: string): Promise<RTCRoom> {
    // 确保创建者在参与者列表中
    if (!participants.includes(creatorId)) {
      participants.push(creatorId);
    }

    // 创建房间实体
    const room = this.rtcRoomRepository.create({
      name,
      type,
      creatorId,
      participants: JSON.stringify(participants),
      status: 'active',
      channelId,
    });

    // 如果指定了Channel，需要在Channel中创建房�?
    if (channelId) {
      const channel = await this.getOrCreateChannel(channelId);
      const channelRoomInfo = await channel.createRoom(room.id, name, type);
      room.externalRoomId = channelRoomInfo.roomId;
    }

    const savedRoom = await this.rtcRoomRepository.save(room);
    return this.mapToRTCRoom(savedRoom);
  }

  async endRoom(roomId: string): Promise<boolean> {
    const room = await this.rtcRoomRepository.findOne({ where: { id: roomId } });
    if (!room || room.status === 'ended') {
      return false;
    }

    // 如果房间关联了Channel，需要在Channel中销毁房�?
    if (room.channelId) {
      try {
        const channel = await this.getOrCreateChannel(room.channelId);
        await channel.destroyRoom(room.externalRoomId || room.id);
      } catch (error) {
        // Channel操作失败不影响本地状态更�?
        this.logger.error('Failed to destroy room in channel:', error);
      }
    }

    room.status = 'ended';
    room.endedAt = new Date();
    await this.rtcRoomRepository.save(room);
    return true;
  }

  async getRoomById(roomId: string): Promise<RTCRoom | null> {
    const room = await this.rtcRoomRepository.findOne({ where: { id: roomId } });
    return room ? this.mapToRTCRoom(room) : null;
  }

  async getRoomsByUserId(userId: string): Promise<RTCRoom[]> {
    const rooms = await this.rtcRoomRepository.find();
    const userRooms = rooms.filter(room => {
      const participants = JSON.parse(room.participants);
      return participants.includes(userId);
    });
    // 按开始时间倒序排序
    userRooms.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    // 转换为RTCRoom接口类型
    return userRooms.map(room => this.mapToRTCRoom(room));
  }

  async generateToken(roomId: string, userId: string, channelId?: string): Promise<RTCToken> {
    // 检查房间是否存�?
    const room = await this.rtcRoomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new Error('Room not found');
    }

    // 检查用户是否在房间参与者列表中
    const participants = JSON.parse(room.participants);
    if (!participants.includes(userId)) {
      throw new Error('User not in room');
    }

    // 如果指定了Channel或房间关联了Channel，使用Channel生成令牌
    const targetChannelId = channelId || room.channelId;
    if (targetChannelId) {
      const channel = await this.getOrCreateChannel(targetChannelId);
      const channelToken = await channel.generateToken(
        room.externalRoomId || room.id,
        userId
      );

      // 保存令牌到数据库
      const rtcToken = this.rtcTokenRepository.create({
        roomId,
        userId,
        token: channelToken.token,
        expiresAt: channelToken.expiresAt,
      });
      return this.rtcTokenRepository.save(rtcToken);
    }

    // 否则使用本地模拟令牌
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2小时过期
    
    const token = `rtc_token_${roomId}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const rtcToken = this.rtcTokenRepository.create({
      roomId,
      userId,
      token,
      expiresAt,
    });
    return this.rtcTokenRepository.save(rtcToken);
  }

  async validateToken(token: string): Promise<RTCToken | null> {
    const rtcToken = await this.rtcTokenRepository.findOne({ where: { token } });
    if (rtcToken && rtcToken.expiresAt > new Date()) {
      return rtcToken;
    }
    return null;
  }

  async addParticipant(roomId: string, userId: string): Promise<boolean> {
    const room = await this.rtcRoomRepository.findOne({ where: { id: roomId } });
    if (!room || room.status === 'ended') {
      return false;
    }

    const participants = JSON.parse(room.participants);
    if (!participants.includes(userId)) {
      participants.push(userId);
      room.participants = JSON.stringify(participants);
      await this.rtcRoomRepository.save(room);

      // 如果房间关联了Channel，需要在Channel中添加参与�?
      if (room.channelId) {
        try {
          const channel = await this.getOrCreateChannel(room.channelId);
          await channel.addParticipant(room.externalRoomId || room.id, userId);
        } catch (error) {
          // Channel操作失败不影响本地状态更�?
          this.logger.error('Failed to add participant to channel:', error);
        }
      }
    }
    return true;
  }

  async removeParticipant(roomId: string, userId: string): Promise<boolean> {
    const room = await this.rtcRoomRepository.findOne({ where: { id: roomId } });
    if (!room || room.status === 'ended') {
      return false;
    }

    const participants = JSON.parse(room.participants);
    const index = participants.indexOf(userId);
    if (index > -1) {
      participants.splice(index, 1);
      room.participants = JSON.stringify(participants);
      await this.rtcRoomRepository.save(room);

      // 如果房间关联了Channel，需要在Channel中移除参与�?
      if (room.channelId) {
        try {
          const channel = await this.getOrCreateChannel(room.channelId);
          await channel.removeParticipant(room.externalRoomId || room.id, userId);
        } catch (error) {
          // Channel操作失败不影响本地状态更�?
          this.logger.error('Failed to remove participant from channel:', error);
        }
      }
    }
    return true;
  }

  // 新增：创建RTC Channel配置
  async createChannel(config: {
    provider: string;
    appId: string;
    appKey: string;
    appSecret: string;
    region?: string;
    endpoint?: string;
    extraConfig?: Record<string, any>;
  }): Promise<RTCChannelEntity> {
    const channel = this.rtcChannelRepository.create({
      provider: config.provider,
      appId: config.appId,
      appKey: config.appKey,
      appSecret: config.appSecret,
      region: config.region,
      endpoint: config.endpoint,
      extraConfig: config.extraConfig || {},
      isActive: true,
    });
    return this.rtcChannelRepository.save(channel);
  }

  // 新增：获取所有RTC Channel配置
  async getChannels(): Promise<RTCChannelEntity[]> {
    return this.rtcChannelRepository.find();
  }

  // 新增：获取单个RTC Channel配置
  async getChannel(id: string): Promise<RTCChannelEntity | null> {
    return this.rtcChannelRepository.findOne({ where: { id } });
  }

  // 新增：更新RTC Channel配置
  async updateChannel(id: string, config: Partial<RTCChannelEntity>): Promise<RTCChannelEntity | null> {
    const channel = await this.rtcChannelRepository.findOne({ where: { id } });
    if (!channel) {
      return null;
    }
    Object.assign(channel, config);
    return this.rtcChannelRepository.save(channel);
  }

  // 新增：删除RTC Channel配置
  async deleteChannel(id: string): Promise<boolean> {
    const result = await this.rtcChannelRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  // 新增：RTC通话视频文件记录相关方法

  // 创建视频记录
  async createVideoRecord(recordData: {
    roomId: string;
    userId?: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    startTime: Date;
    endTime: Date;
    status?: 'recording' | 'completed' | 'failed' | 'processing';
    metadata?: string;
  }): Promise<RTCVideoRecord> {
    const record = this.rtcVideoRecordRepository.create({
      roomId: recordData.roomId,
      userId: recordData.userId,
      fileName: recordData.fileName,
      filePath: recordData.filePath,
      fileType: recordData.fileType,
      fileSize: recordData.fileSize,
      startTime: recordData.startTime,
      endTime: recordData.endTime,
      status: recordData.status || 'completed',
      metadata: recordData.metadata,
    });
    return this.rtcVideoRecordRepository.save(record);
  }

  // 获取视频记录详情
  async getVideoRecord(id: string): Promise<RTCVideoRecord | null> {
    return this.rtcVideoRecordRepository.findOne({ where: { id } });
  }

  // 获取房间的视频记录列�?
  async getVideoRecordsByRoomId(roomId: string): Promise<RTCVideoRecord[]> {
    return this.rtcVideoRecordRepository.find({
      where: { roomId },
      order: { startTime: 'DESC' },
    });
  }

  // 获取用户的视频记录列�?
  async getVideoRecordsByUserId(userId: string): Promise<RTCVideoRecord[]> {
    return this.rtcVideoRecordRepository.find({
      where: { userId },
      order: { startTime: 'DESC' },
    });
  }

  // 更新视频记录状�?
  async updateVideoRecordStatus(id: string, status: 'recording' | 'completed' | 'failed' | 'processing', errorMessage?: string): Promise<RTCVideoRecord | null> {
    const record = await this.rtcVideoRecordRepository.findOne({ where: { id } });
    if (!record) {
      return null;
    }
    record.status = status;
    if (errorMessage) {
      record.errorMessage = errorMessage;
    }
    return this.rtcVideoRecordRepository.save(record);
  }

  // 更新视频记录元数�?
  async updateVideoRecordMetadata(id: string, metadata: string): Promise<RTCVideoRecord | null> {
    const record = await this.rtcVideoRecordRepository.findOne({ where: { id } });
    if (!record) {
      return null;
    }
    record.metadata = metadata;
    return this.rtcVideoRecordRepository.save(record);
  }

  // 删除视频记录
  async deleteVideoRecord(id: string): Promise<boolean> {
    const result = await this.rtcVideoRecordRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  // 获取所有视频记录（分页�?
  async getVideoRecords(limit: number = 50, offset: number = 0): Promise<RTCVideoRecord[]> {
    return this.rtcVideoRecordRepository.find({
      order: { startTime: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
