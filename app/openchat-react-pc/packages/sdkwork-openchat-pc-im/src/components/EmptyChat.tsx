/**
 * 空聊天状态组件
 *
 * 职责：渲染未选择会话时的空状态
 */

import { memo } from "react";
import { Button } from "@sdkwork/openchat-pc-ui";

export const EmptyChat = memo(() => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]" />
      </div>

      <div className="text-center animate-fade-in relative z-10">
        <div className="w-24 h-24 mx-auto mb-8 rounded-[32px] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-glow-primary transition-all duration-500 hover:scale-110 hover:rotate-3">
          <svg
            className="w-12 h-12 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
          OpenChat AI
        </h3>
        <p className="text-text-tertiary text-sm max-w-sm mx-auto mb-8 leading-relaxed">
          选择左侧会话开始交流，或点击下方按钮开启全新的智能对话体验
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="primary"
            size="large"
            className="rounded-xl px-8 shadow-glow-primary hover:scale-105 active:scale-95 transition-all"
          >
            开启新对话
          </Button>
          <Button
            variant="outline"
            size="large"
            className="rounded-xl px-8 hover:bg-bg-hover"
          >
            了解更多
          </Button>
        </div>
      </div>

      {/* 底部功能提示 */}
      <div className="absolute bottom-12 flex gap-12 text-text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center border border-border">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xs">极速响应</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center border border-border">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xs">安全加密</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center border border-border">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.727 2.903a2 2 0 01-1.156 1.37l-4.481 2.24a2 2 0 01-2.105-.335l-3.135-3.135a2 2 0 01-.335-2.105l2.24-4.481a2 2 0 011.37-1.156l2.903-.727a2 2 0 001.414-1.96l-.477-2.387a2 2 0 00-.547-1.022L7.05 2.05a2 2 0 00-2.828 0L2.05 4.222a2 2 0 000 2.828l9.765 9.765a2 2 0 002.828 0l2.172-2.172a2 2 0 000-2.828l-2.387-2.387z" />
            </svg>
          </div>
          <span className="text-xs">多端同步</span>
        </div>
      </div>
    </div>
  );
});

EmptyChat.displayName = "EmptyChat";
