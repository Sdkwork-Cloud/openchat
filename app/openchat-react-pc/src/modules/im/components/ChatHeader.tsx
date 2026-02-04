/**
 * 聊天头部组件 - 支持通话功能
 * 
 * 职责：渲染聊天会话头部信息和通话按钮
 */

import { memo } from 'react';
import type { Conversation } from '../entities/conversation.entity';
import type { CallType } from '../../rtc/entities/rtc.entity';

interface ChatHeaderProps {
  conversation: Conversation;
  onCall?: (callType: CallType) => void;
  onToggleDevicePanel?: () => void;
  showDeviceButton?: boolean;
}

export const ChatHeader = memo(({ conversation, onCall, onToggleDevicePanel, showDeviceButton }: ChatHeaderProps) => {
  const handleAudioCall = () => {
    onCall?.('audio');
  };

  const handleVideoCall = () => {
    onCall?.('video');
  };

  return (
    <div className="h-[70px] bg-[var(--bg-secondary)]/80 backdrop-blur-sm border-b border-[var(--border-color)] flex items-center justify-between px-6">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-xl bg-[var(--ai-primary)] flex items-center justify-center text-white font-bold text-sm mr-3 shadow-[var(--shadow-md)]">
          {conversation.avatar}
        </div>
        <div>
          <h2 className="font-semibold text-[var(--text-primary)] text-base">
            {conversation.name}
          </h2>
          <div className="flex items-center mt-0.5">
            <div className={`w-2 h-2 rounded-full mr-2 ${conversation.isOnline ? 'bg-[var(--ai-success)]' : 'bg-[var(--text-muted)]'}`}></div>
            <span className="text-xs text-[var(--text-tertiary)]">
              {conversation.isOnline ? '在线' : '离线'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {showDeviceButton && (
          <button 
            onClick={onToggleDevicePanel}
            className="p-2.5 hover:bg-[var(--bg-hover)] rounded-xl transition-colors group" 
            title="设备管理"
          >
            <svg className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--ai-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
        )}
        <button 
          onClick={handleAudioCall}
          className="p-2.5 hover:bg-[var(--bg-hover)] rounded-xl transition-colors group" 
          title="语音通话"
        >
          <svg className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--ai-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        <button 
          onClick={handleVideoCall}
          className="p-2.5 hover:bg-[var(--bg-hover)] rounded-xl transition-colors group" 
          title="视频通话"
        >
          <svg className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--ai-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button className="p-2.5 hover:bg-[var(--bg-hover)] rounded-xl transition-colors group" title="更多">
          <svg className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--ai-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';
