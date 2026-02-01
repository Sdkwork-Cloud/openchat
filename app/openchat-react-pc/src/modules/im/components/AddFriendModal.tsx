/**
 * 添加好友弹窗组件 - 使用通用 Modal
 *
 * 职责：
 * 1. 搜索用户
 * 2. 发送好友申请
 * 3. 显示搜索结果
 */

import { useState, useCallback } from 'react';
import type { Friend } from '@/modules/contacts/entities/contact.entity';
import { Modal, ModalButtonGroup } from '@/components/ui/Modal';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// 模拟用户数据
const mockUsers: Friend[] = [
  { id: 'user-100', name: '小明', avatar: '明', status: '在线', isOnline: true, initial: '明', region: '北京', signature: '热爱生活' },
  { id: 'user-101', name: '小红', avatar: '红', status: '忙碌', isOnline: true, initial: '红', region: '上海', signature: '工作狂' },
  { id: 'user-102', name: '小李', avatar: '李', status: '离线', isOnline: false, initial: '李', region: '广州', signature: '程序员' },
  { id: 'user-103', name: '小王', avatar: '王', status: '在线', isOnline: true, initial: '王', region: '深圳', signature: '产品经理' },
  { id: 'user-104', name: '小张', avatar: '张', status: '离开', isOnline: false, initial: '张', region: '杭州', signature: '设计师' },
];

export function AddFriendModal({ isOpen, onClose, onSuccess }: AddFriendModalProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Friend | null>(null);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // 搜索用户
  const handleSearch = useCallback(async () => {
    if (!searchKeyword.trim()) return;

    setIsSearching(true);
    setSelectedUser(null);
    setSendSuccess(false);

    // 模拟搜索延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    const results = mockUsers.filter(
      (user) =>
        user.name.includes(searchKeyword.trim()) ||
        user.id.includes(searchKeyword.trim())
    );

    setSearchResults(results);
    setIsSearching(false);
  }, [searchKeyword]);

  // 选择用户
  const handleSelectUser = (user: Friend) => {
    setSelectedUser(user);
    setVerifyMessage(`我是${user.name}，想加你为好友`);
    setSendSuccess(false);
  };

  // 发送好友申请
  const handleSendRequest = async () => {
    if (!selectedUser) return;

    setIsSending(true);

    // 模拟发送延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSending(false);
    setSendSuccess(true);

    // 延迟关闭
    setTimeout(() => {
      onSuccess?.();
      handleClose();
    }, 1500);
  };

  // 关闭弹窗并重置状态
  const handleClose = () => {
    setSearchKeyword('');
    setSearchResults([]);
    setSelectedUser(null);
    setVerifyMessage('');
    setSendSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="添加朋友"
      size="md"
      footer={
        selectedUser ? (
          <ModalButtonGroup
            onCancel={handleClose}
            onConfirm={handleSendRequest}
            confirmText={sendSuccess ? '已发送' : '发送申请'}
            confirmVariant="primary"
            isLoading={isSending}
            disabled={sendSuccess}
          />
        ) : (
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        )
      }
    >
      <div className="p-5 space-y-4">
        {/* 搜索框 */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入用户名或ID搜索"
              className="w-full h-10 pl-3 pr-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchKeyword.trim() || isSearching}
            className="px-4 h-10 text-sm font-medium text-white bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {isSearching ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              '搜索'
            )}
          </button>
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && !selectedUser && (
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">搜索结果</p>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-[var(--border-color)] rounded-md">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center px-3 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--ai-primary)] flex items-center justify-center text-white text-sm font-medium">
                    {user.avatar}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-[var(--text-primary)] font-medium">{user.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{user.region} · {user.signature}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-[var(--ai-success)]' : 'bg-[var(--text-muted)]'}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 无搜索结果 */}
        {searchResults.length === 0 && searchKeyword && !isSearching && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm text-[var(--text-muted)]">未找到相关用户</p>
          </div>
        )}

        {/* 发送申请 */}
        {selectedUser && (
          <div className="space-y-4">
            {/* 选中的用户 */}
            <div className="flex items-center p-4 bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-color)]">
              <div className="w-12 h-12 rounded-full bg-[var(--ai-primary)] flex items-center justify-center text-white text-lg font-medium">
                {selectedUser.avatar}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-[var(--text-primary)] font-medium">{selectedUser.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{selectedUser.region}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                重新选择
              </button>
            </div>

            {/* 验证消息 */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">验证消息</label>
              <textarea
                value={verifyMessage}
                onChange={(e) => setVerifyMessage(e.target.value)}
                placeholder="输入验证消息..."
                rows={3}
                maxLength={100}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] transition-colors resize-none"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{verifyMessage.length}/100</p>
            </div>

            {/* 发送成功提示 */}
            {sendSuccess && (
              <div className="flex items-center justify-center text-[var(--ai-success)] text-sm py-2">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                好友申请已发送
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AddFriendModal;
