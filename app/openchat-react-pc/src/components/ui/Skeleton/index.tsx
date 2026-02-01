/**
 * Skeleton 骨架屏组件
 *
 * 职责：在内容加载时提供视觉占位，提升感知性能
 * 特性：
 * - Shimmer 流光动画效果
 * - 多种预设布局（文本、头像、卡片、列表）
 * - 可自定义尺寸和形状
 */

import React from 'react';
import { cn } from '../../../utils/cn';

// ==================== 类型定义 ====================

export interface SkeletonProps {
  /** 宽度 */
  width?: string | number;
  /** 高度 */
  height?: string | number;
  /** 圆角 */
  borderRadius?: string | number;
  /** 是否显示 shimmer 动画 */
  shimmer?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 行数（用于多行骨架屏） */
  rows?: number;
  /** 行间距 */
  rowGap?: number;
}

// ==================== 基础骨架屏 ====================

/**
 * 基础骨架屏组件
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  shimmer = true,
  className,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div
      className={cn(
        'bg-[var(--bg-tertiary)]',
        shimmer && 'skeleton-shimmer',
        className
      )}
      style={style}
    />
  );
};

// ==================== 预设布局 ====================

/**
 * 文本骨架屏
 */
export const SkeletonText: React.FC<Omit<SkeletonProps, 'height'> & { lines?: number }> = ({
  lines = 3,
  width = '100%',
  shimmer = true,
  className,
  rowGap = 8,
}) => {
  return (
    <div className={cn('flex flex-col', className)} style={{ gap: rowGap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '60%' : width}
          height={16}
          borderRadius={4}
          shimmer={shimmer}
        />
      ))}
    </div>
  );
};

/**
 * 头像骨架屏
 */
export const SkeletonAvatar: React.FC<Omit<SkeletonProps, 'width' | 'height' | 'borderRadius'>> = ({
  size = 40,
  shimmer = true,
  className,
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="50%"
      shimmer={shimmer}
      className={className}
    />
  );
};

/**
 * 卡片骨架屏
 */
export const SkeletonCard: React.FC<SkeletonProps> = ({
  shimmer = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <SkeletonAvatar size={48} shimmer={shimmer} />
        <div className="flex-1 min-w-0">
          <Skeleton width="40%" height={20} borderRadius={4} shimmer={shimmer} className="mb-2" />
          <SkeletonText lines={2} shimmer={shimmer} />
        </div>
      </div>
    </div>
  );
};

/**
 * 消息骨架屏
 */
export const SkeletonMessage: React.FC<{ isSelf?: boolean; shimmer?: boolean }> = ({
  isSelf = false,
  shimmer = true,
}) => {
  return (
    <div className={cn('flex gap-3', isSelf ? 'flex-row-reverse' : 'flex-row')}>
      <SkeletonAvatar size={36} shimmer={shimmer} />
      <div className={cn('flex flex-col max-w-[70%]', isSelf ? 'items-end' : 'items-start')}>
        <Skeleton width={60} height={14} borderRadius={4} shimmer={shimmer} className="mb-1" />
        <div
          className={cn(
            'px-4 py-2 rounded-2xl',
            isSelf
              ? 'bg-[var(--ai-primary)] rounded-br-sm'
              : 'bg-[var(--bg-tertiary)] rounded-bl-sm'
          )}
        >
          <Skeleton width={200} height={16} borderRadius={4} shimmer={shimmer} />
        </div>
      </div>
    </div>
  );
};

/**
 * 列表项骨架屏
 */
export const SkeletonListItem: React.FC<{ shimmer?: boolean }> = ({ shimmer = true }) => {
  return (
    <div className="flex items-center gap-3 p-3">
      <SkeletonAvatar size={40} shimmer={shimmer} />
      <div className="flex-1 min-w-0">
        <Skeleton width="50%" height={16} borderRadius={4} shimmer={shimmer} className="mb-2" />
        <Skeleton width="80%" height={12} borderRadius={4} shimmer={shimmer} />
      </div>
      <Skeleton width={40} height={12} borderRadius={4} shimmer={shimmer} />
    </div>
  );
};

/**
 * 聊天列表骨架屏
 */
export const SkeletonChatList: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} />
      ))}
    </div>
  );
};

/**
 * 消息列表骨架屏
 */
export const SkeletonMessageList: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonMessage key={index} isSelf={index % 3 === 1} />
      ))}
    </div>
  );
};

export default Skeleton;
