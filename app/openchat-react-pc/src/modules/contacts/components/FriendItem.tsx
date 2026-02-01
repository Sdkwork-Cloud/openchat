/**
 * 好友列表项组件 - 微信风格设计
 *
 * 职责：渲染单个好友项
 * 设计参考：微信PC版好友列表
 */

import { memo } from 'react';
import type { Friend } from '../entities/contact.entity';

interface FriendItemProps {
  friend: Friend;
  isSelected: boolean;
  onClick: () => void;
}

export const FriendItem = memo(({ friend, isSelected, onClick }: FriendItemProps) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-150 group ${
        isSelected
          ? 'bg-[var(--ai-primary-soft)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* 头像 */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--ai-primary)] to-[var(--ai-primary-hover)] flex items-center justify-center text-white font-semibold text-sm shadow-[var(--shadow-sm)]">
          {friend.avatar}
        </div>
        {/* 在线状态指示器 */}
        {friend.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--ai-success)] border-2 border-[var(--bg-secondary)] rounded-full"></div>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0 ml-3">
        <h3 className={`font-medium text-sm truncate ${
          isSelected ? 'text-[var(--ai-primary)]' : 'text-[var(--text-primary)]'
        }`}>
          {friend.name}
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
          {friend.status || (friend.isOnline ? '在线' : '离线')}
        </p>
      </div>

      {/* 选中指示器 */}
      {isSelected && (
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--ai-primary)] ml-2" />
      )}
    </div>
  );
});

FriendItem.displayName = 'FriendItem';
