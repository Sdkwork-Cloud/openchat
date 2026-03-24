import { Module } from '@nestjs/common';
import { TimelineModule } from '../../modules/timeline/timeline.module';

@Module({
  imports: [TimelineModule],
})
export class ImAppSocialApiModule {}
