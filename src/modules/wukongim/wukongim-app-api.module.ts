import { Module } from '@nestjs/common';
import { WukongIMModule } from './wukongim.module';
import { WukongIMAppController } from './wukongim-app.controller';

@Module({
  imports: [WukongIMModule],
  controllers: [WukongIMAppController],
})
export class WukongIMAppApiModule {}
