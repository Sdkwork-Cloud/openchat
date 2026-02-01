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
          f.name.toLowerCase().includes(keyword) ||
          f.id.toLowerCase().includes(keyword)
      );
    }

    // 按首字母分组
    const groups: Record<string, Friend[]> = {};
    filtered.forEach((friend) => {
      const initial = friend.initial || friend.name[0].toUpperCase();
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
          <span className="text-[15px] text-[var(--text-secondary)]">
            已选择 <span className="text-[var(--ai-primary)] font-semibold">{selectedMembers.size}</span> 个联系人
          </span>
          <ModalButtonGroup
            onCancel={handleClose}
            onConfirm={handleCreate}
            confirmText="完成"
            confirmVariant="success"
            isLoading={isCreating}
            disabled={selectedMembers.size < 2}
          />
        </div>
      }
    >
      <div className="flex h-full">
        {/* 左侧 - 联系人列表 - 50% */}
        <div className="w-1/2 flex flex-col border-r border-[var(--border-color)] min-w-0">
          {/* 搜索框 */}
          <div className="p-4 border-b border-[var(--border-color)]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
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
                placeholder="搜索"
                className="w-full h-9 pl-9 pr-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] transition-all"
              />
            </div>
          </div>

          {/* 联系人列表 */}
          <div className="flex-1 overflow-y-auto">
            {/* 企业微信联系人 */}
            <div className="border-b border-[var(--border-color)]">
              <button className="w-full flex items-center px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors group">
                <svg className="w-4 h-4 text-[var(--text-muted)] mr-2 group-hover:text-[var(--text-secondary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[14px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">企业微信联系人</span>
              </button>
            </div>

            {/* 联系人分组 */}
            <div>
              <button className="w-full flex items-center px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors group border-b border-[var(--border-color)]">
                <svg className="w-4 h-4 text-[var(--text-muted)] mr-2 rotate-90 group-hover:text-[var(--text-secondary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[14px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">联系人</span>
              </button>

              {/* 星标朋友 */}
              <div className="px-4 py-1.5 text-[12px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">星标朋友</div>

              {/* 按字母分组的联系人 */}
              {sortedInitials.map((initial) => (
                <div key={initial}>
                  <div className="px-4 py-1 text-[12px] text-[var(--text-muted)] bg-[var(--bg-tertiary)]">{initial}</div>
                  {groupedFriends[initial].map((friend) => (
                    <label
                      key={friend.id}
                      className="flex items-center px-4 py-2 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(friend.id)}
                        onChange={() => toggleMember(friend.id)}
                        className="w-4 h-4 rounded border-2 border-[var(--border-color)] bg-transparent text-[var(--ai-primary)] focus:ring-[var(--ai-primary)] focus:ring-2 focus:ring-offset-0 focus:ring-offset-[var(--bg-secondary)] cursor-pointer"
                      />
                      <div className="w-8 h-8 ml-3 rounded-full bg-[var(--ai-primary)] flex items-center justify-center text-white text-[13px] font-medium flex-shrink-0">
                        {friend.avatar}
                      </div>
                      <span className="ml-3 text-[14px] text-[var(--text-primary)]">{friend.name}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧 - 已选择的成员 - 50% */}
        <div className="w-1/2 flex flex-col bg-[var(--bg-tertiary)]">
          {/* 已选择列表 */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-2">
              {selectedFriendsList.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center px-3 py-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] hover:border-[var(--ai-primary)] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--ai-primary)] flex items-center justify-center text-white text-[12px] font-medium flex-shrink-0">
                    {friend.avatar}
                  </div>
                  <span className="ml-2.5 text-[13px] text-[var(--text-primary)] truncate flex-1">
                    {friend.name}
                  </span>
                  <button
                    onClick={() => removeMember(friend.id)}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--ai-error)] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default CreateGroupModal;
