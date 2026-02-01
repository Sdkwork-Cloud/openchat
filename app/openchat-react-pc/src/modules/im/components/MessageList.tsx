/**
 * 消息列表组件
 * 
 * 职责：渲染消息列表
 */

import { useRef, useEffect, memo } from 'react';
import type { Message } from '../entities/message.entity';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

export const MessageList = memo(({ messages, isTyping: _isTyping }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      {/* AI欢迎提示 */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2 px-4 py-2 bg-[var(--ai-primary-soft)] border border-[var(--ai-primary-medium)] rounded-full">
          <div className="w-2 h-2 bg-[var(--ai-primary)] rounded-full animate-pulse"></div>
          <span className="text-xs text-[var(--ai-primary)]">AI助手已连接</span>
        </div>
      </div>

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});

MessageList.displayName = 'MessageList';
