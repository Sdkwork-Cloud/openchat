import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_third_party_contacts')
export class ThirdPartyContact extends BaseEntity {
  @Column({ type: 'varchar', length: 20, nullable: false })
  platform: 'whatsapp' | 'telegram' | 'wechat' | 'signal';

  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  platformUserId: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  avatar?: string | any; // 支持URL或结构化图片资源
}