import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friend } from '../friend/friend.entity';
import { TimelineController } from './timeline.controller';
import { TimelineFeedItemEntity } from './entities/timeline-feed-item.entity';
import { TimelinePostLikeEntity } from './entities/timeline-post-like.entity';
import { TimelinePostEntity } from './entities/timeline-post.entity';
import { TimelineService } from './timeline.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimelinePostEntity,
      TimelineFeedItemEntity,
      TimelinePostLikeEntity,
      Friend,
    ]),
  ],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
