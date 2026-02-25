import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_third_party_messages')
export class ThirdPartyMessage extends BaseEntity {
  @Column({ type: 'varchar', length: 20, nullable: false })
  platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal';

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'from_user_id' })
  fromUserId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'to_user_id' })
  toUserId: string;

  @Column({ type: 'jsonb', nullable: false })
  content: any;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'text' })
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card' | 'custom';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'sending' })
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'platform_message_id' })
  platformMessageId?: string;
}
