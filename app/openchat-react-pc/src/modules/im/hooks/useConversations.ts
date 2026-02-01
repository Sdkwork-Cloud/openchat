/**
 * 会话 Hook - SDK实现版
 *
 * 职责：
 * 1. 管理会话列表状态（通过SDK从服务器获取）
 * 2. 提供会话查询和筛选
 * 3. 实时更新会话列表
 *
 * 注意：此Hook通过SDK服务与服务器通信，不再使用模拟数据
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Conversation, ConversationType } from '../entities/conversation.entity';
import {
  getConversations,
  getTotalUnreadCount,
  onConversationUpdated,
} from '../services/conversation.service';

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
  const [searchKeyword, setSearchKeyword] = useState('');
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isFirstLoad = useRef(true);

  // 加载会话列表
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getConversations({
        type: typeFilter || undefined,
        keyword: searchKeyword || undefined,
      });
      setConversations(data);

      // 获取总未读数
      const unreadCount = await getTotalUnreadCount();
      setTotalUnreadCount(unreadCount);
    } catch (error) {
      console.error('加载会话列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, searchKeyword]);

  // 初始加载
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      loadConversations();
    }
  }, [loadConversations]);

  // 注册会话更新监听
  useEffect(() => {
    const unsubscribe = onConversationUpdated((updatedConversation: Conversation) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === updatedConversation.id);
        if (index !== -1) {
          // 更新现有会话
          const newConversations = [...prev];
          newConversations[index] = updatedConversation;
          return newConversations;
        } else {
          // 添加新会话到顶部
          return [updatedConversation, ...prev];
        }
      });
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // 筛选后的会话列表
  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (typeFilter) {
      result = result.filter((c) => c.type === typeFilter);
    }

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(keyword) ||
          c.lastMessage.toLowerCase().includes(keyword)
      );
    }

    // 按置顶和时间排序
    return result.sort((a, b) => {
      // 置顶会话排在前面
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 按最后消息时间排序
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  }, [conversations, typeFilter, searchKeyword]);

  // 选中的会话
  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedId);
  }, [conversations, selectedId]);

  // 按类型筛选
  const filterByType = useCallback((type: ConversationType | null) => {
    setTypeFilter(type);
  }, []);

  // 搜索
  const search = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
  }, []);

  // 刷新
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
