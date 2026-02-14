import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

@Entity('chat_groups')
@Index('idx_groups_owner', ['ownerId'])
@Index('idx_groups_status', ['status'])
export class Group extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  avatar?: string | ImageMediaResource;

  @Column({ type: 'varchar', length: 36, nullable: false })
  ownerId: string;

  @Column({ type: 'int', nullable: false, default: 500 })
  maxMembers: number;

  @Column({ type: 'text', nullable: true })
  announcement?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'active' })
  status: 'active' | 'dismissed' | 'banned';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'approval' })
  joinType: 'free' | 'approval' | 'forbidden';

  @Column({ type: 'boolean', nullable: false, default: false })
  muteAll: boolean;

  @Column({ type: 'jsonb', nullable: true })
  resources?: Record<string, AnyMediaResource>;

  @Column({ type: 'timestamp', nullable: true })
  dismissedAt?: Date;
}
