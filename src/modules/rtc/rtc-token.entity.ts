import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_rtc_tokens')
export class RTCToken extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'room_id' })
  roomId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'text', nullable: false })
  token: string;

  @Column({ type: 'timestamp', nullable: false, name: 'expires_at' })
  expiresAt: Date;
}
