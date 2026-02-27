/**
 * 发起群聊弹窗组件 - 使用通用 Modal
 *
 * 职责：
 * 1. 左侧显示联系人列表（带搜索）
 * 2. 右侧显示已选择的成员
 * 3. 创建群聊
 */

import { useState, useMemo } from 'react';
import type { Friend } from '@/modules/contacts/entities/contact.entity';
import { Modal, ModalButtonGroup } from '@/components/ui/Modal';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (groupId: string) => void;
  friends: Friend[];
}

export function CreateGroupModal({ isOpen, onClose, onSuccess, friends }: CreateGroupModalProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // 按首字母分组
  const groupedFriends = useMemo(() => {
    let filtered = friends;

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = friends.filter(
        (f) =>
          (f.name || '').toLowerCase().includes(keyword) ||
          f.id.toLowerCase().includes(keyword)
      );
    }

    // 按首字母分组
    const groups: Record<string, Friend[]> = {};
    filtered.forEach((friend) => {
      const initial = friend.initial || (friend.name || '#')[0].toUpperCase();
      if (!groups[initial]) {
        groups[initial] = [];
      }
      groups[initial].push(friend);
    });

    return groups;
  }, [friends, searchKeyword]);

  const sortedInitials = useMemo(() => {
    return Object.keys(groupedFriends).sort();
  }, [groupedFriends]);

  // 已选择的成员列表
  const selectedFriendsList = useMemo(() => {
    return friends.filter((f) => selectedMembers.has(f.id));
  }, [friends, selectedMembers]);

  // 切换成员选择
  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  // 移除已选择的成员
  const removeMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    newSelected.delete(memberId);
    setSelectedMembers(newSelected);
  };

  // 创建群聊
  const handleCreate = async () => {
    if (selectedMembers.size < 2) return;

    setIsCreating(true);

    // 模拟创建延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsCreating(false);
    onSuccess(`group-${Date.now()}`);
    handleClose();
  };

  // 关闭弹窗并重置状态
  const handleClose = () => {
    setSearchKeyword('');
    setSelectedMembers(new Set());
    setIsCreating(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="发起群聊"
      customWidth="850px"
      customHeight="650px"
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[14px] text-text-secondary">
            已选择 <span className="text-primary font-bold">{selectedMembers.size}</span> 个联系人
          </span>
          <ModalButtonGroup
            onCancel={handleClose}
            onConfirm={handleCreate}
            confirmText="创建群聊"
            confirmVariant="success"
            isLoading={isCreating}
            disabled={selectedMembers.size < 2}
          />
        </div>
      }
    >
      <div className="flex h-full">
        {/* 左侧 - 联系人列表 - 50% */}
        <div className="w-1/2 flex flex-col border-r border-border min-w-0 bg-bg-secondary">
          {/* 搜索框 */}
          <div className="p-4 border-b border-border">
            <div className="relative group">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索联系人"
                className="w-full h-10 pl-10 pr-3 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* 联系人列表 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted">
            {/* 列表分组 */}
            <div className="py-2">
              {/* 按字母分组的联系人 */}
              {sortedInitials.map((initial) => (
                <div key={initial}>
                  <div className="px-5 py-1.5 text-[11px] font-bold text-text-muted bg-bg-tertiary/50 uppercase tracking-wider">{initial}</div>
                  {groupedFriends[initial].map((friend) => (
                    <label
                      key={friend.id}
                      className="flex items-center px-5 py-2.5 hover:bg-bg-hover cursor-pointer transition-all duration-200 group"
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(friend.id)}
                          onChange={() => toggleMember(friend.id)}
                          className="peer w-5 h-5 rounded-md border-2 border-border bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer appearance-none checked:bg-primary checked:border-primary transition-all"
                        />
                        <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="w-9 h-9 ml-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[14px] font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                        {friend.avatar}
                      </div>
                      <span className="ml-3 text-[14px] text-text-primary font-medium group-hover:text-primary transition-colors">{friend.name}</span>
                    </label>
                  ))}
                </div>
              ))}
              
              {sortedInitials.length === 0 && (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                    <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-text-muted text-sm">暂无匹配的联系人</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧 - 已选择的成员 - 50% */}
        <div className="w-1/2 flex flex-col bg-bg-tertiary/30 backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-bold text-text-secondary tracking-wide uppercase">已选成员 ({selectedMembers.size})</h3>
          </div>
          {/* 已选择列表 */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border-medium">
            <div className="grid grid-cols-1 gap-2.5">
              {selectedFriendsList.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center px-3 py-2.5 bg-bg-secondary/50 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all group animate-in slide-in-from-right-4 duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0 shadow-sm">
                    {friend.avatar}
                  </div>
                  <span className="ml-3 text-[14px] text-text-primary truncate flex-1 font-medium">
                    {friend.name}
                  </span>
                  <button
                    onClick={() => removeMember(friend.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 text-text-tertiary hover:text-error transition-all duration-200"
                    title="移除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              
              {selectedMembers.size === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-text-muted opacity-50">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm">尚未选择任何成员</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default CreateGroupModal;
