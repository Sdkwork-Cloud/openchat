/**
 * 会话列表项组件
 *
 * 职责：渲染单个会话项 UI
 */

import { memo } from "react";
import type {
  Conversation,
  ConversationType,
} from "../entities/conversation.entity";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const getAvatarColor = (type: ConversationType): string => {
  switch (type) {
    case "ai":
      return "bg-primary";
    case "group":
      return "bg-purple-500";
    default:
      return "bg-success";
  }
};

export const ConversationItem = memo(
  ({ conversation, isSelected, onClick }: ConversationItemProps) => {
    return (
      <div
        onClick={onClick}
        className={`flex items-center px-4 py-3.5 cursor-pointer transition-all duration-200 group ${
          isSelected
            ? "bg-primary-soft border-l-2 border-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]"
            : "hover:bg-bg-hover hover:translate-x-1 border-l-2 border-transparent"
        }`}
      >
        {/* 头像 */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-11 h-11 rounded-xl ${getAvatarColor(conversation.type)} flex items-center justify-center text-white font-semibold text-sm shadow-md`}
          >
            {conversation.avatar}
          </div>
          {conversation.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success border-2 border-bg-secondary rounded-full"></div>
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0 ml-3.5">
          <div className="flex items-center justify-between">
            <h3
              className={`font-medium text-sm truncate pr-2 ${
                isSelected ? "text-primary" : "text-text-primary"
              }`}
            >
              {conversation.name}
            </h3>
            <span className="text-xs text-text-muted flex-shrink-0">
              {conversation.lastMessageTime}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-text-tertiary truncate pr-2 flex items-center">
              {conversation.isTyping ? (
                <span className="flex items-center text-primary">
                  输入中
                  <span className="flex space-x-1 ml-1">
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                  </span>
                </span>
              ) : (
                conversation.lastMessage
              )}
            </p>
            {conversation.unreadCount > 0 && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {conversation.unreadCount > 99
                  ? "99+"
                  : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
);

ConversationItem.displayName = "ConversationItem";
