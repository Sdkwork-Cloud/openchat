import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { TimelineFeedItemStatus, TimelineVisibility } from '../timeline.interface';

@Entity('chat_timeline_feed_items')
@Index(['userId', 'postId'], { unique: true })
@Index('idx_timeline_feed_user_score', ['userId', 'sortScore', 'postId'])
@Index('idx_timeline_feed_post', ['postId'])
@Index('idx_timeline_feed_author_score', ['authorId', 'sortScore'])
export class TimelineFeedItemEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'bigint', nullable: false, name: 'post_id' })
  postId: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'author_id' })
  authorId: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: TimelineVisibility.FRIENDS,
  })
  visibility: TimelineVisibility;

  @Column({ type: 'bigint', nullable: false, name: 'sort_score' })
  sortScore: string;

  @Column({ type: 'timestamp', nullable: false, name: 'published_at' })
  publishedAt: Date;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: TimelineFeedItemStatus.ACTIVE,
  })
  status: TimelineFeedItemStatus;
}
