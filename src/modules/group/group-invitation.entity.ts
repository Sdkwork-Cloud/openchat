import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_group_invitations')
export class GroupInvitation extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  groupId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  inviterId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  inviteeId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected';

  @Column({ type: 'text', nullable: true })
  message?: string;
}