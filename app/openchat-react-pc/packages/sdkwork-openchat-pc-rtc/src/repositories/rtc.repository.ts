/**
 * RTC Repository
 * 
 * 鑱岃矗锛?
 * 1. 澶勭悊 RTC 鐩稿叧鐨?API 璋冪敤
 * 2. 绠＄悊 WebRTC 杩炴帴
 * 3. 澶勭悊淇′护閫氫俊
 */

import type { 
  RTCRoom, 
  RTCToken, 
  CreateRoomRequest, 
  CreateRoomResponse,
  CallRecord 
} from '../entities/rtc.entity';
import { generateUUID } from '@sdkwork/openchat-pc-kernel';

// API 鍩虹璺緞
const API_BASE = '/api/rtc';

// 妯℃嫙妯″紡锛堢敤浜庢祴璇曪級
const MOCK_MODE = true;

// 鐗堟湰鏍囪鐢ㄤ簬寮哄埗鍒锋柊缂撳瓨 - 姣忔淇敼鍚庢洿鏂版鐗堟湰鍙?
const RTC_REPO_VERSION = '1.0.6';



/**
 * 鍒涘缓閫氳瘽鎴块棿
 */
export async function createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
  if (MOCK_MODE) {
    // 妯℃嫙鍒涘缓鎴块棿
    const roomId = generateUUID();
    const tokenId = generateUUID();
    
    const room: RTCRoom = {
      id: roomId,
      uuid: roomId,
      type: request.type,
      creatorId: 'current-user',
      participants: request.participants,
      status: 'active',
      startedAt: new Date().toISOString(),
    };
    
    const token: RTCToken = {
      id: tokenId,
      uuid: tokenId,
      roomId: roomId,
      userId: 'current-user',
      token: `mock-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    console.log('[RTC] Mock room created:', roomId);
    return { room, token };
  }

  const response = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create room');
  }
  
  return response.json();
}

/**
 * 鑾峰彇鎴块棿淇℃伅
 */
export async function getRoom(roomId: string): Promise<RTCRoom | null> {
  if (MOCK_MODE) {
    return {
      id: roomId,
      uuid: roomId,
      type: 'p2p',
      creatorId: 'current-user',
      participants: ['current-user', 'remote-user'],
      status: 'active',
      startedAt: new Date().toISOString(),
    };
  }

  const response = await fetch(`${API_BASE}/rooms/${roomId}`);
  
  if (!response.ok) {
    return null;
  }
  
  return response.json();
}

/**
 * 缁撴潫閫氳瘽鎴块棿
 */
export async function endRoom(roomId: string): Promise<boolean> {
  if (MOCK_MODE) {
    console.log('[RTC] Mock room ended:', roomId);
    return true;
  }

  const response = await fetch(`${API_BASE}/rooms/${roomId}/end`, {
    method: 'POST',
  });
  
  return response.ok;
}

/**
 * 鑾峰彇浠ょ墝
 */
export async function getToken(roomId: string): Promise<RTCToken> {
  if (MOCK_MODE) {
    const tokenId = generateUUID();
    return {
      id: tokenId,
      uuid: tokenId,
      roomId: roomId,
      userId: 'current-user',
      token: `mock-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  const response = await fetch(`${API_BASE}/rooms/${roomId}/token`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Failed to get token');
  }
  
  return response.json();
}

/**
 * 鑾峰彇閫氳瘽璁板綍
 */
export async function getCallRecords(): Promise<CallRecord[]> {
  if (MOCK_MODE) {
    return [
      {
        id: '1',
        callType: 'audio',
        direction: 'outgoing',
        remoteUserId: 'user1',
        remoteUserName: '寮犱笁',
        status: 'completed',
        duration: 120,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '2',
        callType: 'video',
        direction: 'incoming',
        remoteUserId: 'user2',
        remoteUserName: '鏉庡洓',
        status: 'missed',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
  }

  const response = await fetch(`${API_BASE}/records`);
  
  if (!response.ok) {
    return [];
  }
  
  return response.json();
}

/**
 * 妫€鏌ュ獟浣撹澶囨槸鍚﹀彲鐢?
 */
export async function checkMediaDevices(): Promise<{ video: boolean; audio: boolean }> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    
    return {
      video: videoDevices.length > 0,
      audio: audioDevices.length > 0,
    };
  } catch (error) {
    console.error('[RTC] Failed to enumerate devices:', error);
    return { video: false, audio: false };
  }
}

/**
 * 鑾峰彇鏈湴濯掍綋娴侊紙甯﹁澶囨娴嬪拰闄嶇骇澶勭悊锛?
 */
async function getLocalStreamWithFallback(
  video: boolean = true, 
  audio: boolean = true
): Promise<{ stream: MediaStream | null; hasVideo: boolean; hasAudio: boolean; error?: string }> {
  // 棣栧厛妫€鏌ヨ澶囧彲鐢ㄦ€?
  const deviceAvailability = await checkMediaDevices();
  
  // 璋冩暣璇锋眰鐨勮澶囩被鍨?
  const requestVideo = video && deviceAvailability.video;
  const requestAudio = audio && deviceAvailability.audio;
  
  // 濡傛灉娌℃湁鍙敤璁惧锛岃繑鍥炵┖娴?
  if (!requestVideo && !requestAudio) {
    return {
      stream: null,
      hasVideo: false,
      hasAudio: false,
      error: 'No camera or microphone device detected',
    };
  }

  try {
    // 灏濊瘯鑾峰彇璇锋眰鐨勫獟浣撴祦
    const constraints: MediaStreamConstraints = {
      video: requestVideo ? { width: 1280, height: 720 } : false,
      audio: requestAudio,
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    return {
      stream,
      hasVideo: requestVideo && stream.getVideoTracks().length > 0,
      hasAudio: requestAudio && stream.getAudioTracks().length > 0,
    };
  } catch (error) {
    // 闈欓粯澶勭悊閿欒锛屼笉鎵撳嵃鍒版帶鍒跺彴锛岄€氳繃杩斿洖鍊间紶閫掗敊璇俊鎭?
    
    // 濡傛灉鏄棰戠浉鍏抽敊璇紝灏濊瘯闄嶇骇鍒颁粎闊抽
    const isVideoError = error instanceof DOMException && 
      (error.name === 'NotFoundError' || error.name === 'NotReadableError' || error.name === 'OverconstrainedError');
    
    if (isVideoError && requestVideo) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        return {
          stream: audioStream,
          hasVideo: false,
          hasAudio: true,
        };
      } catch (audioError) {
        // 闊抽闄嶇骇涔熷け璐ワ紝缁х画杩斿洖閿欒
      }
    }
    
    // 杩斿洖閿欒鐘舵€?
    let errorMessage = '鏃犳硶璁块棶濯掍綋璁惧';
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          errorMessage = '鏈壘鍒版憚鍍忓ご鎴栭害鍏嬮璁惧';
          break;
        case 'NotAllowedError':
          errorMessage = '璇峰厑璁歌闂憚鍍忓ご鍜岄害鍏嬮鏉冮檺';
          break;
        case 'NotReadableError':
          errorMessage = '璁惧琚叾浠栧簲鐢ㄥ崰鐢ㄦ垨鏃犳硶鍚姩';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Requested resolution is not supported by the device';
          break;
      }
    }
    
    return { 
      stream: null, 
      hasVideo: false, 
      hasAudio: false,
      error: errorMessage
    };
  }
}

