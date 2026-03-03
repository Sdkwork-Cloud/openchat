import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { RTCChannelEntity } from './rtc-channel.entity';
import { RTCProviderType } from './rtc.constants';
import { RTCRoom } from './rtc-room.entity';

@Entity('chat_rtc_call_sessions')
@Index('idx_rtc_call_sessions_room', ['roomId'])
@Index('idx_rtc_call_sessions_status', ['status'])
@Index('idx_rtc_call_sessions_provider', ['provider'])
@Index('idx_rtc_call_sessions_external_session_id', ['externalSessionId'])
@Index(
  'idx_rtc_call_sessions_room_active_unique',
  ['roomId'],
  { unique: true, where: `"is_deleted" = false AND "status" IN ('ringing', 'active')` },
)
@Check(`"provider" IS NULL OR "provider" IN ('volcengine', 'tencent', 'alibaba', 'livekit')`)
@Check(`"status" IN ('ringing', 'active', 'ended', 'failed', 'cancelled', 'timeout')`)
@Check(`"end_time" IS NULL OR "end_time" > "start_time"`)
export class RTCCallSession extends BaseEntity {
  @Column({ type: 'bigint', nullable: false, name: 'room_id' })
  roomId: string;

  @ManyToOne(() => RTCRoom, { nullable: false })
  @JoinColumn({ name: 'room_id' })
  room: RTCRoom;

  @Column({ type: 'bigint', nullable: true, name: 'channel_id' })
  channelId?: string;

  @ManyToOne(() => RTCChannelEntity, { nullable: true })
  @JoinColumn({ name: 'channel_id' })
  channel?: RTCChannelEntity;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider?: RTCProviderType;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'initiator_user_id' })
  initiatorUserId: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'external_session_id' })
  externalSessionId?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'active' })
  status: 'ringing' | 'active' | 'ended' | 'failed' | 'cancelled' | 'timeout';

  @Column({ type: 'timestamp', nullable: false, name: 'start_time', default: () => 'CURRENT_TIMESTAMP' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'end_time' })
  endTime?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'end_reason' })
  endReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
