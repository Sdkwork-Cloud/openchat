/**
 * 通话弹窗组件
 *
 * 职责：
 * 1. 显示拨号中/来电中/通话中界面
 * 2. 提供接听、挂断、静音等操作按钮
 * 3. 显示本地和远程视频流
 * 4. 无设备时显示提示并倒计时自动结束
 */

import { memo, useEffect, useRef, useState } from 'react';
import type { CallSession } from '../entities/rtc.entity';

interface CallModalProps {
  session: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
}

// 无设备时自动结束通话的倒计时（秒）
const AUTO_END_COUNTDOWN = 30;

/**
 * 通话弹窗
 */
export const CallModal = memo(({
  session,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onHangup,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
}: CallModalProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [countdown, setCountdown] = useState(AUTO_END_COUNTDOWN);

  // 绑定本地视频流
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // 绑定远程视频流
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 无设备时倒计时自动结束通话
  useEffect(() => {
    if (!session) return;
    
    // 只有在有错误且无媒体流时才开始倒计时
    const hasNoMedia = !localStream && !remoteStream;
    const hasError = !!session.error;
    const isActive = session.status === 'calling' || session.status === 'ringing' || session.status === 'connecting';
    
    if (hasNoMedia && hasError && isActive) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onHangup();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      // 重置倒计时
      setCountdown(AUTO_END_COUNTDOWN);
    }
  }, [session, localStream, remoteStream, onHangup]);

  // 如果没有会话，不显示
  if (!session) return null;

  const isIncoming = session.direction === 'incoming';
  const isRinging = session.status === 'ringing';
  const isCalling = session.status === 'calling';
  const isConnecting = session.status === 'connecting';
  const isConnected = session.status === 'connected';
  const isVideo = session.callType === 'video';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[80vh] bg-[#1E293B] rounded-2xl overflow-hidden shadow-2xl">
        {/* 视频区域 */}
        {isVideo && (
          <div className="absolute inset-0">
            {/* 远程视频（大）或占位 */}
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#0F172A] flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] flex items-center justify-center text-white font-semibold text-3xl mb-4 shadow-lg">
                  {session.remoteUserAvatar || session.remoteUserName?.[0] || '?'}
                </div>
                <p className="text-white/50 text-sm">
                  {isIncoming ? '邀请你视频通话...' : '等待对方开启摄像头...'}
                </p>
                
                {/* 设备错误提示（视频通话时） */}
                {session.error && (
                  <div className="mt-4 px-4 py-3 bg-[#EF4444]/20 border border-[#EF4444]/30 rounded-lg max-w-sm">
                    <p className="text-[#EF4444] text-sm flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {session.error}
                    </p>
                    <p className="text-[#94A3B8] text-xs mt-2 text-center">
                      {countdown > 0 ? `${countdown}秒后自动结束通话` : '正在结束通话...'}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* 本地视频（小窗口） */}
            <div className="absolute top-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#1E293B] flex flex-col items-center justify-center">
                  <svg className="w-8 h-8 text-white/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-white/50 text-xs">摄像头未启用</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 音频通话背景 */}
        {!isVideo && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1E293B] to-[#0F172A] flex flex-col items-center justify-center">
            {/* 头像 */}
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] flex items-center justify-center text-white font-semibold text-4xl mb-6 shadow-lg shadow-[#0EA5E9]/20">
              {session.remoteUserAvatar || session.remoteUserName?.[0] || '?'}
            </div>
            
            {/* 姓名 */}
            <h2 className="text-2xl font-semibold text-white mb-2">
              {session.remoteUserName || '未知用户'}
            </h2>
            
            {/* 状态文字 */}
            <p className="text-[#94A3B8] text-lg">
              {getStatusText(session.status, isIncoming)}
            </p>

            {/* 设备错误提示 */}
            {session.error && (
              <div className="mt-4 px-4 py-3 bg-[#EF4444]/20 border border-[#EF4444]/30 rounded-lg">
                <p className="text-[#EF4444] text-sm flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {session.error}
                </p>
                <p className="text-[#94A3B8] text-xs mt-2 text-center">
                  {countdown > 0 ? `${countdown}秒后自动结束通话` : '正在结束通话...'}
                </p>
              </div>
            )}

            {/* 通话时长 */}
            {isConnected && <CallDuration startTime={session.connectTime} />}
          </div>
        )}

        {/* 视频通话时的信息覆盖层 */}
        {isVideo && (isConnected || isConnecting || isRinging || isCalling) && (
          <div className="absolute top-4 left-4">
            <h2 className="text-white font-semibold text-lg drop-shadow-md">
              {session.remoteUserName}
            </h2>
            {isConnected ? (
              <CallDuration startTime={session.connectTime} className="text-white/80" />
            ) : (
              <p className="text-white/60 text-sm">{getStatusText(session.status, isIncoming)}</p>
            )}
          </div>
        )}

        {/* 底部控制栏 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center space-x-6">
            {/* 来电响铃中 - 接听/拒绝按钮 */}
            {isRinging && isIncoming && (
              <>
                <button
                  onClick={onReject}
                  className="w-16 h-16 rounded-full bg-[#EF4444] hover:bg-[#DC2626] flex items-center justify-center transition-transform hover:scale-110"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={onAccept}
                  className="w-16 h-16 rounded-full bg-[#10B981] hover:bg-[#059669] flex items-center justify-center transition-transform hover:scale-110"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
              </>
            )}

            {/* 去电拨号中/响铃中 - 只显示挂断按钮 */}
            {(isCalling || (isRinging && !isIncoming)) && (
              <button
                onClick={onHangup}
                className="w-16 h-16 rounded-full bg-[#EF4444] hover:bg-[#DC2626] flex items-center justify-center transition-transform hover:scale-110"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
            )}

            {/* 通话中/连接中 - 控制按钮 */}
            {(isConnected || isConnecting) && (
              <>
                {/* 静音 */}
                <button
                  onClick={onToggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    session.isMuted
                      ? 'bg-[#EF4444] text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {session.isMuted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>

                {/* 摄像头（仅视频通话） */}
                {isVideo && (
                  <button
                    onClick={onToggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      session.isCameraOff
                        ? 'bg-[#EF4444] text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {session.isCameraOff ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* 扬声器 */}
                <button
                  onClick={onToggleSpeaker}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    session.isSpeakerOff
                      ? 'bg-[#EF4444] text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {session.isSpeakerOff ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>

                {/* 挂断 */}
                <button
                  onClick={onHangup}
                  className="w-16 h-16 rounded-full bg-[#EF4444] hover:bg-[#DC2626] flex items-center justify-center transition-transform hover:scale-110"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CallModal.displayName = 'CallModal';

/**
 * 获取状态文字
 */
function getStatusText(status: string, isIncoming: boolean): string {
  switch (status) {
    case 'calling':
      return '正在拨号...';
    case 'ringing':
      return isIncoming ? '邀请你通话' : '等待接听...';
    case 'connecting':
      return '正在连接...';
    case 'connected':
      return '通话中';
    case 'ended':
      return '通话已结束';
    case 'failed':
      return '通话失败';
    default:
      return '';
  }
}

/**
 * 通话时长组件
 */
interface CallDurationProps {
  startTime?: string;
  className?: string;
}

function CallDuration({ startTime, className = '' }: CallDurationProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      setDuration(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className={`font-mono ${className}`}>
      {formatTime(duration)}
    </span>
  );
}
