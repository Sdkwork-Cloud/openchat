import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_rtc_channels')
export class RTCChannelEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  provider: string; // 提供商名称，如tencent, alibaba, bytedance, livekit等

  @Column({ type: 'varchar', length: 100, nullable: false })
  appId: string; // 应用ID

  @Column({ type: 'varchar', length: 100, nullable: false })
  appKey: string; // 应用Key

  @Column({ type: 'varchar', length: 255, nullable: false })
  appSecret: string; // 应用Secret

  @Column({ type: 'varchar', length: 50, nullable: true })
  region?: string; // 区域

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint?: string; // 自定义端点

  @Column('jsonb', { nullable: false, default: {} })
  extraConfig: Record<string, any>; // 额外配置

  @Column({ type: 'boolean', nullable: false, default: true })
  isActive: boolean; // 是否启用
}
