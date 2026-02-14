import { Module, Global } from '@nestjs/common';
import { EntityFinder } from './utils/entity-finder.util';

@Global()
@Module({
  providers: [EntityFinder],
  exports: [EntityFinder],
})
export class CommonModule {}
