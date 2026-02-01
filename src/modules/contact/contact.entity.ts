import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

/**
 * 联系人类型
 */
export type ContactType = 'user' | 'group';

/**
 * 联系人来源
 * - friend: 来自好友关系
 * - group: 来自群组
 * - manual: 手动添加
 */
export type ContactSource = 'friend' | 'group' | 'manual';

/**
 * 联系人实体
 * 统一的联系人视图，整合好友、群组和手动添加的联系人
 * 所有展示信息都在这里，不重复存储关系数据
 */
@Entity('chat_contacts')
@Index(['userId', 'contactId', 'type'], { unique: true })
export class ContactEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string; // 联系人所属用户ID

  @Column({ type: 'varchar', length: 36, nullable: false })
  contactId: string; // 联系人ID（用户ID或群组ID）

  @Column({ type: 'varchar', length: 20, nullable: false })
  type: ContactType;

  /**
   * 联系人来源
   * 用于区分联系人是来自好友、群组还是手动添加
   */
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'manual' })
  source: ContactSource;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string; // 联系人名称（昵称或群组名）

  @Column({ type: 'jsonb', nullable: true })
  avatar?: string | ImageMediaResource; // 联系人头像

  @Column({ type: 'varchar', length: 100, nullable: true })
  remark?: string; // 备注名

  /**
   * 联系人状态
   * - active: 正常
   * - blocked: 被拉黑（仅用于user类型）
   * - deleted: 已删除
   */
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'active' })
  status: 'active' | 'blocked' | 'deleted';

  @Column({ type: 'boolean', nullable: false, default: false })
  isFavorite: boolean; // 是否收藏

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[]; // 标签

  @Column({ type: 'jsonb', nullable: true })
  extraInfo?: Record<string, any>; // 额外信息

  @Column({ type: 'timestamp', nullable: true })
  lastContactTime?: Date; // 最后联系时间
}
