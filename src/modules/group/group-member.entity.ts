import { Entity, Column, Index, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_group_members')
@Index('idx_group_members_group_user', ['groupId', 'userId'], { unique: true })
@Index('idx_group_members_user_status', ['userId', 'status'])
export class GroupMember extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  groupId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'member' })
  role: 'owner' | 'admin' | 'member';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'joined' })
  status: 'joined' | 'pending' | 'kicked' | 'quit';

  @Column({ type: 'timestamp', nullable: true })
  muteUntil?: Date;

  @Column({ type: 'bigint', nullable: true })
  lastReadSeq?: number;

  @CreateDateColumn()
  joinedAt: Date;
}
