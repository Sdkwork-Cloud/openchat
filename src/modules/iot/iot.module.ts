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
import { XiaoZhiAudioService } from './xiaozhi/services/xiaozhi-audio.service';
import { XiaoZhiCapabilityService } from './xiaozhi/services/xiaozhi-capability.service';
import { XiaoZhiConfigService } from './xiaozhi/services/xiaozhi-config.service';
import { XiaoZhiConnectionService } from './xiaozhi/services/xiaozhi-connection.service';
import { XiaoZhiFirmwareService } from './xiaozhi/services/xiaozhi-firmware.service';
import { XiaoZhiMessageService } from './xiaozhi/services/xiaozhi-message.service';
import { XiaoZhiPluginService } from './xiaozhi/services/xiaozhi-plugin.service';
import { XiaoZhiSecurityService } from './xiaozhi/services/xiaozhi-security.service';
import { XiaoZhiStateService } from './xiaozhi/services/xiaozhi-state.service';
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
    XiaoZhiAudioService,
    XiaoZhiCapabilityService,
    XiaoZhiConfigService,
    XiaoZhiConnectionService,
    XiaoZhiFirmwareService,
    XiaoZhiMessageService,
    XiaoZhiPluginService,
    XiaoZhiSecurityService,
    XiaoZhiStateService,
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