/**
 * WebRTC 杩炴帴绠＄悊绫?
 */
export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;
  private hasVideo: boolean = false;
  private hasAudio: boolean = false;

  constructor(
    config?: RTCConfiguration,
    callbacks?: {
      onIceCandidate?: (candidate: RTCIceCandidate) => void;
      onRemoteStream?: (stream: MediaStream) => void;
      onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    }
  ) {
    this.pc = new RTCPeerConnection(config || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    this.onIceCandidate = callbacks?.onIceCandidate || null;
    this.onRemoteStream = callbacks?.onRemoteStream || null;
    this.onConnectionStateChange = callbacks?.onConnectionStateChange || null;

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.pc) return;

    // ICE 鍊欓€?
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // 杩滅▼娴?
    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    // 杩炴帴鐘舵€佸彉鍖?
    this.pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange && this.pc) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };
  }

  /**
   * 鑾峰彇鏈湴濯掍綋娴侊紙甯﹁澶囨娴嬪拰闄嶇骇澶勭悊锛?
   * 
   * @param video 鏄惁闇€瑕佽棰?
   * @param audio 鏄惁闇€瑕侀煶棰?
   * @returns 鍖呭惈娴佸拰閿欒淇℃伅鐨勫璞?
   */
  async getLocalStream(
    video: boolean = true, 
    audio: boolean = true
  ): Promise<{ stream: MediaStream | null; error?: string }> {
    const result = await getLocalStreamWithFallback(video, audio);
    
    this.localStream = result.stream;
    this.hasVideo = result.hasVideo;
    this.hasAudio = result.hasAudio;
    
    return {
      stream: this.localStream,
      error: result.error,
    };
  }

  /**
   * 娣诲姞鏈湴娴佸埌杩炴帴
   */
  addLocalStream() {
    if (!this.pc || !this.localStream) return;

    this.localStream.getTracks().forEach((track) => {
      if (this.localStream && this.pc) {
        this.pc.addTrack(track, this.localStream);
      }
    });
  }

  /**
   * 鍒涘缓 Offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * 鍒涘缓 Answer
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * 璁剧疆杩滅▼鎻忚堪
   */
  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  }

  /**
   * 娣诲姞 ICE 鍊欓€?
   */
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * 鍒囨崲楹﹀厠椋?
   */
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  /**
   * 鍒囨崲鎽勫儚澶?
   */
  toggleCamera(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  /**
   * 鍏抽棴杩炴帴
   */
  close() {
    // 鍋滄鎵€鏈夎建閬?
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());

    // 鍏抽棴杩炴帴
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
  }

  /**
   * 鑾峰彇鏈湴娴?
   */
  getLocalStreamInstance(): MediaStream | null {
    return this.localStream;
  }

  /**
   * 鑾峰彇杩滅▼娴?
   */
  getRemoteStreamInstance(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * 鑾峰彇杩炴帴鐘舵€?
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState || null;
  }

  /**
   * 鏄惁鏈夎棰戣澶?
   */
  hasVideoDevice(): boolean {
    return this.hasVideo;
  }

  /**
   * 鏄惁鏈夐煶棰戣澶?
   */
  hasAudioDevice(): boolean {
    return this.hasAudio;
  }
}

