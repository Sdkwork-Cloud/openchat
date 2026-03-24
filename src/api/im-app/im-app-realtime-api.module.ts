import { Module } from '@nestjs/common';
import { RtcAppApiModule } from '../../modules/rtc/rtc-app-api.module';
import { WukongIMAppApiModule } from '../../modules/wukongim/wukongim-app-api.module';

@Module({
  imports: [RtcAppApiModule, WukongIMAppApiModule],
})
export class ImAppRealtimeApiModule {}
