import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_group_invitations')
@Index('idx_group_invitations_group_invitee', ['groupId', 'inviteeId'])
@Index('idx_group_invitations_invitee_status', ['inviteeId', 'status'])
export class GroupInvitation extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'group_id' })
  groupId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'inviter_id' })
  inviterId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'invitee_id' })
  inviteeId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'expired';

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'responded_at' })
  respondedAt?: Date;
}
