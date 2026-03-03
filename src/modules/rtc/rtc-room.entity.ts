import { Check, Entity, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RTCChannelEntity } from './rtc-channel.entity';
import { BaseEntity } from '../../common/base.entity';
import { RTCProviderType } from './rtc.constants';

@Entity('chat_rtc_rooms')
@Check(`"provider" IS NULL OR "provider" IN ('volcengine', 'tencent', 'alibaba', 'livekit')`)
export class RTCRoom extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'p2p' })
  type: 'p2p' | 'group';

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'creator_id' })
  creatorId: string;

  @Column({ type: 'jsonb', nullable: false, default: [] })
  participants: string[];

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'active' })
  status: 'active' | 'ended';

  @Column({ type: 'bigint', nullable: true, name: 'channel_id' })
  channelId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider?: RTCProviderType;

  @ManyToOne(() => RTCChannelEntity, { nullable: true })
  @JoinColumn({ name: 'channel_id' })
  channel?: RTCChannelEntity;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'external_room_id' })
  externalRoomId?: string;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'ai_enabled' })
  aiEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'ai_metadata' })
  aiMetadata?: Record<string, any>;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'ended_at' })
  endedAt?: Date;
}
