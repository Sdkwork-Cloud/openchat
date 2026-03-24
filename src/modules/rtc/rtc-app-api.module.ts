import { Module } from '@nestjs/common';
import { RtcModule } from './rtc.module';
import { RtcAppController } from './rtc-app.controller';

@Module({
  imports: [RtcModule],
  controllers: [RtcAppController],
})
export class RtcAppApiModule {}
