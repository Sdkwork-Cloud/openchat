import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, ConversationType } from "../entities/conversation.entity";
import { ConversationResultService } from "../services";

export interface UseConversationsReturn {
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  isLoading: boolean;
  totalUnreadCount: number;
  filterByType: (type: ConversationType | null) => void;
  search: (keyword: string) => void;
  refresh: () => Promise<void>;
}

export function useConversations(selectedId: string | null): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ConversationType | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isFirstLoad = useRef(true);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const listResult = await ConversationResultService.getConversations({
        type: typeFilter || undefined,
        keyword: searchKeyword || undefined,
      });

      if (!listResult.success) {
        console.error("Failed to load conversations:", listResult.error);
        return;
      }

      setConversations(listResult.data || []);

      const unreadResult = await ConversationResultService.getTotalUnreadCount();
      if (!unreadResult.success) {
        console.error("Failed to load unread count:", unreadResult.error);
      } else {
        setTotalUnreadCount(unreadResult.data ?? 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchKeyword, typeFilter]);

  useEffect(() => {
    if (!isFirstLoad.current) {
      return;
    }

    isFirstLoad.current = false;
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const subscribeResult = ConversationResultService.onConversationUpdated(
      (updatedConversation: Conversation) => {
        setConversations((prev) => {
          const index = prev.findIndex((item) => item.id === updatedConversation.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedConversation;
            return next;
          }
          return [updatedConversation, ...prev];
        });
      },
    );

    if (!subscribeResult.success || typeof subscribeResult.data !== "function") {
      console.error("Failed to register conversation listener:", subscribeResult.error);
      return;
    }

    unsubscribeRef.current = subscribeResult.data;
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, []);

  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (typeFilter) {
      result = result.filter((item) => item.type === typeFilter);
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.lastMessage.toLowerCase().includes(keyword),
      );
    }

    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  }, [conversations, searchKeyword, typeFilter]);

  const selectedConversation = useMemo(() => {
    return conversations.find((item) => item.id === selectedId);
  }, [conversations, selectedId]);

  const filterByType = useCallback((type: ConversationType | null) => {
    setTypeFilter(type);
  }, []);

  const search = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
  }, []);

  const refresh = useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  return {
    conversations: filteredConversations,
    selectedConversation,
    isLoading,
    totalUnreadCount,
    filterByType,
    search,
    refresh,
  };
}
