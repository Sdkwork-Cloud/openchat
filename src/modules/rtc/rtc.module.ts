import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RTCService } from './rtc.service';
import { RTCRoom } from './rtc-room.entity';
import { RTCToken } from './rtc-token.entity';
import { RTCChannelEntity } from './rtc-channel.entity';
import { RTCVideoRecord } from './rtc-video-record.entity';
import { RTCCallSession } from './rtc-call-session.entity';
import { RTCCallParticipant } from './rtc-call-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RTCRoom,
      RTCToken,
      RTCChannelEntity,
      RTCVideoRecord,
      RTCCallSession,
      RTCCallParticipant,
    ]),
  ],
  providers: [RTCService],
  exports: [RTCService],
})
export class RtcModule {}
