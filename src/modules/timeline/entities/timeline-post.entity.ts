import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import {
  TimelineDistributionMode,
  TimelineMediaItem,
  TimelinePostStatus,
  TimelineVisibility,
} from '../timeline.interface';

@Entity('chat_timeline_posts')
@Index('idx_timeline_posts_author_time', ['authorId', 'publishedAt'])
@Index('idx_timeline_posts_visibility_time', ['visibility', 'publishedAt'])
@Index('idx_timeline_posts_status_time', ['status', 'publishedAt'])
@Index('idx_timeline_posts_distribution_time', ['distributionMode', 'publishedAt'])
export class TimelinePostEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: false, name: 'author_id' })
  authorId: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: TimelineVisibility.FRIENDS,
  })
  visibility: TimelineVisibility;

  @Column({ type: 'text', nullable: true })
  text?: string;

  @Column({ type: 'jsonb', nullable: true })
  media?: TimelineMediaItem[];

  @Column({ type: 'text', array: true, nullable: true, name: 'custom_audience_ids' })
  customAudienceIds?: string[];

  @Column({ type: 'jsonb', nullable: true })
  extra?: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    name: 'distribution_mode',
    default: TimelineDistributionMode.PUSH,
  })
  distributionMode: TimelineDistributionMode;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: TimelinePostStatus.ACTIVE,
  })
  status: TimelinePostStatus;

  @Column({ type: 'int', nullable: false, default: 0, name: 'like_count' })
  likeCount: number;

  @Column({ type: 'int', nullable: false, default: 0, name: 'comment_count' })
  commentCount: number;

  @Column({ type: 'int', nullable: false, default: 0, name: 'share_count' })
  shareCount: number;

  @Column({ type: 'timestamp', nullable: false, name: 'published_at' })
  publishedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;
}
