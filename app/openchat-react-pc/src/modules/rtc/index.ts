/**
 * RTC 模块入口
 *
 * 导出：
 * 1. 实体类型
 * 2. Hooks
 * 3. 组件
 * 4. Service
 */

// 实体
export type {
  CallType,
  CallStatus,
  CallDirection,
  RTCRoom,
  RTCToken,
  CallSession,
  CreateRoomRequest,
  CreateRoomResponse,
  CallSignal,
  InitiateCallRequest,
  CallRecord,
} from './entities/rtc.entity';

// Hooks
export { useRTC, type UseRTCReturn } from './hooks/useRTC';

// 组件
export { CallModal } from './components/CallModal';

// Service
export { RTCService, getRTCService, destroyRTCService } from './services/rtc.service';

// Repository
export {
  createRoom,
  getRoom,
  endRoom,
  getToken,
  getCallRecords,
  WebRTCConnection,
} from './repositories/rtc.repository';
