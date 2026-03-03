import { memo } from "react";
import type { Conversation, ConversationType } from "../entities/conversation.entity";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const getAvatarColor = (type: ConversationType): string => {
  if (type === "ai") {
    return "bg-primary";
  }
  if (type === "group") {
    return "bg-purple-500";
  }
  return "bg-success";
};

export const ConversationItem = memo(
  ({ conversation, isSelected, onClick }: ConversationItemProps) => (
    <div
      onClick={onClick}
      className={`group flex cursor-pointer items-center border-l-2 px-4 py-3.5 transition-all duration-200 ${
        isSelected
          ? "border-primary bg-primary-soft shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          : "border-transparent hover:translate-x-1 hover:bg-bg-hover"
      }`}
    >
      <div className="relative flex-shrink-0">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-md ${getAvatarColor(
            conversation.type,
          )}`}
        >
          {conversation.avatar}
        </div>
        {conversation.isOnline ? (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-secondary bg-success" />
        ) : null}
      </div>

      <div className="ml-3.5 min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h3
            className={`truncate pr-2 text-sm font-medium ${
              isSelected ? "text-primary" : "text-text-primary"
            }`}
          >
            {conversation.name}
          </h3>
          <span className="flex-shrink-0 text-xs text-text-muted">
            {conversation.lastMessageTime}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <p className="flex items-center truncate pr-2 text-sm text-text-tertiary">
            {conversation.isTyping ? (
              <span className="flex items-center text-primary">
                Typing...
                <span className="ml-1 flex space-x-1">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary" />
                </span>
              </span>
            ) : (
              conversation.lastMessage
            )}
          </p>

          {conversation.unreadCount > 0 ? (
            <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white shadow-sm">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  ),
);

ConversationItem.displayName = "ConversationItem";
