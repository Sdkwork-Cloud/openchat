/**
 * IoT 模块
 * 提供与IoT设备和开源小智的集成
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IoTService } from './iot.service';
import { IoTController } from './iot.controller';
import { XiaoZhiService } from './xiaozhi/xiaozhi.service';
import { XiaoZhiGateway } from './xiaozhi/xiaozhi.gateway';
import { XiaoZhiAudioService } from './xiaozhi/services/xiaozhi-audio.service';
import { XiaozhiOpusService } from './xiaozhi/services/xiaozhi-opus.service';
import { XiaozhiAudioProcessingService } from './xiaozhi/services/xiaozhi-audio-processing.service';
import { XiaoZhiCapabilityService } from './xiaozhi/services/xiaozhi-capability.service';
import { XiaoZhiConfigService } from './xiaozhi/services/xiaozhi-config.service';
import { XiaoZhiConnectionService } from './xiaozhi/services/xiaozhi-connection.service';
import { XiaoZhiFirmwareService } from './xiaozhi/services/xiaozhi-firmware.service';
import { XiaoZhiMessageService } from './xiaozhi/services/xiaozhi-message.service';
import { XiaoZhiPluginService } from './xiaozhi/services/xiaozhi-plugin.service';
import { XiaoZhiSecurityService } from './xiaozhi/services/xiaozhi-security.service';
import { XiaoZhiStateService } from './xiaozhi/services/xiaozhi-state.service';
import { AudioStreamConsumer } from './xiaozhi/consumers/audio-stream.consumer';
import { BaiduSTTService } from './xiaozhi/services/stt/baidu-stt.service';
import { BaiduTTSService } from './xiaozhi/services/tts/baidu-tts.service';
import { OpenAIChatService } from './xiaozhi/services/llm/openai-chat.service';
import { XiaozhiHealthService } from './xiaozhi/services/xiaozhi-health.service';
import { DeviceCacheService } from './services/device-cache.service';
import { DeviceEntity } from './entities/device.entity';
import { DeviceMessageEntity } from './entities/device-message.entity';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([DeviceEntity, DeviceMessageEntity]),
  ],
  providers: [
    IoTService,
    XiaoZhiService,
    XiaoZhiGateway,
    XiaoZhiAudioService,
    XiaozhiOpusService,
    XiaozhiAudioProcessingService,
    XiaoZhiCapabilityService,
    XiaoZhiConfigService,
    XiaoZhiConnectionService,
    XiaoZhiFirmwareService,
    XiaoZhiMessageService,
    XiaoZhiPluginService,
    XiaoZhiSecurityService,
    XiaoZhiStateService,
    AudioStreamConsumer,
    BaiduSTTService,
    BaiduTTSService,
    OpenAIChatService,
    XiaozhiHealthService,
    DeviceCacheService,
  ],
  controllers: [
    IoTController,
  ],
  exports: [
    IoTService,
    XiaoZhiService,
    DeviceCacheService,
  ],
})
export class IoTModule {}
