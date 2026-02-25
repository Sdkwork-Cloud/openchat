import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

export type ContactType = 'user' | 'group';
export type ContactSource = 'friend' | 'group' | 'manual';

@Entity('chat_contacts')
@Index(['userId', 'contactId', 'type'], { unique: true })
export class ContactEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'contact_id' })
  contactId: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  type: ContactType;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'manual' })
  source: ContactSource;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  avatar?: string | ImageMediaResource;

  @Column({ type: 'varchar', length: 100, nullable: true })
  remark?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'active' })
  status: 'active' | 'blocked' | 'deleted';

  @Column({ type: 'boolean', nullable: false, default: false, name: 'is_favorite' })
  isFavorite: boolean;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'extra_info' })
  extraInfo?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true, name: 'last_contact_time' })
  lastContactTime?: Date;
}
