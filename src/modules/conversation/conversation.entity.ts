import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { ImageMediaResource } from '../im-provider/media-resource.interface';

@Entity('chat_conversations')
@Index(['userId', 'targetId', 'type'], { unique: true })
@Index('idx_conversations_user_pinned_time', ['userId', 'isPinned', 'lastMessageTime'])
@Index('idx_conversations_user_time', ['userId', 'lastMessageTime'])
export class ConversationEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 20, nullable: false })
  type: 'single' | 'group';

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  targetId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetName?: string;

  @Column({ type: 'jsonb', nullable: true })
  targetAvatar?: string | ImageMediaResource;

  @Column({ type: 'varchar', length: 36, nullable: true })
  lastMessageId?: string;

  @Column({ type: 'text', nullable: true })
  lastMessageContent?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageTime?: Date;

  @Column({ type: 'int', nullable: false, default: 0 })
  unreadCount: number;

  @Column({ type: 'boolean', nullable: false, default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', nullable: false, default: false })
  isMuted: boolean;

  @Column({ type: 'text', nullable: true })
  draft?: string;

  @Column({ type: 'timestamp', nullable: true })
  draftUpdatedAt?: Date;

  @Column({ type: 'bigint', nullable: true })
  lastReadSeq?: number;
}
