import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_ai_bots')
export class AIBotEntity extends BaseEntity {
  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  description: string;

  @Column({ nullable: false })
  type: string;

  @Column('jsonb', { nullable: false, default: {} })
  config: Record<string, any>;

  @Column({ nullable: false, default: true })
  isActive: boolean;
}

@Entity('chat_bot_messages')
export class BotMessageEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  botId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string;

  @Column({ nullable: false, type: 'text' })
  message: string;

  @Column({ nullable: true, type: 'text' })
  response: string;

  @Column({ nullable: false, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
