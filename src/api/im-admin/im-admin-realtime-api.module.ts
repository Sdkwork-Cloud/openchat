import { Module } from '@nestjs/common';
import { RtcAdminApiModule } from '../../modules/rtc/rtc-admin-api.module';

@Module({
  imports: [RtcAdminApiModule],
})
export class ImAdminRealtimeApiModule {}
