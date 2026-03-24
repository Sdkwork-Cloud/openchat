import { Module } from '@nestjs/common';
import { RtcModule } from './rtc.module';
import { RTCWebhookController } from './rtc-webhook.controller';

@Module({
  imports: [RtcModule],
  controllers: [RTCWebhookController],
})
export class RtcWebhookModule {}
