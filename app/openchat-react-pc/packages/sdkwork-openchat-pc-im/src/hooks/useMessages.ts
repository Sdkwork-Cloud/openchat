import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, MessageStatus } from "../entities/message.entity";
import { registerSDKEvents } from "../adapters/sdk-adapter";
import type { MessageContent } from "../services";
import { MessageResultService } from "../services";

export interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  hasMore: boolean;
  searchResults: Message[];
  isSearching: boolean;
  unreadCount: number;
  sendMessage: (
    content: MessageContent,
    replyToMessageId?: string,
    mentions?: string[],
  ) => Promise<void>;
  recallMessage: (messageId: string) => Promise<{ success: boolean; error?: string }>;
  deleteMessage: (messageId: string) => Promise<void>;
  searchMessages: (keyword: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: (messageIds?: string[]) => Promise<void>;
  clearSearch: () => void;
  getMessageById: (messageId: string) => Message | undefined;
}

export function useMessages(conversationId: string | null): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadedMessageIds = useRef<Set<string>>(new Set());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const loadMessages = useCallback(
    async (beforeMessageId?: string) => {
      if (!conversationId) {
        return;
      }

      setIsLoading(true);
      try {
        const result = await MessageResultService.getMessages({
          conversationId,
          beforeMessageId,
          limit: 50,
        });

        if (!result.success) {
          console.error("Failed to load messages:", result.error);
          return;
        }

        const nextMessages = result.data || [];
        if (nextMessages.length < 50) {
          setHasMore(false);
        }

        nextMessages.forEach((item) => loadedMessageIds.current.add(item.id));

        if (beforeMessageId) {
          setMessages((prev) => [...nextMessages, ...prev]);
        } else {
          setMessages(nextMessages);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setSearchResults([]);
      setHasMore(true);
      setUnreadCount(0);
      loadedMessageIds.current.clear();
      return;
    }

    setMessages([]);
    setSearchResults([]);
    setHasMore(true);
    loadedMessageIds.current.clear();
    void loadMessages();
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const unsubscribe = registerSDKEvents({
      onMessageReceived: (message: Message) => {
        if (message.conversationId !== conversationId) {
          return;
        }

        setMessages((prev) => {
          if (prev.some((item) => item.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        if (message.senderId !== "current-user") {
          void MessageResultService.markMessagesAsRead(conversationId, [message.id]).then(
            (result) => {
              if (!result.success) {
                console.error("Failed to mark message as read:", result.error);
              }
            },
          );
        }
      },
      onMessageSent: (message: Message) => {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === message.id ? { ...item, status: "sent" as MessageStatus } : item,
          ),
        );
      },
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: MessageContent, replyToMessageId?: string, mentions?: string[]) => {
      if (!conversationId) {
        return;
      }

      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: "current-user",
        senderName: "Me",
        senderAvatar: "ME",
        content,
        time: new Date().toISOString(),
        status: "sending",
        replyToMessageId,
        mentions,
      };

      setMessages((prev) => [...prev, tempMessage]);

      try {
        const result = await MessageResultService.sendMessage({
          conversationId,
          content,
          replyToMessageId,
          mentions,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to send message.");
        }

        setMessages((prev) =>
          prev.map((item) => (item.id === tempMessage.id ? result.data! : item)),
        );
      } catch (error) {
        console.error("Failed to send message:", error);
        setMessages((prev) =>
          prev.map((item) =>
            item.id === tempMessage.id ? { ...item, status: "failed" as MessageStatus } : item,
          ),
        );
      }
    },
    [conversationId],
  );

  const handleRecallMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) {
        return { success: false, error: "Conversation not found." };
      }

      const result = await MessageResultService.recallMessage(conversationId, messageId);
      if (!result.success) {
        return { success: false, error: result.error || "Failed to recall message." };
      }

      const recallResponse = (result.data || {}) as { success?: boolean; error?: string };
      if (recallResponse.success === false) {
        return {
          success: false,
          error:
            typeof recallResponse.error === "string"
              ? recallResponse.error
              : "Failed to recall message.",
        };
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === messageId
            ? { ...item, isRecalled: true, recallTime: new Date().toISOString() }
            : item,
        ),
      );

      return { success: true };
    },
    [conversationId],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) {
        return;
      }

      const result = await MessageResultService.deleteMessage(conversationId, messageId);
      if (!result.success) {
        console.error("Failed to delete message:", result.error);
        return;
      }

      setMessages((prev) => prev.filter((item) => item.id !== messageId));
    },
    [conversationId],
  );

  const handleSearchMessages = useCallback(
    async (keyword: string) => {
      if (!conversationId || !keyword.trim()) {
        return;
      }

      setIsSearching(true);
      try {
        const result = await MessageResultService.searchMessages(conversationId, keyword.trim());
        if (!result.success) {
          console.error("Failed to search messages:", result.error);
          setSearchResults([]);
          return;
        }

        setSearchResults(result.data || []);
      } finally {
        setIsSearching(false);
      }
    },
    [conversationId],
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || isLoading) {
      return;
    }

    const oldestMessage = messages[0];
    if (oldestMessage) {
      await loadMessages(oldestMessage.id);
    }
  }, [conversationId, hasMore, isLoading, loadMessages, messages]);

  const markAsRead = useCallback(
    async (messageIds?: string[]) => {
      if (!conversationId) {
        return;
      }

      const result = await MessageResultService.markMessagesAsRead(conversationId, messageIds);
      if (!result.success) {
        console.error("Failed to mark messages as read:", result.error);
        return;
      }

      setMessages((prev) =>
        prev.map((item) => {
          if (messageIds) {
            return messageIds.includes(item.id)
              ? { ...item, status: "read" as MessageStatus }
              : item;
          }
          return item.senderId !== "current-user" && item.status !== "read"
            ? { ...item, status: "read" as MessageStatus }
            : item;
        }),
      );
      setUnreadCount(0);
    },
    [conversationId],
  );

  const getMessageById = useCallback(
    (messageId: string) => messages.find((item) => item.id === messageId),
    [messages],
  );

  useEffect(() => {
    const count = messages.filter(
      (item) => item.senderId !== "current-user" && item.status !== "read",
    ).length;
    setUnreadCount(count);
  }, [messages]);

  return {
    messages,
    isLoading,
    isTyping,
    hasMore,
    searchResults,
    isSearching,
    unreadCount,
    sendMessage,
    recallMessage: handleRecallMessage,
    deleteMessage: handleDeleteMessage,
    searchMessages: handleSearchMessages,
    loadMoreMessages,
    markAsRead,
    clearSearch,
    getMessageById,
  };
}
