/**
 * RTC Service
 *
 * 鑱岃矗锛?
 * 1. 灏佽 RTC 涓氬姟閫昏緫
 * 2. 绠＄悊閫氳瘽鐢熷懡鍛ㄦ湡
 * 3. 澶勭悊淇′护閫氫俊
 * 4. 鍗忚皟 Repository 鍜?UI 鐘舵€?
 */

import type {
  CallSession,
  CallType,
  CallSignal,
} from '../entities/rtc.entity';
import {
  createRoom,
  endRoom,
  getToken,
} from '../repositories/rtc.repository';
import { generateUUID } from '@sdkwork/openchat-pc-kernel';
import {
  createRTCSDK,
  RTCConfig,
  DEFAULT_RTC_CONFIG,
  DeviceType,
  DeviceInfo,
} from './sdk-adapter';

// 褰撳墠鐢ㄦ埛 ID锛堝簲璇ヤ粠鐢ㄦ埛鏈嶅姟鑾峰彇锛?
const CURRENT_USER_ID = 'current-user';

// 妯℃嫙淇′护鏈嶅姟鍣紙鐢ㄤ簬娴嬭瘯锛?
const MOCK_SIGNALING = true;

// 鐗堟湰鏍囪鐢ㄤ簬寮哄埗鍒锋柊缂撳瓨 - 姣忔淇敼鍚庢洿鏂版鐗堟湰鍙?
const RTC_SERVICE_VERSION = '1.0.9';



/**
 * RTC Service 绫?
 */
