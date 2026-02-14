import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_friend_requests')
@Index('idx_friend_requests_to_status', ['toUserId', 'status'])
@Index('idx_friend_requests_from', ['fromUserId'])
export class FriendRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  fromUserId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  toUserId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'expired';

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;
}
