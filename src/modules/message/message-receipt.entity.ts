import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { MessageStatus } from './message.interface';

@Entity({ name: 'chat_message_receipts' })
@Index('idx_chat_message_receipts_message_user', ['messageId', 'userId'], { unique: true })
@Index('idx_chat_message_receipts_user_status', ['userId', 'status'])
@Index('idx_chat_message_receipts_message', ['messageId'])
export class MessageReceipt extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'message_id' })
  messageId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt?: Date;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'source' })
  source?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'extra' })
  extra?: Record<string, unknown>;
}

