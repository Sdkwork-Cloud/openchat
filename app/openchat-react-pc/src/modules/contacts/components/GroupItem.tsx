/**
 * 群组列表项组件 - 微信风格设计
 *
 * 职责：渲染单个群组项
 * 设计参考：微信PC版群聊列表
 */

import { memo } from 'react';
import type { Group } from '../entities/contact.entity';

interface GroupItemProps {
  group: Group;
  isSelected: boolean;
  onClick: () => void;
}

export const GroupItem = memo(({ group, isSelected, onClick }: GroupItemProps) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-150 group ${
        isSelected
          ? 'bg-[var(--ai-purple-soft)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* 群头像 */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--ai-purple)] to-[var(--ai-purple-hover)] flex items-center justify-center text-white font-semibold text-sm shadow-[var(--shadow-sm)]">
          {group.avatar}
        </div>
        {/* 群成员数量角标 */}
        <div className="absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-[9px] font-medium rounded-full flex items-center justify-center border border-[var(--border-color)]">
          {group.memberCount}
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0 ml-3">
        <h3 className={`font-medium text-sm truncate ${
          isSelected ? 'text-[var(--ai-purple)]' : 'text-[var(--text-primary)]'
        }`}>
          {group.name}
        </h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
          {group.memberCount} 位成员
        </p>
      </div>

      {/* 选中指示器 */}
      {isSelected && (
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--ai-purple)] ml-2" />
      )}
    </div>
  );
});

GroupItem.displayName = 'GroupItem';
