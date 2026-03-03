import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('chat_timeline_post_likes')
@Index(['postId', 'userId'], { unique: true })
@Index('idx_timeline_likes_user_time', ['userId', 'createdAt'])
export class TimelinePostLikeEntity extends BaseEntity {
  @Column({ type: 'bigint', nullable: false, name: 'post_id' })
  postId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'timestamp', nullable: true, name: 'canceled_at' })
  canceledAt?: Date;
}
