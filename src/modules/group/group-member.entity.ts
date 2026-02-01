import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_group_members')
export class GroupMember extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  groupId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'member' })
  role: 'owner' | 'admin' | 'member';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'joined' })
  status: 'joined' | 'pending' | 'kicked';

  @CreateDateColumn()
  joinedAt: Date;
}