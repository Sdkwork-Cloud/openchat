import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity({ name: 'chat_message_reactions' })
@Index('idx_chat_message_reactions_message_user_emoji', ['messageId', 'userId', 'emoji'], { unique: true })
@Index('idx_chat_message_reactions_message_emoji', ['messageId', 'emoji'])
@Index('idx_chat_message_reactions_message', ['messageId'])
export class MessageReaction extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'message_id' })
  messageId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 32, nullable: false })
  emoji: string;
}
