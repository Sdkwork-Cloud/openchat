import { Module } from '@nestjs/common';
import { RtcModule } from './rtc.module';
import { RtcAdminController } from './rtc-admin.controller';

@Module({
  imports: [RtcModule],
  controllers: [RtcAdminController],
})
export class RtcAdminApiModule {}
