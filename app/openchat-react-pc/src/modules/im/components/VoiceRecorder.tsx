/**
 * 语音录制组件
 *
 * 职责：
 * 1. 录制语音消息
 * 2. 显示录制时长
 * 3. 预览和发送
 * 4. 取消录制
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceRecorderProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ isRecording, onStart, onStop, onCancel }: VoiceRecorderProps) {
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 开始录制
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 设置音频分析器
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // 收集音频数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 录制停止
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onStop(audioBlob, duration);
        
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
      };

      // 开始录制
      mediaRecorder.start(100); // 每100ms收集一次数据
      onStart();

      // 开始计时
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // 开始音频可视化
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // 计算平均音量
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  }, [onStart, onStop, duration]);

  // 停止录制
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // 清理
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setAudioLevel(0);
  }, []);

  // 取消录制
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // 清理
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setDuration(0);
    setAudioLevel(0);
    audioChunksRef.current = [];
    onCancel();
  }, [onCancel]);

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isRecording) {
    return (
      <button
        onClick={startRecording}
        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--ai-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        title="语音消息"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-3 px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg">
      {/* 取消按钮 */}
      <button
        onClick={cancelRecording}
        className="p-2 rounded-full text-[var(--ai-error)] hover:bg-[var(--ai-error)]/10 transition-colors"
        title="取消"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 录制状态 */}
      <div className="flex items-center space-x-2">
        {/* 录制指示器 */}
        <div className="relative">
          <div className="w-3 h-3 bg-[var(--ai-error)] rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-[var(--ai-error)] rounded-full animate-ping opacity-75" />
        </div>

        {/* 时长 */}
        <span className="text-sm font-mono text-[var(--text-primary)] min-w-[50px]">
          {formatDuration(duration)}
        </span>

        {/* 音频波形 */}
        <div className="flex items-center space-x-0.5 h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-[var(--ai-primary)] rounded-full transition-all duration-100"
              style={{
                height: `${Math.max(4, Math.min(24, (audioLevel / 255) * 24 * (0.5 + Math.random() * 0.5)))}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* 完成按钮 */}
      <button
        onClick={stopRecording}
        className="p-2 rounded-full text-[var(--ai-success)] hover:bg-[var(--ai-success)]/10 transition-colors"
        title="完成"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}

export default VoiceRecorder;
