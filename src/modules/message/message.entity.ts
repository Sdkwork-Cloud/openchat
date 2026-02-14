import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { MessageType, MessageStatus, MessageContent } from './message.interface';

@Entity({ name: 'chat_messages' })
@Index('idx_chat_messages_from_to_created', (m: Message) => [m.fromUserId, m.toUserId, m.createdAt])
@Index('idx_chat_messages_to_from_created', (m: Message) => [m.toUserId, m.fromUserId, m.createdAt])
@Index('idx_chat_messages_group_created', (m: Message) => [m.groupId, m.createdAt])
@Index('idx_chat_messages_status', ['status'])
@Index('idx_chat_messages_client_seq', (m: Message) => [m.fromUserId, m.clientSeq], { unique: false })
export class Message extends BaseEntity {
  @Column({
    type: 'enum',
    enum: Object.values(MessageType),
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'jsonb', nullable: false })
  content: MessageContent;

  @Column({ type: 'varchar', length: 36, nullable: false })
  fromUserId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  toUserId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  groupId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  replyToId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  forwardFromId?: string;

  @Column({ type: 'bigint', nullable: true, comment: '服务端序列号，全局递增' })
  seq?: number;

  @Column({
    type: 'enum',
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'bigint', nullable: true, comment: '客户端序列号，用于消息去重' })
  clientSeq?: number;

  @Column({ type: 'int', nullable: false, default: 0, comment: '重试次数' })
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true, comment: '扩展数据' })
  extra?: Record<string, any>;

  @Column({ type: 'boolean', nullable: false, default: true, comment: '是否需要已读回执' })
  needReadReceipt: boolean;

  @Column({ type: 'timestamp', nullable: true })
  recalledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  editedAt?: Date;
}
