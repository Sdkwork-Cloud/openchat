/**
 * 联系人侧边栏组件 - 微信风格设计
 *
 * 职责：渲染联系人列表侧边栏
 * 设计参考：微信PC版通讯录
 */

import { memo } from 'react';
import type { Friend, Group, ContactTab, FriendFilter } from '../entities/contact.entity';
import { FriendItem } from './FriendItem';
import { GroupItem } from './GroupItem';

interface ContactSidebarProps {
  friends: Friend[];
  groups: Group[];
  activeTab: ContactTab;
  filter: FriendFilter;
  groupedFriends: Record<string, Friend[]>;
  sortedInitials: string[];
  selectedId: string | null;
  onTabChange: (tab: ContactTab) => void;
  onFilterChange: (filter: FriendFilter) => void;
  onSelect: (id: string) => void;
}

// 快捷功能项
const QuickActionItem = memo(({
  icon,
  iconBg,
  title,
  badge,
  onClick,
  isActive,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  badge?: number;
  onClick: () => void;
  isActive?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3 transition-all duration-150 group ${
      isActive
        ? 'bg-[var(--ai-primary-soft)]'
        : 'hover:bg-[var(--bg-hover)]'
    }`}
  >
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconBg}`}
    >
      {icon}
    </div>
    <span className={`ml-3 text-sm font-medium flex-1 text-left ${
      isActive ? 'text-[var(--ai-primary)]' : 'text-[var(--text-primary)]'
    }`}>
      {title}
    </span>
    {badge !== undefined && badge > 0 && (
      <span className="min-w-[18px] h-[18px] px-1.5 bg-[var(--ai-error)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    <svg
      className={`w-4 h-4 ml-2 transition-colors ${
        isActive ? 'text-[var(--ai-primary)]' : 'text-[var(--text-muted)]'
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </button>
));

QuickActionItem.displayName = 'QuickActionItem';

export const ContactSidebar = memo(({
  friends,
  groups,
  activeTab,
  filter,
  groupedFriends,
  sortedInitials,
  selectedId,
  onTabChange,
  onFilterChange,
  onSelect,
}: ContactSidebarProps) => {
  // 新的朋友数量（模拟）
  const newFriendCount = 3;

  // 处理点击"新的朋友"
  const handleNewFriendsClick = () => {
    onTabChange('friends');
    onFilterChange('new');
  };

  // 处理点击"群聊"
  const handleGroupsClick = () => {
    onTabChange('groups');
    onFilterChange('all');
  };

  // 处理点击"好友"标签
  const handleFriendsTabClick = () => {
    onTabChange('friends');
    onFilterChange('all');
  };

  return (
    <div className="w-[300px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col h-full">
      {/* 头部标题 */}
      <div className="h-[60px] flex items-center px-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">通讯录</h1>
      </div>

      {/* 搜索栏 */}
      <div className="p-3 border-b border-[var(--border-color)]">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索"
            className="w-full h-9 pl-9 pr-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:bg-[var(--bg-secondary)] transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* 快捷功能区 */}
      <div className="border-b border-[var(--border-color)]">
        <QuickActionItem
          icon={
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
          iconBg="bg-[var(--ai-warning)]"
          title="新的朋友"
          badge={newFriendCount}
          onClick={handleNewFriendsClick}
          isActive={activeTab === 'friends' && filter === 'new'}
        />
        <QuickActionItem
          icon={
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          iconBg="bg-[var(--ai-success)]"
          title="群聊"
          onClick={handleGroupsClick}
          isActive={activeTab === 'groups'}
        />
        <QuickActionItem
          icon={
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          iconBg="bg-[var(--ai-primary)]"
          title="标签"
          onClick={() => {}}
        />
      </div>

      {/* 标签切换 - 只在显示好友列表或群组列表时显示 */}
      {!(activeTab === 'friends' && filter === 'new') && (
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <button
            onClick={handleFriendsTabClick}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'friends'
                ? 'text-[var(--ai-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            好友
            {activeTab === 'friends' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--ai-primary)] rounded-full" />
            )}
          </button>
          <button
            onClick={handleGroupsClick}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'groups'
                ? 'text-[var(--ai-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            群组
            {activeTab === 'groups' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--ai-primary)] rounded-full" />
            )}
          </button>
        </div>
      )}

      {/* 列表内容 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'friends' && filter === 'all' ? (
          <>
            {/* 好友列表（按字母分组） */}
            {sortedInitials.map((initial) => (
              <div key={initial}>
                <div className="px-4 py-1.5 bg-[var(--bg-primary)] text-xs text-[var(--text-muted)] font-medium sticky top-0">
                  {initial}
                </div>
                {groupedFriends[initial].map((friend) => (
                  <FriendItem
                    key={friend.id}
                    friend={friend}
                    isSelected={selectedId === friend.id}
                    onClick={() => onSelect(friend.id)}
                  />
                ))}
              </div>
            ))}
          </>
        ) : activeTab === 'friends' && filter === 'new' ? (
          <div className="p-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">新的朋友</h3>
              <p className="text-sm text-[var(--text-muted)]">暂无新的好友申请</p>
            </div>
          </div>
        ) : (
          <>
            {/* 新建群组按钮 */}
            <button className="w-full flex items-center px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-color)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-medium)] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="ml-3 text-sm text-[var(--text-primary)]">新建群聊</span>
            </button>

            {/* 群组列表 */}
            {groups.map((group) => (
              <GroupItem
                key={group.id}
                group={group}
                isSelected={selectedId === group.id}
                onClick={() => onSelect(group.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <span className="text-xs text-[var(--text-muted)]">
          {activeTab === 'friends' ? `${friends.length} 位好友` : `${groups.length} 个群组`}
        </span>
      </div>
    </div>
  );
});

ContactSidebar.displayName = 'ContactSidebar';
