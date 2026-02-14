/**
 * IoT 模块
 * 提供物联网设备管理功能
 */

// 实体
export { DeviceEntity, DeviceType, DeviceStatus } from './entities/device.entity';
export { DeviceMessageEntity } from './entities/device-message.entity';

// 服务
export { IoTService } from './iot.service';
export { DeviceCacheService } from './services/device-cache.service';

// 小智服务
export { XiaoZhiService } from './xiaozhi/xiaozhi.service';
export { XiaoZhiGateway } from './xiaozhi/xiaozhi.gateway';
export { XiaoZhiAudioService } from './xiaozhi/services/xiaozhi-audio.service';
export { XiaoZhiStateService } from './xiaozhi/services/xiaozhi-state.service';
export { XiaoZhiConnectionService } from './xiaozhi/services/xiaozhi-connection.service';
export { XiaoZhiConfigService } from './xiaozhi/services/xiaozhi-config.service';
export { XiaoZhiSecurityService } from './xiaozhi/services/xiaozhi-security.service';
export { XiaoZhiPluginService } from './xiaozhi/services/xiaozhi-plugin.service';
export { XiaoZhiFirmwareService } from './xiaozhi/services/xiaozhi-firmware.service';
export { XiaozhiHealthService } from './xiaozhi/services/xiaozhi-health.service';
export { XiaoZhiMessageService } from './xiaozhi/services/xiaozhi-message.service';

// 控制器
export { IoTController } from './iot.controller';

// 模块
export { IoTModule } from './iot.module';
