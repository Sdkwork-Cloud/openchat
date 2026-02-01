import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

/**
 * 会话实体
 */
@Entity('chat_conversations')
@Index(['userId', 'targetId', 'type'], { unique: true })
export class ConversationEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 20, nullable: false })
  type: 'single' | 'group';

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string; // 会话所属用户ID

  @Column({ type: 'varchar', length: 36, nullable: false })
  targetId: string; // 对方用户ID或群组ID

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetName?: string; // 对方名称或群组名称

  @Column({ type: 'jsonb', nullable: true })
  targetAvatar?: string | ImageMediaResource; // 对方头像或群组头像

  @Column({ type: 'varchar', length: 36, nullable: true })
  lastMessageId?: string; // 最后一条消息ID

  @Column({ type: 'text', nullable: true })
  lastMessageContent?: string; // 最后一条消息内容预览

  @Column({ type: 'timestamp', nullable: true })
  lastMessageTime?: Date; // 最后一条消息时间

  @Column({ type: 'int', nullable: false, default: 0 })
  unreadCount: number; // 未读消息数

  @Column({ type: 'boolean', nullable: false, default: false })
  isPinned: boolean; // 是否置顶

  @Column({ type: 'boolean', nullable: false, default: false })
  isMuted: boolean; // 是否免打扰
}
