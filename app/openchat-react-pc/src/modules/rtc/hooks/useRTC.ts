/**
 * RTC Hook
 *
 * 职责：
 * 1. 管理通话状态
 * 2. 提供通话操作方法
 * 3. 处理本地/远程媒体流
 * 4. 监听通话事件
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CallSession, CallType, CallSignal } from '../entities/rtc.entity';
import { getRTCService } from '../services/rtc.service';

export interface UseRTCReturn {
  // 状态
  session: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isInCall: boolean;
  isCalling: boolean;
  isRinging: boolean;
  isConnected: boolean;

  // 操作方法
  initiateCall: (calleeId: string, calleeName: string, calleeAvatar: string, callType: CallType) => Promise<boolean>;
  acceptCall: () => Promise<boolean>;
  rejectCall: () => Promise<boolean>;
  hangup: () => Promise<boolean>;
  toggleMute: () => boolean;
  toggleCamera: () => boolean;
  toggleSpeaker: () => boolean;

  // 处理来电
  handleIncomingCall: (
    callId: string,
    callerId: string,
    callerName: string,
    callerAvatar: string,
    roomId: string,
    callType: CallType
  ) => void;

  // 处理信令
  handleSignal: (signal: CallSignal) => void;
}

/**
 * RTC Hook
 */
export function useRTC(): UseRTCReturn {
  const [session, setSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const serviceRef = useRef(getRTCService({
    onSessionChange: (newSession: CallSession | null) => {
      setSession(newSession);
    },
    onLocalStream: (stream: MediaStream) => {
      setLocalStream(stream);
    },
    onRemoteStream: (stream: MediaStream) => {
      setRemoteStream(stream);
    },
  }));

  // 计算状态
  const isInCall = session !== null && session.status !== 'ended' && session.status !== 'failed';
  const isCalling = session?.status === 'calling';
  const isRinging = session?.status === 'ringing';
  const isConnected = session?.status === 'connected';

  // 发起通话
  const initiateCall = useCallback(async (
    calleeId: string,
    calleeName: string,
    calleeAvatar: string,
    callType: CallType
  ): Promise<boolean> => {
    return serviceRef.current.initiateCall(calleeId, calleeName, calleeAvatar, callType);
  }, []);

  // 接听通话
  const acceptCall = useCallback(async (): Promise<boolean> => {
    if (!session?.roomId) return false;
    return serviceRef.current.acceptCall(session.id, session.roomId, session.callType);
  }, [session]);

  // 拒绝通话
  const rejectCall = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    const result = await serviceRef.current.rejectCall(session.id);
    if (result) {
      setLocalStream(null);
      setRemoteStream(null);
    }
    return result;
  }, [session]);

  // 挂断通话
  const hangup = useCallback(async (): Promise<boolean> => {
    const result = await serviceRef.current.hangup();
    if (result) {
      setLocalStream(null);
      setRemoteStream(null);
    }
    return result;
  }, []);

  // 切换麦克风
  const toggleMute = useCallback((): boolean => {
    return serviceRef.current.toggleMute();
  }, []);

  // 切换摄像头
  const toggleCamera = useCallback((): boolean => {
    return serviceRef.current.toggleCamera();
  }, []);

  // 切换扬声器
  const toggleSpeaker = useCallback((): boolean => {
    return serviceRef.current.toggleSpeaker();
  }, []);

  // 处理来电
  const handleIncomingCall = useCallback((
    callId: string,
    callerId: string,
    callerName: string,
    callerAvatar: string,
    roomId: string,
    callType: CallType
  ) => {
    serviceRef.current.handleIncomingCall(callId, callerId, callerName, callerAvatar, roomId, callType);
  }, []);

  // 处理信令
  const handleSignal = useCallback((signal: CallSignal) => {
    serviceRef.current.handleSignal(signal);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      // 组件卸载时挂断通话
      if (session && session.status !== 'ended' && session.status !== 'failed') {
        serviceRef.current.hangup();
      }
    };
  }, [session]);

  return {
    session,
    localStream,
    remoteStream,
    isInCall,
    isCalling,
    isRinging,
    isConnected,
    initiateCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    handleIncomingCall,
    handleSignal,
  };
}
