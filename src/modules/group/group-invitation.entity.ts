import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_group_invitations')
@Index('idx_group_invitations_group_invitee', ['groupId', 'inviteeId'])
@Index('idx_group_invitations_invitee_status', ['inviteeId', 'status'])
export class GroupInvitation extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  groupId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  inviterId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  inviteeId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'expired';

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;
}
