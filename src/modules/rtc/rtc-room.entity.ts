import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RTCChannelEntity } from './rtc-channel.entity';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_rtc_rooms')
export class RTCRoom extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'p2p' })
  type: 'p2p' | 'group';

  @Column({ type: 'varchar', length: 36, nullable: false })
  creatorId: string;

  @Column({ type: 'text', nullable: false, default: '[]' })
  participants: string; // JSON string of user IDs

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'active' })
  status: 'active' | 'ended';

  @Column({ type: 'bigint', nullable: true })
  channelId?: string; // 关联到RTCChannelEntity

  @ManyToOne(() => RTCChannelEntity, { nullable: true })
  @JoinColumn({ name: 'channelId' })
  channel?: RTCChannelEntity;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalRoomId?: string; // 外部RTC服务的房间ID

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;
}