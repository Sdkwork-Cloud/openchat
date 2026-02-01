/**
 * 会话列表组件
 *
 * 职责：渲染会话列表 UI
 *
 * 设计参考：微信PC版
 * - 搜索栏在顶部，右侧加号按钮下拉菜单
 * - 列表区域自适应高度
 */

import { memo, useState, useRef, useEffect } from 'react';
import type { Conversation } from '../entities/conversation.entity';
import { ConversationItem } from './ConversationItem';
import { CreateGroupModal } from './CreateGroupModal';
import { AddFriendModal } from './AddFriendModal';
import { NewNoteModal } from './NewNoteModal';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation?: () => void;
}

// 菜单项配置
const menuItems = [
  {
    id: 'group',
    label: '发起群聊',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'friend',
    label: '添加朋友',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    id: 'note',
    label: '新建笔记',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

// 模拟好友数据
const mockFriends = [
  { id: '1', name: 'Alice', avatar: 'A', status: '在线', isOnline: true, initial: 'A', region: '中国', signature: '生活不止眼前的苟且' },
  { id: '2', name: 'Bob', avatar: 'B', status: '忙碌', isOnline: true, initial: 'B', region: '美国', signature: 'Work hard, play hard' },
  { id: '3', name: 'Carol', avatar: 'C', status: '离开', isOnline: false, initial: 'C', region: '英国' },
  { id: '4', name: 'David', avatar: 'D', status: '在线', isOnline: true, initial: 'D', region: '日本', signature: 'Hello World' },
  { id: '5', name: 'Emma', avatar: 'E', initial: 'E', region: '法国' },
  { id: '6', name: 'Frank', avatar: 'F', initial: 'F', region: '德国' },
  { id: '7', name: 'Grace', avatar: 'G', initial: 'G', region: '澳大利亚' },
  { id: '8', name: 'Henry', avatar: 'H', initial: 'H', region: '加拿大' },
];

export const ConversationList = memo(({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
}: ConversationListProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // 处理菜单项点击
  const handleMenuClick = (itemId: string) => {
    setIsMenuOpen(false);
    switch (itemId) {
      case 'group':
        setIsCreateGroupOpen(true);
        break;
      case 'friend':
        setIsAddFriendOpen(true);
        break;
      case 'note':
        setIsNewNoteOpen(true);
        break;
    }
  };

  return (
    <div className="w-[300px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col h-full">
      {/* 搜索栏 + 加号菜单按钮 */}
      <div className="p-4 border-b border-[var(--border-color)] flex-shrink-0">
        <div className="flex items-center space-x-2">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="搜索AI助手或对话..."
              className="w-full h-10 pl-10 pr-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all"
            />
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* 加号下拉菜单按钮 */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                isMenuOpen
                  ? 'bg-[var(--ai-primary)] text-white rotate-45'
                  : 'bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white shadow-[var(--shadow-glow)]'
              }`}
              title="更多功能"
            >
              <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* 下拉菜单 - 微信风格 */}
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute top-full right-0 mt-2 w-44 bg-[#2C2C2C] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                style={{
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                {/* 小三角箭头 */}
                <div className="absolute -top-1.5 right-3 w-3 h-3 bg-[#2C2C2C] rotate-45 rounded-sm" />

                {menuItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className="relative w-full flex items-center px-4 py-3 text-white/90 hover:bg-white/10 transition-colors text-sm"
                  >
                    <span className="mr-3 text-white/70">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 会话列表 - 自适应高度 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedId === conversation.id}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>

      {/* 弹窗组件 */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onSuccess={(groupId) => {
          console.log('群聊创建成功:', groupId);
          // 可以在这里处理创建成功后的逻辑，比如跳转到群聊
        }}
        friends={mockFriends}
      />

      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onSuccess={() => {
          console.log('好友申请已发送');
        }}
      />

      <NewNoteModal
        isOpen={isNewNoteOpen}
        onClose={() => setIsNewNoteOpen(false)}
        onSuccess={() => {
          console.log('笔记已保存');
        }}
      />
    </div>
  );
});

ConversationList.displayName = 'ConversationList';
