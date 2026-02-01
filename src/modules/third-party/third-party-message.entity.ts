import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_third_party_messages')
export class ThirdPartyMessage extends BaseEntity {
  @Column({ type: 'varchar', length: 20, nullable: false })
  platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal';

  @Column({ type: 'varchar', length: 36, nullable: false })
  fromUserId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  toUserId: string;

  @Column({ type: 'jsonb', nullable: false })
  content: any; // 支持结构化消息内容

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'text' })
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card' | 'custom';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'sending' })
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

  @Column({ type: 'varchar', length: 255, nullable: true })
  platformMessageId?: string;
}