import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { RTCRoom } from './rtc-room.entity';
import { BaseEntity } from '../../common/base.entity';
import { RTCChannelEntity } from './rtc-channel.entity';
import { RTCProviderType } from './rtc.constants';

@Entity('chat_rtc_video_records')
@Index('idx_rtc_video_records_external_task_id', ['externalTaskId'])
@Check(`"provider" IS NULL OR "provider" IN ('volcengine', 'tencent', 'alibaba', 'livekit')`)
@Check(`"sync_status" IN ('pending', 'synced', 'failed')`)
@Check(`"end_time" IS NULL OR "end_time" > "start_time"`)
export class RTCVideoRecord extends BaseEntity {
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

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'external_task_id' })
  externalTaskId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'file_name' })
  fileName?: string;

  @Column({ type: 'varchar', length: 1024, nullable: true, name: 'file_path' })
  filePath?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'file_type' })
  fileType?: string;

  @Column({ type: 'bigint', nullable: true, name: 'file_size' })
  fileSize?: number;

  @Column({ type: 'timestamp', nullable: false, name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'end_time' })
  endTime?: Date;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'completed' })
  status: 'recording' | 'completed' | 'failed' | 'processing';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending', name: 'sync_status' })
  syncStatus: 'pending' | 'synced' | 'failed';

  @Column({ type: 'timestamp', nullable: true, name: 'last_synced_at' })
  lastSyncedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @Column({ type: 'text', nullable: true, name: 'sync_error' })
  syncError?: string;
}
