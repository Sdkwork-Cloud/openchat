import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_rtc_channels')
export class RTCChannelEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  provider: string;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'app_id' })
  appId: string;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'app_key' })
  appKey: string;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'app_secret' })
  appSecret: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  region?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint?: string;

  @Column('jsonb', { nullable: false, default: {}, name: 'extra_config' })
  extraConfig: Record<string, any>;

  @Column({ type: 'boolean', nullable: false, default: true, name: 'is_active' })
  isActive: boolean;
}
