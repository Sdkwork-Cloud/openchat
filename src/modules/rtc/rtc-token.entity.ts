import { Check, Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { RTCProviderType } from './rtc.constants';

@Entity('chat_rtc_tokens')
@Index('idx_rtc_tokens_token', ['token'])
@Index('idx_rtc_tokens_room_user', ['roomId', 'userId'])
@Check(`"provider" IS NULL OR "provider" IN ('volcengine', 'tencent', 'alibaba', 'livekit')`)
export class RTCToken extends BaseEntity {
  @Column({ type: 'bigint', nullable: false, name: 'room_id' })
  roomId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'bigint', nullable: true, name: 'channel_id' })
  channelId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider?: RTCProviderType;

  @Column({ type: 'text', nullable: false })
  token: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  role?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: false, name: 'expires_at' })
  expiresAt: Date;
}
