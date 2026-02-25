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

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'target_id' })
  targetId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'target_name' })
  targetName?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'target_avatar' })
  targetAvatar?: string | ImageMediaResource;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'last_message_id' })
  lastMessageId?: string;

  @Column({ type: 'text', nullable: true, name: 'last_message_content' })
  lastMessageContent?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_message_time' })
  lastMessageTime?: Date;

  @Column({ type: 'int', nullable: false, default: 0, name: 'unread_count' })
  unreadCount: number;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'is_pinned' })
  isPinned: boolean;

  @Column({ type: 'boolean', nullable: false, default: false, name: 'is_muted' })
  isMuted: boolean;

  @Column({ type: 'text', nullable: true })
  draft?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'draft_updated_at' })
  draftUpdatedAt?: Date;

  @Column({ type: 'bigint', nullable: true, name: 'last_read_seq' })
  lastReadSeq?: number;
}
