/**
 * AI 主布局组件 - 科技蓝主题
 * 
 * 布局结构：
 * - 左侧：72px AI侧边栏
 * - 中间：300px 会话列表
 * - 右侧：自适应 AI对话区域
 * - 窗口控制栏：悬浮在右上角（Desktop 环境）
 */

import { ReactNode } from 'react';
import { Sidebar } from '../components/desktop/Sidebar';
import { WindowControls } from '../components/desktop/WindowControls';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * AI 主布局
 */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-[#0A0F1C] overflow-hidden">
      {/* 窗口控制栏 - 悬浮在右上角，只在 Desktop 环境显示 */}
      <WindowControls
        showTitleBar={false}
        style="macos"
        className="absolute top-2 right-2 w-auto"
      />

      {/* 左侧AI导航栏 - 72px */}
      <Sidebar />
      
      {/* 主内容区域 - 无顶部预留空间 */}
      <main className="flex-1 flex min-w-0">
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
