/**
 * 添加好友弹窗组件 - 使用通用 Modal
 *
 * 职责：
 * 1. 搜索用户
 * 2. 发送好友申请
 * 3. 显示搜索结果
 */

import { useState, useCallback } from "react";
import type { Friend } from "@/modules/contacts/entities/contact.entity";
import { Modal, ModalButtonGroup } from "@/components/ui/Modal";
import { Button } from "@/components/ui";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// 模拟用户数据
const mockUsers: Friend[] = [
  {
    id: "user-100",
    name: "小明",
    avatar: "明",
    status: "在线",
    isOnline: true,
    initial: "明",
    region: "北京",
    signature: "热爱生活",
  },
  {
    id: "user-101",
    name: "小红",
    avatar: "红",
    status: "忙碌",
    isOnline: true,
    initial: "红",
    region: "上海",
    signature: "工作狂",
  },
  {
    id: "user-102",
    name: "小李",
    avatar: "李",
    status: "离线",
    isOnline: false,
    initial: "李",
    region: "广州",
    signature: "程序员",
  },
  {
    id: "user-103",
    name: "小王",
    avatar: "王",
    status: "在线",
    isOnline: true,
    initial: "王",
    region: "深圳",
    signature: "产品经理",
  },
  {
    id: "user-104",
    name: "小张",
    avatar: "张",
    status: "离开",
    isOnline: false,
    initial: "张",
    region: "杭州",
    signature: "设计师",
  },
];

export function AddFriendModal({
  isOpen,
  onClose,
  onSuccess,
}: AddFriendModalProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Friend | null>(null);
  const [verifyMessage, setVerifyMessage] = useState("");
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
        (user.name || "").includes(searchKeyword.trim()) ||
        user.id.includes(searchKeyword.trim()),
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
    setSearchKeyword("");
    setSearchResults([]);
    setSelectedUser(null);
    setVerifyMessage("");
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
            confirmText={sendSuccess ? "申请已发送" : "发送好友申请"}
            confirmVariant="primary"
            isLoading={isSending}
            disabled={sendSuccess}
          />
        ) : (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="px-8 rounded-xl"
            >
              取消
            </Button>
          </div>
        )
      }
    >
      <div className="p-6 space-y-6">
        {/* 搜索框 */}
        <div className="flex space-x-3">
          <div className="relative flex-1 group">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索用户 ID 或 手机号"
              className="w-full h-11 pl-10 pr-4 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!searchKeyword.trim() || isSearching}
            className="h-11 px-6 rounded-xl"
          >
            {isSearching ? (
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              "搜索"
            )}
          </Button>
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && !selectedUser && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">
              搜索结果
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center p-3.5 bg-bg-tertiary/50 border border-border rounded-xl hover:border-primary/50 hover:bg-bg-hover transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center text-primary text-lg font-bold group-hover:scale-105 transition-transform flex-shrink-0 shadow-sm">
                    {user.avatar}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-[15px] text-text-primary font-bold truncate group-hover:text-primary transition-colors">
                        {user.name}
                      </p>
                      <div
                        className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-success shadow-glow-success" : "bg-text-muted"}`}
                      />
                    </div>
                    <p className="text-xs text-text-tertiary truncate mt-0.5">
                      {user.region} · {user.signature}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 无搜索结果 */}
        {searchResults.length === 0 && searchKeyword && !isSearching && (
          <div className="text-center py-12 bg-bg-tertiary/30 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <svg
                className="w-8 h-8 text-text-muted opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-text-secondary font-medium">未找到相关用户</p>
            <p className="text-text-muted text-xs mt-1">请尝试搜索其他关键词</p>
          </div>
        )}

        {/* 发送申请 */}
        {selectedUser && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-400">
            {/* 选中的用户卡片 */}
            <div className="flex items-center p-5 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl border border-primary/20 shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                  title="返回搜索"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-glow-primary">
                {selectedUser.avatar}
              </div>
              <div className="ml-5 flex-1">
                <p className="text-lg text-text-primary font-bold">
                  {selectedUser.name}
                </p>
                <p className="text-sm text-text-tertiary flex items-center mt-0.5">
                  <svg
                    className="w-3.5 h-3.5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {selectedUser.region}
                </p>
              </div>
            </div>

            {/* 验证消息 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  验证消息
                </label>
                <span
                  className={`text-[10px] ${verifyMessage.length >= 100 ? "text-error" : "text-text-muted"}`}
                >
                  {verifyMessage.length}/100
                </span>
              </div>
              <textarea
                value={verifyMessage}
                onChange={(e) => setVerifyMessage(e.target.value)}
                placeholder="输入验证消息，介绍一下你自己..."
                rows={4}
                maxLength={100}
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-inner"
              />
            </div>

            {/* 发送成功提示 */}
            {sendSuccess && (
              <div className="flex items-center justify-center bg-success/10 text-success text-sm py-3 rounded-xl border border-success/20 animate-bounce">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="font-bold">好友申请已成功发送</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AddFriendModal;
