/**
 * RTC 模块
 * 提供实时音视频功能
 */

// 实体
export { RTCChannelEntity } from './rtc-channel.entity';
export { RTCRoom } from './rtc-room.entity';
export { RTCToken } from './rtc-token.entity';
export { RTCVideoRecord } from './rtc-video-record.entity';

// 接口
export { RTCManager } from './rtc.interface';
export {
  RTCChannelConfig,
  RTCChannelRoomInfo,
  RTCChannelToken,
  RTCChannel,
  RTCChannelFactory,
} from './channels/rtc-channel.interface';

// 基础类
export { RTCChannelBase } from './channels/rtc-channel.base';
export { RTCChannelFactoryImpl } from './channels/rtc-channel.base';

// 渠道实现
export { TencentRTCChannel } from './channels/tencent';
export { LiveKitRTCChannel } from './channels/livekit';
export { BytedanceRTCChannel } from './channels/bytedance';
export { AlibabaRTCChannel } from './channels/alibaba';

// 服务
export { RTCService } from './rtc.service';

// 控制器
export { RTCController } from './rtc.controller';

// 模块
export { RtcModule } from './rtc.module';
