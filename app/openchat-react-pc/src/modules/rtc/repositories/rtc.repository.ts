/**
 * RTC Repository
 * 
 * 职责：
 * 1. 处理 RTC 相关的 API 调用
 * 2. 管理 WebRTC 连接
 * 3. 处理信令通信
 */

import type { 
  RTCRoom, 
  RTCToken, 
  CreateRoomRequest, 
  CreateRoomResponse,
  CallRecord 
} from '../entities/rtc.entity';
import { generateUUID } from '@/utils/uuid';

// API 基础路径
const API_BASE = '/api/rtc';

// 模拟模式（用于测试）
const MOCK_MODE = true;

// 版本标记用于强制刷新缓存 - 每次修改后更新此版本号
const RTC_REPO_VERSION = '1.0.6';



/**
 * 创建通话房间
 */
export async function createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
  if (MOCK_MODE) {
    // 模拟创建房间
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
 * 获取房间信息
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
 * 结束通话房间
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
 * 获取令牌
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
 * 获取通话记录
 */
export async function getCallRecords(): Promise<CallRecord[]> {
  if (MOCK_MODE) {
    return [
      {
        id: '1',
        callType: 'audio',
        direction: 'outgoing',
        remoteUserId: 'user1',
        remoteUserName: '张三',
        status: 'completed',
        duration: 120,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '2',
        callType: 'video',
        direction: 'incoming',
        remoteUserId: 'user2',
        remoteUserName: '李四',
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
 * 检查媒体设备是否可用
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
 * 获取本地媒体流（带设备检测和降级处理）
 */
async function getLocalStreamWithFallback(
  video: boolean = true, 
  audio: boolean = true
): Promise<{ stream: MediaStream | null; hasVideo: boolean; hasAudio: boolean; error?: string }> {
  // 首先检查设备可用性
  const deviceAvailability = await checkMediaDevices();
  
  // 调整请求的设备类型
  const requestVideo = video && deviceAvailability.video;
  const requestAudio = audio && deviceAvailability.audio;
  
  // 如果没有可用设备，返回空流
  if (!requestVideo && !requestAudio) {
    return {
      stream: null,
      hasVideo: false,
      hasAudio: false,
      error: '未检测到摄像头或麦克风设备'
    };
  }

  try {
    // 尝试获取请求的媒体流
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
    // 静默处理错误，不打印到控制台，通过返回值传递错误信息
    
    // 如果是视频相关错误，尝试降级到仅音频
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
        // 音频降级也失败，继续返回错误
      }
    }
    
    // 返回错误状态
    let errorMessage = '无法访问媒体设备';
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotFoundError':
          errorMessage = '未找到摄像头或麦克风设备';
          break;
        case 'NotAllowedError':
          errorMessage = '请允许访问摄像头和麦克风权限';
          break;
        case 'NotReadableError':
          errorMessage = '设备被其他应用占用或无法启动';
          break;
        case 'OverconstrainedError':
          errorMessage = '设备不支持请求的分辨率';
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
 * WebRTC 连接管理类
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

    // ICE 候选
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // 远程流
    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    // 连接状态变化
    this.pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange && this.pc) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };
  }

  /**
   * 获取本地媒体流（带设备检测和降级处理）
   * 
   * @param video 是否需要视频
   * @param audio 是否需要音频
   * @returns 包含流和错误信息的对象
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
   * 添加本地流到连接
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
   * 创建 Offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * 创建 Answer
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * 设置远程描述
   */
  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  }

  /**
   * 添加 ICE 候选
   */
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) throw new Error('PeerConnection not initialized');

    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * 切换麦克风
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
   * 切换摄像头
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
   * 关闭连接
   */
  close() {
    // 停止所有轨道
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());

    // 关闭连接
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
  }

  /**
   * 获取本地流
   */
  getLocalStreamInstance(): MediaStream | null {
    return this.localStream;
  }

  /**
   * 获取远程流
   */
  getRemoteStreamInstance(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.pc?.connectionState || null;
  }

  /**
   * 是否有视频设备
   */
  hasVideoDevice(): boolean {
    return this.hasVideo;
  }

  /**
   * 是否有音频设备
   */
  hasAudioDevice(): boolean {
    return this.hasAudio;
  }
}
