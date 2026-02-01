/**
 * 窗口控制栏组件 - Desktop 专用
 *
 * 职责：
 * 1. 提供窗口控制按钮（最小化、最大化、关闭）
 * 2. 支持拖拽移动窗口（在标题栏区域）
 * 3. 双击标题栏最大化/还原
 * 4. 只在 Desktop 环境显示
 *
 * 设计标准：
 * - 右上角固定位置
 * - macOS 风格：红黄绿圆形按钮
 * - Windows 风格：简洁图标按钮
 * - 悬停效果、点击动画
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { getPlatform, isDesktop } from '../../../platform';

type WindowState = 'normal' | 'maximized' | 'minimized';

interface WindowControlsProps {
  /** 是否显示标题栏（可拖拽区域） */
  showTitleBar?: boolean;
  /** 标题栏内容 */
  title?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 风格：macOS 或 Windows */
  style?: 'macos' | 'windows';
}

/**
 * 窗口控制栏组件
 */
export const WindowControls = memo(({
  showTitleBar = true,
  title,
  className = '',
  style = 'macos',
}: WindowControlsProps) => {
  const [windowState, setWindowState] = useState<WindowState>('normal');
  const [isDesktopEnv, setIsDesktopEnv] = useState(false);

  // 检查是否在 Desktop 环境
  useEffect(() => {
    try {
      setIsDesktopEnv(isDesktop());
    } catch {
      setIsDesktopEnv(false);
    }
  }, []);

  // 处理最小化
  const handleMinimize = useCallback(async () => {
    try {
      await getPlatform().minimizeWindow();
      setWindowState('minimized');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }, []);

  // 处理最大化/还原
  const handleMaximize = useCallback(async () => {
    try {
      await getPlatform().maximizeWindow();
      setWindowState(prev => prev === 'maximized' ? 'normal' : 'maximized');
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  }, []);

  // 处理关闭
  const handleClose = useCallback(async () => {
    try {
      await getPlatform().closeWindow();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, []);

  // 处理双击标题栏
  const handleTitleBarDoubleClick = useCallback(() => {
    handleMaximize();
  }, [handleMaximize]);

  // 如果不是 Desktop 环境，不渲染
  if (!isDesktopEnv) {
    return null;
  }

  return (
    <div
      className={`
        z-[9999]
        ${showTitleBar ? 'fixed top-0 right-0 h-10 w-full flex items-center' : 'flex items-center'}
        ${className}
      `}
      data-tauri-drag-region={showTitleBar ? true : undefined}
      onDoubleClick={showTitleBar ? handleTitleBarDoubleClick : undefined}
    >
      {/* 标题栏区域（可拖拽） */}
      {showTitleBar && (
        <div
          className="flex-1 h-full flex items-center px-4"
          data-tauri-drag-region
        >
          {title && (
            <span className="text-sm text-[#94A3B8] font-medium select-none">
              {title}
            </span>
          )}
        </div>
      )}

      {/* 窗口控制按钮 */}
      <div className={`flex items-center ${showTitleBar ? 'h-full px-2' : ''}`}>
        {style === 'macos' ? (
          <MacOSControls
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onClose={handleClose}
            windowState={windowState}
          />
        ) : (
          <WindowsControls
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onClose={handleClose}
            windowState={windowState}
          />
        )}
      </div>
    </div>
  );
});

WindowControls.displayName = 'WindowControls';

/**
 * macOS 风格控制按钮
 */
interface MacOSControlsProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  windowState: WindowState;
}

const MacOSControls = memo(({
  onMinimize,
  onMaximize,
  onClose,
  windowState,
}: MacOSControlsProps) => {
  return (
    <div className="flex items-center space-x-2">
      {/* 关闭按钮 - 红色 */}
      <button
        onClick={onClose}
        className="
          w-3 h-3 rounded-full
          bg-[#FF5F57] hover:bg-[#FF5F57]
          border border-[#E0443E]/30
          flex items-center justify-center
          transition-all duration-200
          group
        "
        title="关闭"
      >
        <svg
          className={`
            w-2 h-2 text-[#4D0000] opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          `}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 105.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" />
        </svg>
      </button>

      {/* 最小化按钮 - 黄色 */}
      <button
        onClick={onMinimize}
        className="
          w-3 h-3 rounded-full
          bg-[#FFBD2E] hover:bg-[#FFBD2E]
          border border-[#DEA123]/30
          flex items-center justify-center
          transition-all duration-200
          group
        "
        title="最小化"
      >
        <svg
          className={`
            w-2 h-2 text-[#995700] opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          `}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M19 13H5v-2h14v2z" />
        </svg>
      </button>

      {/* 最大化按钮 - 绿色 */}
      <button
        onClick={onMaximize}
        className="
          w-3 h-3 rounded-full
          bg-[#28C840] hover:bg-[#28C840]
          border border-[#1AAB29]/30
          flex items-center justify-center
          transition-all duration-200
          group
        "
        title={windowState === 'maximized' ? '还原' : '最大化'}
      >
        <svg
          className={`
            w-2 h-2 text-[#006500] opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          `}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {windowState === 'maximized' ? (
            <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
          ) : (
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          )}
        </svg>
      </button>
    </div>
  );
});

MacOSControls.displayName = 'MacOSControls';

/**
 * Windows 风格控制按钮
 */
interface WindowsControlsProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  windowState: WindowState;
}

const WindowsControls = memo(({
  onMinimize,
  onMaximize,
  onClose,
  windowState,
}: WindowsControlsProps) => {
  const buttonClass = `
    w-12 h-10
    flex items-center justify-center
    text-[#94A3B8] hover:text-white
    transition-colors duration-200
  `;

  return (
    <div className="flex items-center -mr-2">
      {/* 最小化按钮 */}
      <button
        onClick={onMinimize}
        className={`${buttonClass} hover:bg-[rgba(255,255,255,0.1)]`}
        title="最小化"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>

      {/* 最大化/还原按钮 */}
      <button
        onClick={onMaximize}
        className={`${buttonClass} hover:bg-[rgba(255,255,255,0.1)]`}
        title={windowState === 'maximized' ? '还原' : '最大化'}
      >
        {windowState === 'maximized' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>

      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className={`${buttonClass} hover:bg-[#E81123] hover:text-white`}
        title="关闭"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

WindowsControls.displayName = 'WindowsControls';

export default WindowControls;
