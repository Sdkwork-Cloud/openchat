import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_friend_requests')
export class FriendRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  fromUserId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  toUserId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected';

  @Column({ type: 'text', nullable: true })
  message?: string;
}