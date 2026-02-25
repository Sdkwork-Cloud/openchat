import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_friends')
@Index(['userId', 'friendId'], { unique: true })
@Index('idx_friends_user_status', ['userId', 'status'])
export class Friend extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'friend_id' })
  friendId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  remark?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  group?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'accepted' })
  status: 'pending' | 'accepted' | 'blocked';

  @Column({ type: 'timestamp', nullable: true, name: 'accepted_at' })
  acceptedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'blocked_at' })
  blockedAt?: Date;
}
