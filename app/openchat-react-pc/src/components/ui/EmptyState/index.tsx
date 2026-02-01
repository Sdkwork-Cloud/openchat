/**
 * EmptyState 空状态组件
 *
 * 职责：在数据为空时提供友好的视觉反馈
 * 特性：
 * - 精美的插画风格
 * - 可自定义图标、标题、描述
 * - 支持操作按钮
 */

import React from 'react';
import { cn } from '../../../utils/cn';

// ==================== 类型定义 ====================

export interface EmptyStateProps {
  /** 图标 */
  icon?: React.ReactNode;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 操作按钮 */
  action?: React.ReactNode;
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 自定义类名 */
  className?: string;
}

// ==================== 预设图标 ====================

const EmptyIcon: React.FC<{ type?: 'default' | 'search' | 'message' | 'file' }> = ({
  type = 'default',
}) => {
  const icons = {
    default: (
      <svg
        className="w-full h-full"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <circle cx="45" cy="50" r="8" fill="currentColor" opacity="0.4" />
        <circle cx="75" cy="50" r="8" fill="currentColor" opacity="0.4" />
        <path
          d="M40 75 Q60 90 80 75"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    ),
    search: (
      <svg
        className="w-full h-full"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="55" cy="55" r="30" stroke="currentColor" strokeWidth="3" opacity="0.3" />
        <path
          d="M78 78 L95 95"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.3"
        />
        <circle cx="55" cy="55" r="20" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      </svg>
    ),
    message: (
      <svg
        className="w-full h-full"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="20"
          y="30"
          width="80"
          height="60"
          rx="8"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M35 50 H85 M35 65 H65"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.2"
        />
        <path
          d="M50 90 L60 80 L70 90"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    ),
    file: (
      <svg
        className="w-full h-full"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M35 20 H70 L90 40 V100 H35 V20 Z"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M70 20 V40 H90"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M45 55 H80 M45 70 H80 M45 85 H60"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.2"
        />
      </svg>
    ),
  };

  return icons[type] || icons.default;
};

// ==================== 组件实现 ====================

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = '暂无数据',
  description = '当前列表为空',
  action,
  size = 'medium',
  className,
}) => {
  const sizeClasses = {
    small: {
      container: 'py-8',
      icon: 'w-16 h-16',
      title: 'text-base',
      description: 'text-sm',
    },
    medium: {
      container: 'py-12',
      icon: 'w-24 h-24',
      title: 'text-lg',
      description: 'text-base',
    },
    large: {
      container: 'py-16',
      icon: 'w-32 h-32',
      title: 'text-xl',
      description: 'text-lg',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        currentSize.container,
        className
      )}
    >
      {/* 图标 */}
      <div
        className={cn(
          'text-[var(--text-muted)] mb-4',
          currentSize.icon
        )}
      >
        {icon || <EmptyIcon />}
      </div>

      {/* 标题 */}
      <h3
        className={cn(
          'font-medium text-[var(--text-primary)] mb-2',
          currentSize.title
        )}
      >
        {title}
      </h3>

      {/* 描述 */}
      <p
        className={cn(
          'text-[var(--text-secondary)] max-w-xs',
          currentSize.description
        )}
      >
        {description}
      </p>

      {/* 操作按钮 */}
      {action && (
        <div className="mt-6 animate-slideUp">
          {action}
        </div>
      )}
    </div>
  );
};

// ==================== 预设空状态 ====================

export const EmptySearch: React.FC<{ keyword?: string; onClear?: () => void }> = ({
  keyword,
  onClear,
}) => (
  <EmptyState
    icon={<EmptyIcon type="search" />}
    title={keyword ? `未找到 "${keyword}" 相关结果` : '无搜索结果'}
    description="请尝试使用其他关键词搜索"
    action={
      onClear && (
        <button
          onClick={onClear}
          className="px-4 py-2 bg-[var(--ai-primary)] text-white rounded-lg hover:bg-[var(--ai-primary-hover)] transition-colors"
        >
          清除搜索
        </button>
      )
    }
  />
);

export const EmptyChat: React.FC<{ onStartChat?: () => void }> = ({ onStartChat }) => (
  <EmptyState
    icon={<EmptyIcon type="message" />}
    title="开始新的对话"
    description="选择一个联系人或群组开始聊天"
    action={
      onStartChat && (
        <button
          onClick={onStartChat}
          className="px-4 py-2 bg-[var(--ai-primary)] text-white rounded-lg hover:bg-[var(--ai-primary-hover)] transition-colors"
        >
          新建对话
        </button>
      )
    }
  />
);

export const EmptyFile: React.FC<{ onUpload?: () => void }> = ({ onUpload }) => (
  <EmptyState
    icon={<EmptyIcon type="file" />}
    title="暂无文件"
    description="点击上传按钮添加文件"
    action={
      onUpload && (
        <button
          onClick={onUpload}
          className="px-4 py-2 bg-[var(--ai-primary)] text-white rounded-lg hover:bg-[var(--ai-primary-hover)] transition-colors"
        >
          上传文件
        </button>
      )
    }
  />
);

export default EmptyState;
