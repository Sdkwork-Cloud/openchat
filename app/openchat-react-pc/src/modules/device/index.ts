/**
 * 设备管理模块入口
 *
 * 职责：
 * 1. 导出模块公共 API
 * 2. 导出页面组件
 * 3. 导出类型定义
 * 4. 导出设备服务
 */

// 页面
export { default as DeviceListPage } from './pages/DeviceListPage';
export { default as DeviceDetailPage } from './pages/DeviceDetailPage';

// 实体类型
export {
  DeviceType,
  DeviceStatus,
  DeviceMessageType,
  DeviceMessageDirection
} from './entities/device.entity';

export type {
  Device,
  DeviceMessage,
  DeviceCommand,
  DeviceFilter
} from './entities/device.entity';

// 服务
export { DeviceService, deviceService } from './services/device.service';
