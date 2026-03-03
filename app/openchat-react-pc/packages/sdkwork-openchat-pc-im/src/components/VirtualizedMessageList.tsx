/**
 * 虚拟化消息列表组件
 * 
 * 职责：高效渲染大量消息，使用虚拟列表技术
 * 优化：支持万级消息流畅滚动
 */

import { useRef, useEffect, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from '../entities/message.entity';
import { MessageBubble } from './MessageBubble';

interface VirtualizedMessageListProps {
  messages: Message[];
  isTyping: boolean;
}

// 估算消息高度（根据内容类型）
const estimateMessageHeight = (message: Message): number => {
  const baseHeight = 80; // 基础高度
  const contentLength = message.content?.text?.length || 0;
  
  // 根据文本长度估算额外高度
  if (contentLength > 500) return baseHeight + 200;
  if (contentLength > 200) return baseHeight + 100;
  if (contentLength > 100) return baseHeight + 50;
  
  // 图片/视频消息高度更高
  if (message.type === 'image' || message.type === 'video') {
    return baseHeight + 250;
  }
  
  return baseHeight;
};

export const VirtualizedMessageList = memo(({ 
  messages, 
  isTyping: _isTyping 
}: VirtualizedMessageListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(true);

  // 配置虚拟列表
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index) => {
      return estimateMessageHeight(messages[index]);
    }, [messages]),
    overscan: 5, // 预渲染 5 条消息，避免白屏
    measureElement: (el) => {
      // 使用实际测量高度
      return el.getBoundingClientRect().height;
    },
  });

  // 检测用户是否滚动到底部
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldScrollToBottomRef.current = isAtBottom;
  }, []);

  // 新消息自动滚动到底部
  useEffect(() => {
    if (shouldScrollToBottomRef.current && messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: 'smooth',
      });
    }
  }, [messages.length, virtualizer]);

  // 虚拟列表项
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div 
      ref={parentRef}
      className="flex-1 overflow-y-auto px-6 py-5"
      onScroll={handleScroll}
    >
      {/* AI欢迎提示 */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2 px-4 py-2 bg-[rgba(14,165,233,0.1)] border border-[rgba(14,165,233,0.2)] rounded-full">
          <div className="w-2 h-2 bg-[#0EA5E9] rounded-full"></div>
          <span className="text-xs text-[#0EA5E9]">AI助手已连接</span>
        </div>
      </div>

      {/* 虚拟列表容器 */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={message.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageBubble message={message} />
            </div>
          );
        })}
      </div>
      
      {/* 滚动到底部标记 */}
      <div ref={scrollToBottomRef} />
    </div>
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';
