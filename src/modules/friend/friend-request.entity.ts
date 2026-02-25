import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_friend_requests')
@Index('idx_friend_requests_to_status', ['toUserId', 'status'])
@Index('idx_friend_requests_from', ['fromUserId'])
export class FriendRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'from_user_id' })
  fromUserId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'to_user_id' })
  toUserId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'expired';

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'responded_at' })
  respondedAt?: Date;
}
