import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { IMMessageContent } from '../im-provider/im-provider.interface';

@Entity({
  name: 'chat_messages',
  indices: [
    // 单聊消息索引（正向和反向）
    { columns: ['fromUserId', 'toUserId', 'createdAt'], name: 'idx_chat_messages_from_to_created' },
    { columns: ['toUserId', 'fromUserId', 'createdAt'], name: 'idx_chat_messages_to_from_created' },
    // 群聊消息索引
    { columns: ['groupId', 'createdAt'], name: 'idx_chat_messages_group_created' },
    // 按发送者查询索引
    { columns: ['fromUserId', 'createdAt'], name: 'idx_chat_messages_from_created' },
    // 按接收者查询索引
    { columns: ['toUserId', 'createdAt'], name: 'idx_chat_messages_to_created' },
    // 客户端序列号去重索引
    { columns: ['fromUserId', 'clientSeq'], name: 'idx_chat_messages_client_seq', unique: false },
  ],
})
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