export class RTCService {
  private session: CallSession | null = null;
  private rtcSdk: any = null;
  private rtcConfig: RTCConfig = DEFAULT_RTC_CONFIG;
  private onSessionChange: ((session: CallSession | null) => void) | null = null;
  private onLocalStream: ((stream: MediaStream) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private signalHandler: ((signal: CallSignal) => void) | null = null;

  constructor(callbacks?: {
    onSessionChange?: (session: CallSession | null) => void;
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onSignal?: (signal: CallSignal) => void;
  }, config?: RTCConfig) {
    this.onSessionChange = callbacks?.onSessionChange || null;
    this.onLocalStream = callbacks?.onLocalStream || null;
    this.onRemoteStream = callbacks?.onRemoteStream || null;
    this.signalHandler = callbacks?.onSignal || null;
    this.rtcConfig = config || DEFAULT_RTC_CONFIG;
    this.initRTCSDK();
  }

  /**
   * 鍒濆鍖?RTC SDK
   */
  private async initRTCSDK() {
    try {
      this.rtcSdk = createRTCSDK(this.rtcConfig);
      await this.rtcSdk.init(this.rtcConfig);
      
      // 娉ㄥ唽浜嬩欢鐩戝惉
      this.rtcSdk.on('stream-added', (event: any) => {
        console.log('[RTC] Stream added:', event);
      });
      
      this.rtcSdk.on('stream-updated', (event: any) => {
        console.log('[RTC] Stream updated:', event);
      });
      
      this.rtcSdk.on('stream-removed', (event: any) => {
        console.log('[RTC] Stream removed:', event);
      });
      
      this.rtcSdk.on('room-state-changed', (event: any) => {
        console.log('[RTC] Room state changed:', event);
      });
    } catch (error) {
      console.error('[RTC] Failed to initialize RTC SDK:', error);
    }
  }

  /**
   * 鍙戣捣閫氳瘽
   */
  async initiateCall(
    calleeId: string,
    calleeName: string,
    calleeAvatar: string,
    callType: CallType
  ): Promise<boolean> {
    try {
      console.log('[RTC] Initiating call to:', calleeId, 'type:', callType);

      // 鍒涘缓閫氳瘽浼氳瘽
      const session: CallSession = {
        id: this.generateCallId(),
        callType,
        status: 'calling',
        direction: 'outgoing',
        localUserId: CURRENT_USER_ID,
        remoteUserId: calleeId,
        remoteUserName: calleeName,
        remoteUserAvatar: calleeAvatar,
        startTime: new Date().toISOString(),
        isMuted: false,
        isCameraOff: false,
        isSpeakerOff: false,
      };

      this.session = session;
      this.notifySessionChange();

      // 鍒涘缓鎴块棿
      console.log('[RTC] Creating room...');
      const { room, token } = await createRoom({
        type: 'p2p',
        participants: [CURRENT_USER_ID, calleeId],
      });
      console.log('[RTC] Room created:', room.id);

      this.session.roomId = room.id;
      this.session.status = 'ringing';
      this.notifySessionChange();

      // 鍒濆鍖?RTC SDK 杩炴帴锛堥敊璇笉褰卞搷閫氳瘽娴佺▼锛?
      try {
        await this.initRTCConnection(callType, room.id, token.token);
      } catch (rtcError) {
        // RTC 鍒濆鍖栧け璐ワ紙濡傛棤璁惧锛夛紝浣嗙户缁€氳瘽娴佺▼
        console.error('[RTC] Failed to initialize RTC connection:', rtcError);
      }

      // 鍙戦€佸懠鍙俊浠わ紙閫氳繃 IM 鎴栧叾浠栨柟寮忥級
      this.sendSignal({
        type: 'call',
        callId: session.id,
        from: CURRENT_USER_ID,
        to: calleeId,
        payload: {
          roomId: room.id,
          token: token.token,
          callType,
        },
        timestamp: new Date().toISOString(),
      });

      // 妯℃嫙锛?绉掑悗鑷姩鎺ュ惉锛堟祴璇曠敤锛?
      if (MOCK_SIGNALING) {
        setTimeout(() => {
          console.log('[RTC] Mock: Auto accepting call after 3s');
          this.simulateAcceptCall();
        }, 3000);
      }

      return true;
    } catch (error) {
      console.error('[RTC] Failed to initiate call:', error);
      if (this.session) {
        this.session = {
          ...this.session,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        this.notifySessionChange();
      }
      return false;
    }
  }

  /**
   * 鎺ュ惉閫氳瘽
   */
  async acceptCall(callId: string, roomId: string, callType: CallType): Promise<boolean> {
    try {
      console.log('[RTC] Accepting call:', callId);

      if (!this.session || this.session.id !== callId) {
        throw new Error('Call session not found');
      }

      // 鏇存柊鐘舵€?
      this.session.status = 'connecting';
      this.session.connectTime = new Date().toISOString();
      this.notifySessionChange();

      // 鑾峰彇浠ょ墝
      const tokenResult = await getToken(roomId);

      // 鍒濆鍖?RTC 杩炴帴
      await this.initRTCConnection(callType, roomId, tokenResult.token);

      // 鍙戦€佹帴鍙椾俊浠?
      this.sendSignal({
        type: 'accept',
        callId,
        from: CURRENT_USER_ID,
        to: this.session.remoteUserId || '',
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('[RTC] Failed to accept call:', error);
      if (this.session) {
        this.session.status = 'failed';
        this.session.error = error instanceof Error ? error.message : 'Unknown error';
        this.notifySessionChange();
      }
      return false;
    }
  }

  /**
   * 鎷掔粷閫氳瘽
   */
  async rejectCall(callId: string): Promise<boolean> {
    if (!this.session || this.session.id !== callId) {
      return false;
    }

    console.log('[RTC] Rejecting call:', callId);

    // 鍙戦€佹嫆缁濅俊浠?
    this.sendSignal({
      type: 'reject',
      callId,
      from: CURRENT_USER_ID,
      to: this.session.remoteUserId || '',
      timestamp: new Date().toISOString(),
    });

    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    try {
      await this.cleanup();
    } catch (error) {
      console.error('[RTC] Error during cleanup:', error);
    }
    return true;
  }

  /**
   * 鎸傛柇閫氳瘽
   */
  async hangup(): Promise<boolean> {
    if (!this.session) {
      return false;
    }

    console.log('[RTC] Hanging up call:', this.session.id);

    const { roomId, remoteUserId } = this.session;

    // 鍙戦€佹寕鏂俊浠?
    if (remoteUserId) {
      this.sendSignal({
        type: 'hangup',
        callId: this.session.id,
        from: CURRENT_USER_ID,
        to: remoteUserId,
        timestamp: new Date().toISOString(),
      });
    }

    // 缁撴潫鎴块棿
    if (roomId) {
      try {
        await endRoom(roomId);
        console.log('[RTC] Ended room:', roomId);
      } catch (error) {
        console.error('[RTC] Error ending room:', error);
      }
    }

    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
    return true;
  }

  /**
   * 澶勭悊鏉ョ數
   */
  handleIncomingCall(
    callId: string,
    callerId: string,
    callerName: string,
    callerAvatar: string,
    roomId: string,
    callType: CallType
  ) {
    console.log('[RTC] Incoming call from:', callerId);

    const session: CallSession = {
      id: callId,
      roomId,
      callType,
      status: 'ringing',
      direction: 'incoming',
      localUserId: CURRENT_USER_ID,
      remoteUserId: callerId,
      remoteUserName: callerName,
      remoteUserAvatar: callerAvatar,
      startTime: new Date().toISOString(),
      isMuted: false,
      isCameraOff: false,
      isSpeakerOff: false,
    };

    this.session = session;
    this.notifySessionChange();
  }

  /**
   * 澶勭悊淇′护
   */
  async handleSignal(signal: CallSignal) {
    console.log('[RTC] Received signal:', signal.type);

    if (!this.session || this.session.id !== signal.callId) {
      return;
    }

    try {
      switch (signal.type) {
        case 'accept':
          await this.handleAccept();
          break;
        case 'reject':
          await this.handleReject();
          break;
        case 'hangup':
          await this.handleHangup();
          break;
        case 'offer':
          // 淇′护澶勭悊鐜板湪鐢?RTC SDK 鎶借薄灞傜鐞?
          console.log('[RTC] Received offer signal, handled by SDK');
          break;
        case 'answer':
          // 淇′护澶勭悊鐜板湪鐢?RTC SDK 鎶借薄灞傜鐞?
          console.log('[RTC] Received answer signal, handled by SDK');
          break;
        case 'ice-candidate':
          // 淇′护澶勭悊鐜板湪鐢?RTC SDK 鎶借薄灞傜鐞?
          console.log('[RTC] Received ice-candidate signal, handled by SDK');
          break;
      }
    } catch (error) {
      console.error('[RTC] Error handling signal:', error);
    }
  }

  /**
   * 鍒囨崲楹﹀厠椋?
   */
  async toggleMute(): Promise<boolean> {
    try {
      if (this.session) {
        const newMuteState = !this.session.isMuted;
        await this.rtcSdk.setLocalStreamEnabled(!newMuteState, !this.session.isCameraOff);
        this.session.isMuted = newMuteState;
        this.notifySessionChange();
      }
      return this.session?.isMuted || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle mute:', error);
      return this.session?.isMuted || false;
    }
  }

  /**
   * 鍒囨崲鎽勫儚澶?
   */
  async toggleCamera(): Promise<boolean> {
    try {
      if (this.session) {
        const newCameraState = !this.session.isCameraOff;
        await this.rtcSdk.setLocalStreamEnabled(!this.session.isMuted, !newCameraState);
        this.session.isCameraOff = newCameraState;
        this.notifySessionChange();
      }
      return this.session?.isCameraOff || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle camera:', error);
      return this.session?.isCameraOff || false;
    }
  }

  /**
   * 鍒囨崲鎵０鍣?
   */
  async toggleSpeaker(): Promise<boolean> {
    try {
      if (this.session) {
        this.session.isSpeakerOff = !this.session.isSpeakerOff;
        this.notifySessionChange();
      }
      return this.session?.isSpeakerOff || false;
    } catch (error) {
      console.error('[RTC] Failed to toggle speaker:', error);
      return this.session?.isSpeakerOff || false;
    }
  }

  /**
   * 鑾峰彇褰撳墠浼氳瘽
   */
  getSession(): CallSession | null {
    return this.session;
  }

  /**
   * 鍒濆鍖?RTC 杩炴帴
   */
  private async initRTCConnection(callType: CallType, roomId: string, token: string) {
    if (!this.rtcSdk) {
      throw new Error('RTC SDK not initialized');
    }

    try {
      // 鍔犲叆鎴块棿
      await this.rtcSdk.joinRoom(roomId, CURRENT_USER_ID, token, callType);
      console.log('[RTC] Joined room:', roomId);

      // 鑾峰彇鏈湴濯掍綋娴?
      console.log('[RTC] Getting local stream...');
      const localStream = await this.rtcSdk.getLocalStream({
        video: callType === 'video',
        audio: true
      });
      
      if (localStream) {
        console.log('[RTC] Local stream obtained');
        this.onLocalStream?.(localStream);

        // 鍙戝竷鏈湴娴?
        await this.rtcSdk.publishStream(localStream);
        console.log('[RTC] Local stream published');

        // 璁㈤槄杩滅▼娴?
        if (this.session?.remoteUserId) {
          await this.rtcSdk.subscribeStream(this.session.remoteUserId);
          console.log('[RTC] Subscribed to remote stream');
        }
      } else {
        // 鍦ㄦā鎷熸ā寮忎笅锛屽嵆浣挎病鏈夎澶囦篃缁х画閫氳瘽娴佺▼
        if (MOCK_SIGNALING) {
          // 鏇存柊浼氳瘽鐘舵€侊紝鏍囪娌℃湁濯掍綋璁惧
          if (this.session) {
            this.session.isCameraOff = true;
            this.session.isMuted = true;
            // 娣诲姞閿欒淇℃伅鎻愮ず鐢ㄦ埛
            this.session.error = 'No camera or microphone device detected';
            this.notifySessionChange();
          }
        }
      }
    } catch (error) {
      console.error('[RTC] Failed to initialize RTC connection:', error);
      throw error;
    }
  }

  /**
   * 妯℃嫙鎺ュ惉閫氳瘽锛堟祴璇曠敤锛?
   */
  private async simulateAcceptCall() {
    if (!this.session) return;

    console.log('[RTC] Simulating accept call');

    // 鏇存柊鐘舵€?
    this.session.status = 'connecting';
    this.session.connectTime = new Date().toISOString();
    this.notifySessionChange();

    // 妯℃嫙锛?绉掑悗杩炴帴鎴愬姛
    setTimeout(() => {
      if (this.session) {
        this.session.status = 'connected';
        this.notifySessionChange();
        console.log('[RTC] Call connected (simulated)');
      }
    }, 1000);
  }

  /**
   * 澶勭悊鎺ュ彈
   */
  private async handleAccept() {
    if (!this.session) return;

    console.log('[RTC] Call accepted');
    this.session.status = 'connecting';
    this.session.connectTime = new Date().toISOString();
    this.notifySessionChange();
  }

  /**
   * 澶勭悊鎷掔粷
   */
  private async handleReject() {
    if (!this.session) return;

    console.log('[RTC] Call rejected');
    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
  }

  /**
   * 澶勭悊鎸傛柇
   */
  private async handleHangup() {
    if (!this.session) return;

    console.log('[RTC] Call hung up by remote');
    this.session.status = 'ended';
    this.session.endTime = new Date().toISOString();
    this.notifySessionChange();

    await this.cleanup();
  }

  /**
   * 璁惧绠＄悊鏂规硶
   */
  async getDevices(deviceType: DeviceType): Promise<DeviceInfo[]> {
    try {
      if (!this.rtcSdk) {
        throw new Error('RTC SDK not initialized');
      }
      return await this.rtcSdk.getDevices(deviceType);
    } catch (error) {
      console.error('[RTC] Failed to get devices:', error);
      return [];
    }
  }

  async switchDevice(deviceType: DeviceType, deviceId: string): Promise<boolean> {
    try {
      if (!this.rtcSdk) {
        throw new Error('RTC SDK not initialized');
      }
      await this.rtcSdk.switchDevice(deviceType, deviceId);
      return true;
    } catch (error) {
      console.error('[RTC] Failed to switch device:', error);
      return false;
    }
  }

  /**
   * 鍙戦€佷俊浠?
   */
  private sendSignal(signal: CallSignal) {
    console.log('[RTC] Sending signal:', signal.type, 'to:', signal.to);

    // 杩欓噷搴旇閫氳繃 IM 鏈嶅姟鍙戦€佷俊浠?
    // 鏆傛椂鐩存帴璋冪敤鍥炶皟
    this.signalHandler?.(signal);

    // 妯℃嫙锛氬鏋滄槸 call 淇′护锛屾ā鎷熷鏂规敹鍒?
    if (MOCK_SIGNALING && signal.type === 'call') {
      console.log('[RTC] Mock: Simulating remote user receiving call');
    }
  }

  /**
   * 閫氱煡浼氳瘽鍙樺寲
   */
  private notifySessionChange() {
    if (this.session) {
      this.onSessionChange?.({ ...this.session });
    }
  }

  /**
   * 鐢熸垚閫氳瘽 ID
   */
  private generateCallId(): string {
    return generateUUID();
  }

  /**
   * 娓呯悊璧勬簮
   */
  private async cleanup() {
    console.log('[RTC] Cleaning up resources');
    
    try {
      if (this.rtcSdk && this.session?.roomId) {
        await this.rtcSdk.leaveRoom(this.session.roomId);
        console.log('[RTC] Left room:', this.session.roomId);
      }
    } catch (error) {
      console.error('[RTC] Error during cleanup:', error);
    } finally {
      this.rtcSdk = null;
      this.session = null;
      this.onSessionChange?.(null);
    }
  }
}

// 鍗曚緥瀹炰緥
let rtcServiceInstance: RTCService | null = null;

/**
 * RTC Service 鏋勯€犲嚱鏁板弬鏁扮被鍨?
 */
interface RTCServiceCallbacks {
  onSessionChange?: (session: CallSession | null) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onSignal?: (signal: CallSignal) => void;
}

/**
 * 鑾峰彇 RTC Service 瀹炰緥
 */
export function getRTCService(callbacks?: RTCServiceCallbacks): RTCService {
  if (!rtcServiceInstance) {
    rtcServiceInstance = new RTCService(callbacks);
  }
  return rtcServiceInstance;
}

/**
 * 閿€姣?RTC Service 瀹炰緥
 */
export function destroyRTCService() {
  rtcServiceInstance = null;
}

