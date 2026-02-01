/**
 * 消息 Hook - SDK实现版
 *
 * 职责：
 * 1. 管理消息列表状态
 * 2. 处理发送消息（支持多媒体、回复、@提及）
 * 3. 消息状态管理（发送中、已发送、已送达、已读）
 * 4. 消息撤回和删除
 * 5. 消息搜索
 *
 * 注意：此Hook通过SDK服务与服务器通信，不再使用模拟数据
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Message, MessageStatus } from '../entities/message.entity';
import type { MessageContent } from '../services/message.service';
import {
  sendMessage as sendMessageService,
  getMessages,
  recallMessage,
  deleteMessage,
  searchMessages,
  markMessagesAsRead,
  updateMessageStatus,
} from '../services/message.service';
import { registerSDKEvents } from '../adapters/sdk-adapter';

export interface UseMessagesReturn {
  // 状态
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  hasMore: boolean;
  searchResults: Message[];
  isSearching: boolean;
  unreadCount: number;

  // 操作方法
  sendMessage: (content: MessageContent, replyToMessageId?: string, mentions?: string[]) => Promise<void>;
  recallMessage: (messageId: string) => Promise<{ success: boolean; error?: string }>;
  deleteMessage: (messageId: string) => Promise<void>;
  searchMessages: (keyword: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: (messageIds?: string[]) => Promise<void>;
  clearSearch: () => void;

  // 工具方法
  getMessageById: (messageId: string) => Message | undefined;
}

export function useMessages(conversationId: string | null): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadedMessageIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 加载消息列表
  const loadMessages = useCallback(async (beforeMessageId?: string) => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      const newMessages = await getMessages({
        conversationId,
        beforeMessageId,
        limit: 50,
      });

      if (newMessages.length < 50) {
        setHasMore(false);
      }

      // 记录已加载的消息ID
      newMessages.forEach((m) => loadedMessageIds.current.add(m.id));

      if (beforeMessageId) {
        // 加载更多（历史消息）
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        // 初始加载
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // 初始加载
  useEffect(() => {
    if (conversationId && isFirstLoad.current) {
      isFirstLoad.current = false;
      loadMessages();
    }
  }, [conversationId, loadMessages]);

  // 注册SDK事件监听
  useEffect(() => {
    if (!conversationId) return;

    // 注册消息接收事件
    const unsubscribe = registerSDKEvents({
      onMessageReceived: (message: Message) => {
        // 只处理当前会话的消息
        if (message.conversationId === conversationId) {
          setMessages((prev) => {
            // 检查是否已存在
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });

          // 自动标记为已读
          if (message.senderId !== 'current-user') {
            markMessagesAsRead(conversationId, [message.id]);
          }
        }
      },
      onMessageSent: (message: Message) => {
        // 更新已发送消息的状态
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id ? { ...m, status: 'sent' as MessageStatus } : m
          )
        );
      },
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [conversationId]);

  // 发送消息
  const sendMessage = useCallback(
    async (content: MessageContent, replyToMessageId?: string, mentions?: string[]) => {
      if (!conversationId) return;

      // 乐观更新：立即添加到列表
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: 'current-user',
        senderName: '我',
        senderAvatar: '👤',
        content,
        time: new Date().toISOString(),
        status: 'sending',
        replyToMessageId,
        mentions,
      };

      setMessages((prev) => [...prev, tempMessage]);

      try {
        const sentMessage = await sendMessageService({
          conversationId,
          content,
          replyToMessageId,
          mentions,
        });

        // 替换临时消息
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessage.id ? sentMessage : m))
        );
      } catch (error) {
        console.error('发送消息失败:', error);
        // 发送失败，更新状态
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMessage.id ? { ...m, status: 'failed' as MessageStatus } : m
          )
        );
      }
    },
    [conversationId]
  );

  // 撤回消息
  const handleRecallMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return { success: false, error: '会话不存在' };

      const result = await recallMessage(conversationId, messageId);

      if (result.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isRecalled: true, recallTime: new Date().toISOString() }
              : m
          )
        );
      }

      return result;
    },
    [conversationId]
  );

  // 删除消息
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;

      await deleteMessage(conversationId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [conversationId]
  );

  // 搜索消息
  const handleSearchMessages = useCallback(
    async (keyword: string) => {
      if (!conversationId || !keyword.trim()) return;

      setIsSearching(true);
      try {
        const results = await searchMessages(conversationId, keyword.trim());
        setSearchResults(results);
      } catch (error) {
        console.error('搜索消息失败:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [conversationId]
  );

  // 清除搜索
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // 加载更多消息
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || isLoading) return;

    const oldestMessage = messages[0];
    if (oldestMessage) {
      await loadMessages(oldestMessage.id);
    }
  }, [conversationId, hasMore, isLoading, messages, loadMessages]);

  // 标记已读
  const markAsRead = useCallback(
    async (messageIds?: string[]) => {
      if (!conversationId) return;

      try {
        await markMessagesAsRead(conversationId, messageIds);

        // 更新本地状态
        setMessages((prev) =>
          prev.map((m) => {
            if (messageIds) {
              return messageIds.includes(m.id) ? { ...m, status: 'read' as MessageStatus } : m;
            } else {
              return m.senderId !== 'current-user' && m.status !== 'read'
                ? { ...m, status: 'read' as MessageStatus }
                : m;
            }
          })
        );

        setUnreadCount(0);
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    },
    [conversationId]
  );

  // 获取消息
  const getMessageById = useCallback(
    (messageId: string) => {
      return messages.find((m) => m.id === messageId);
    },
    [messages]
  );

  // 计算未读数量
  useEffect(() => {
    const count = messages.filter(
      (m) => m.senderId !== 'current-user' && m.status !== 'read'
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
