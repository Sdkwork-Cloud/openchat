/**
 * RTC模块入口
 * 实时音视频通话功能
 */

// ==================== 类型导出 ====================
export * from './types';

// ==================== RTC管理器 ====================
export { RTCManager } from './rtc-manager';

// ==================== 信令模块 ====================
export { RTCSignaling } from './signaling';

// ==================== Provider导出 ====================
export { VolcengineRTCProvider } from './providers/volcengine-provider';

// ==================== Provider工厂 ====================
import { IRTCProvider, RTCProviderType, RTCError, RTCErrorCode } from './types';
import { VolcengineRTCProvider } from './providers/volcengine-provider';

/**
 * RTC Provider工厂
 * 用于创建不同的RTC Provider实例
 */
export class RTCProviderFactory {
  /**
   * 创建Provider实例
   */
  static create(type: RTCProviderType): IRTCProvider {
    switch (type) {
      case RTCProviderType.VOLCENGINE:
        return new VolcengineRTCProvider();

      // 可以扩展其他Provider
      // case RTCProviderType.AGORA:
      //   return new AgoraRTCProvider();

      // case RTCProviderType.TRTC:
      //   return new TRTCProvider();

      default:
        throw new RTCError(
          RTCErrorCode.INVALID_PARAM,
          `Unsupported RTC provider: ${type}`
        );
    }
  }

  /**
   * 获取支持的Provider类型列表
   */
  static getSupportedProviders(): RTCProviderType[] {
    return [
      RTCProviderType.VOLCENGINE,
      // RTCProviderType.AGORA,
      // RTCProviderType.TRTC,
    ];
  }

  /**
   * 检查Provider类型是否支持
   */
  static isSupported(type: RTCProviderType): boolean {
    return this.getSupportedProviders().includes(type);
  }
}

// ==================== 工具函数 ====================

/**
 * 检查浏览器是否支持WebRTC
 */
export function isWebRTCSupported(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.RTCPeerConnection &&
    window.navigator &&
    window.navigator.mediaDevices
  );
}

/**
 * 检查是否支持获取媒体设备
 */
export function isMediaDevicesSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * 获取可用的媒体设备列表
 */
export async function getMediaDevices(): Promise<{
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
}> {
  if (!isMediaDevicesSupported()) {
    throw new RTCError(
      RTCErrorCode.NOT_SUPPORTED,
      'MediaDevices API is not supported'
    );
  }

  try {
    // 请求权限
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    // 获取设备列表
    const devices = await navigator.mediaDevices.enumerateDevices();

    return {
      cameras: devices.filter((d) => d.kind === 'videoinput'),
      microphones: devices.filter((d) => d.kind === 'audioinput'),
      speakers: devices.filter((d) => d.kind === 'audiooutput'),
    };
  } catch (error) {
    throw new RTCError(
      RTCErrorCode.PERMISSION_DENIED,
      `Failed to get media devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    );
  }
}

/**
 * 生成房间ID
 */
export function generateRoomId(): string {
  return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成Token（简化版，实际应由服务器生成）
 */
export function generateToken(appId: string, appKey: string, roomId: string, uid: string): string {
  // 这里应该使用服务器端算法生成Token
  // 简化版仅用于演示
  const timestamp = Date.now();
  const data = `${appId}:${roomId}:${uid}:${timestamp}`;

  // 实际项目中应该使用HMAC-SHA256等算法
  // 这里仅返回一个占位符
  return `token_${Buffer.from(data).toString('base64')}`;
}
