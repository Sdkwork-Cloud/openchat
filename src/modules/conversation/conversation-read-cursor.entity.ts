import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_conversation_read_cursors')
@Index(['userId', 'deviceId', 'targetId', 'type'], { unique: true })
@Index('idx_chat_conv_read_cursors_user_device', ['userId', 'deviceId'])
@Index('idx_chat_conv_read_cursors_user_target', ['userId', 'type', 'targetId'])
export class ConversationReadCursorEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 64, nullable: false, name: 'device_id' })
  deviceId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'target_id' })
  targetId: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  type: 'single' | 'group';

  @Column({ type: 'bigint', nullable: false, default: 0, name: 'last_read_seq' })
  lastReadSeq: number;
}
