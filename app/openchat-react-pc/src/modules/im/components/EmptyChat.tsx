/**
 * 空聊天状态组件
 * 
 * 职责：渲染未选择会话时的空状态
 */

import { memo } from 'react';

export const EmptyChat = memo(() => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-[var(--ai-primary)] flex items-center justify-center shadow-[var(--shadow-glow)]">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">开始AI对话</h3>
        <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto">选择一个AI助手或创建新对话，体验智能交互</p>
      </div>
    </div>
  );
});

EmptyChat.displayName = 'EmptyChat';
