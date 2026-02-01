import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RTCService } from './rtc.service';
import { RTCController } from './rtc.controller';
import { RTCRoom } from './rtc-room.entity';
import { RTCToken } from './rtc-token.entity';
import { RTCChannelEntity } from './rtc-channel.entity';
import { RTCVideoRecord } from './rtc-video-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RTCRoom, RTCToken, RTCChannelEntity, RTCVideoRecord])],
  providers: [RTCService],
  controllers: [RTCController],
  exports: [RTCService],
})
export class RtcModule {}