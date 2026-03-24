/**
 * RTC module exports
 */

export { RTCChannelEntity } from './rtc-channel.entity';
export { RTCRoom } from './rtc-room.entity';
export { RTCToken } from './rtc-token.entity';
export { RTCVideoRecord } from './rtc-video-record.entity';
export { RTCCallSession } from './rtc-call-session.entity';
export { RTCCallParticipant } from './rtc-call-participant.entity';

export { RTCManager } from './rtc.interface';
export { RtcAiExtension } from './rtc-ai-extension.interface';
export {
  RTCChannelConfig,
  RTCChannelRoomInfo,
  RTCChannelToken,
  RTCChannel,
  RTCChannelFactory,
} from './channels/rtc-channel.interface';

export { RTCChannelBase, RTCChannelFactoryImpl } from './channels/rtc-channel.base';
export { TencentRTCChannel } from './channels/tencent';
export { LiveKitRTCChannel } from './channels/livekit';
export { VolcengineRTCChannel } from './channels/volcengine';
export { AlibabaRTCChannel } from './channels/alibaba';

export { RTCService } from './rtc.service';
export { RtcAppController } from './rtc-app.controller';
export { RtcAdminController } from './rtc-admin.controller';
export { RTCWebhookController } from './rtc-webhook.controller';

export { RtcModule } from './rtc.module';
export { RtcAppApiModule } from './rtc-app-api.module';
export { RtcAdminApiModule } from './rtc-admin-api.module';
export { RtcWebhookModule } from './rtc-webhook.module';

export {
  RTC_AI_EXTENSION,
  RTC_DEFAULT_PROVIDER,
  normalizeRtcProvider,
} from './rtc.constants';
