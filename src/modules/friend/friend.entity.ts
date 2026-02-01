import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

/**
 * 好友关系实体
 * 仅管理好友关系的状态和请求流程，不存储展示信息
 * 展示信息统一从Contact实体获取
 */
@Entity('chat_friends')
@Index(['userId', 'friendId'], { unique: true })
export class Friend extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  friendId: string;

  /**
   * 关系状态
   * - pending: 等待确认（仅用于请求流程）
   * - accepted: 已接受（成为好友）
   * - blocked: 已拉黑
   */
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'accepted' })
  status: 'pending' | 'accepted' | 'blocked';

  /**
   * 关系建立时间
   */
  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date;
}
