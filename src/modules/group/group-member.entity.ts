import { Entity, Column, Index, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_group_members')
@Index('idx_group_members_group_user', ['groupId', 'userId'], { unique: true })
@Index('idx_group_members_user_status', ['userId', 'status'])
export class GroupMember extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'group_id' })
  groupId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'member' })
  role: 'owner' | 'admin' | 'member';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'joined' })
  status: 'joined' | 'pending' | 'kicked' | 'quit';

  @Column({ type: 'timestamp', nullable: true, name: 'mute_until' })
  muteUntil?: Date;

  @Column({ type: 'bigint', nullable: true, name: 'last_read_seq' })
  lastReadSeq?: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
