import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { IMMessageContent } from '../im-provider/im-provider.interface';

@Entity({
  name: 'chat_messages'
})
// 单聊消息索引（正向和反向）
@Index('idx_chat_messages_from_to_created', (message: any) => [message.fromUserId, message.toUserId, message.createdAt])
@Index('idx_chat_messages_to_from_created', (message: any) => [message.toUserId, message.fromUserId, message.createdAt])
// 群聊消息索引
@Index('idx_chat_messages_group_created', (message: any) => [message.groupId, message.createdAt])
// 按发送者查询索引
@Index('idx_chat_messages_from_created', (message: any) => [message.fromUserId, message.createdAt])
// 按接收者查询索引
@Index('idx_chat_messages_to_created', (message: any) => [message.toUserId, message.createdAt])
// 客户端序列号去重索引
@Index('idx_chat_messages_client_seq', (message: any) => [message.fromUserId, message.clientSeq], { unique: false })
export class Message extends BaseEntity {
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'text' })
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card' | 'custom' | 'system';

  @Column({ type: 'jsonb', nullable: false })
  content: IMMessageContent; // 消息内容，结构化对象

  @Column({ type: 'varchar', length: 36, nullable: false })
  fromUserId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  toUserId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  groupId?: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'sent' })
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

  @Column({ type: 'bigint', nullable: true, comment: '客户端序列号，用于消息去重' })
  clientSeq?: number; // 客户端序列号，用于消息去重
}