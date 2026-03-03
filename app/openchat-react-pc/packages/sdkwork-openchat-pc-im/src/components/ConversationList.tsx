import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFriends, type Friend } from "@sdkwork/openchat-pc-contacts";
import type { Conversation } from "../entities/conversation.entity";
import { AddFriendModal } from "./AddFriendModal";
import { ConversationItem } from "./ConversationItem";
import { CreateGroupModal } from "./CreateGroupModal";
import { NewNoteModal } from "./NewNoteModal";

export interface NewConversationPayload {
  id: string;
  name: string;
  type: Conversation["type"];
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation?: (payload?: NewConversationPayload) => void;
}

const menuItems = [
  {
    id: "group",
    label: "Create Group",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    id: "friend",
    label: "Add Contact",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
        />
      </svg>
    ),
  },
  {
    id: "note",
    label: "New Note",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
] as const;

export const ConversationList = memo(
  ({ conversations, selectedId, onSelect, onNewConversation }: ConversationListProps) => {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [friendLoadError, setFriendLoadError] = useState<string | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const loadFriends = useCallback(async () => {
      setIsLoadingFriends(true);
      setFriendLoadError(null);
      try {
        const list = await getFriends();
        setFriends(list);
      } catch (error) {
        setFriendLoadError(error instanceof Error ? error.message : "Failed to load contacts.");
      } finally {
        setIsLoadingFriends(false);
      }
    }, []);

    useEffect(() => {
      void loadFriends();
    }, [loadFriends]);

    const filteredConversations = useMemo(() => {
      const keyword = searchKeyword.trim().toLowerCase();
      if (!keyword) {
        return conversations;
      }

      return conversations.filter((conversation) => {
        const name = conversation.name.toLowerCase();
        const lastMessage = (conversation.lastMessage || "").toLowerCase();
        return name.includes(keyword) || lastMessage.includes(keyword);
      });
    }, [conversations, searchKeyword]);

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
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isMenuOpen]);

    const handleMenuClick = (itemId: (typeof menuItems)[number]["id"]) => {
      setIsMenuOpen(false);
      if (itemId === "group") {
        if (friends.length === 0 && !isLoadingFriends) {
          void loadFriends();
        }
        setIsCreateGroupOpen(true);
        return;
      }
      if (itemId === "friend") {
        setIsAddFriendOpen(true);
        return;
      }
      if (itemId === "note") {
        setIsNewNoteOpen(true);
      }
    };

    return (
      <div className="flex h-full w-[300px] flex-col border-r border-border bg-bg-secondary backdrop-blur-md">
        <div className="flex-shrink-0 border-b border-border p-4">
          <div className="flex items-center space-x-2">
            <div className="group relative flex-1">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-bg-tertiary pl-10 pr-4 text-sm text-text-primary transition-all placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <svg
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-primary"
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
            </div>

            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => setIsMenuOpen((previous) => !previous)}
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
                  isMenuOpen
                    ? "rotate-45 border-primary bg-primary text-white shadow-glow-primary"
                    : "border-border bg-bg-tertiary text-text-primary hover:border-primary hover:bg-bg-hover hover:text-primary"
                }`}
                title="More actions"
              >
                <svg
                  className="h-5 w-5 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {isMenuOpen ? (
                <div
                  ref={menuRef}
                  className="animate-in fade-in slide-in-from-top-2 absolute right-0 top-full z-50 mt-2 w-44 rounded-lg border border-border bg-bg-elevated py-1 shadow-xl duration-150"
                >
                  <div className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 rounded-sm border-l border-t border-border bg-bg-elevated" />
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className="group relative flex w-full items-center px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                    >
                      <span className="mr-3 text-text-tertiary transition-colors group-hover:text-primary">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted min-h-0 flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onClick={() => onSelect(conversation.id)}
              />
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              No matching conversations.
            </div>
          )}
        </div>

        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          onSuccess={(createdGroup) => {
            setIsCreateGroupOpen(false);
            onNewConversation?.({
              id: createdGroup.id,
              name: createdGroup.name,
              type: "group",
            });
          }}
          friends={friends}
          isFriendsLoading={isLoadingFriends}
          friendLoadError={friendLoadError}
        />

        <AddFriendModal
          isOpen={isAddFriendOpen}
          onClose={() => setIsAddFriendOpen(false)}
          onSuccess={() => {
            setIsAddFriendOpen(false);
            void loadFriends();
          }}
        />

        <NewNoteModal
          isOpen={isNewNoteOpen}
          onClose={() => setIsNewNoteOpen(false)}
          onSuccess={() => {
            setIsNewNoteOpen(false);
            onNewConversation?.();
          }}
        />
      </div>
    );
  },
);

ConversationList.displayName = "ConversationList";
