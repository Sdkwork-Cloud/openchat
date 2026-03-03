/**
 * 联系�?Hook - 增强�?
 *
 * 职责�?
 * 1. 管理联系人列表状�?
 * 2. 提供筛选和搜索功能
 * 3. 处理好友申请
 * 4. 管理联系人分�?
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Friend, Group, ContactTab, FriendFilter, FriendRequest, ContactGroup } from '../entities/contact.entity';
import {
  getFriends,
  getFriendRequests,
  processFriendRequest,
  searchContacts,
  getContactGroups,
  createContactGroup,
  deleteFriend,
  updateFriendRemark,
  getFriendStats,
  addFriend,
} from '../services';

export interface UseContactsReturn {
  // 状�?
  friends: Friend[];
  groups: Group[];
  friendRequests: FriendRequest[];
  contactGroups: ContactGroup[];
  activeTab: ContactTab;
  filter: FriendFilter;
  selectedFriend: Friend | undefined;
  selectedGroup: Group | undefined;
  searchKeyword: string;
  searchResults: Friend[];
  isSearching: boolean;
  isLoading: boolean;
  stats: {
    total: number;
    online: number;
    newToday: number;
    pendingRequests: number;
  };

  // 分组后的好友
  groupedFriends: Record<string, Friend[]>;
  sortedInitials: string[];

  // 操作方法
  setActiveTab: (tab: ContactTab) => void;
  setFilter: (filter: FriendFilter) => void;
  selectContact: (id: string | null) => void;
  search: (keyword: string) => Promise<void>;
  clearSearch: () => void;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  updateRemark: (friendId: string, remark: string) => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  addNewFriend: (userId: string, message?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useContacts(): UseContactsReturn {
  // 状�?
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [activeTab, setActiveTab] = useState<ContactTab>('friends');
  const [filter, setFilter] = useState<FriendFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    newToday: 0,
    pendingRequests: 0,
  });

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [friendsData, requestsData, groupsData, statsData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
        getContactGroups(),
        getFriendStats(),
      ]);

      setFriends(friendsData);
      setFriendRequests(requestsData);
      setContactGroups(groupsData);
      setStats({
        ...statsData,
        pendingRequests: requestsData.filter((r) => r.status === 'pending').length,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 按首字母分组
  const groupedFriends = useMemo(() => {
    let filtered = friends;

    // 应用筛�?
    if (filter === 'online') {
      filtered = friends.filter((f) => f.isOnline);
    }

    // 应用搜索
    if (searchKeyword) {
      filtered = searchResults;
    }

    return filtered.reduce((acc, friend) => {
      const initial = friend.initial || '#';
      if (!acc[initial]) {
        acc[initial] = [];
      }
      acc[initial].push(friend);
      return acc;
    }, {} as Record<string, Friend[]>);
  }, [friends, filter, searchKeyword, searchResults]);

  const sortedInitials = useMemo(() => {
    return Object.keys(groupedFriends).sort();
  }, [groupedFriends]);

  const selectedFriend = useMemo(() => {
    return friends.find((f) => f.id === selectedId);
  }, [friends, selectedId]);

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedId);
  }, [groups, selectedId]);

  // 搜索联系�?
  const search = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      clearSearch();
      return;
    }

    setIsSearching(true);
    setSearchKeyword(keyword);
    try {
      const results = await searchContacts({ keyword: keyword.trim() });
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchKeyword('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // 选择联系�?
  const selectContact = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // 接受好友申请
  const acceptFriendRequest = useCallback(async (requestId: string) => {
    const result = await processFriendRequest({ requestId, action: 'accept' });
    if (result.success) {
      await loadData(); // 刷新数据
    }
  }, [loadData]);

  // 拒绝好友申请
  const rejectFriendRequest = useCallback(async (requestId: string) => {
    const result = await processFriendRequest({ requestId, action: 'reject' });
    if (result.success) {
      setFriendRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r))
      );
    }
  }, []);

  // 删除好友
  const removeFriend = useCallback(async (friendId: string) => {
    const result = await deleteFriend(friendId);
    if (result.success) {
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      if (selectedId === friendId) {
        setSelectedId(null);
      }
    }
  }, [selectedId]);

  // 更新备注
  const updateRemark = useCallback(async (friendId: string, remark: string) => {
    const result = await updateFriendRemark(friendId, remark);
    if (result.success) {
      setFriends((prev) =>
        prev.map((f) => (f.id === friendId ? { ...f, remark } : f))
      );
    }
  }, []);

  // 创建分组
  const createGroup = useCallback(async (name: string) => {
    const group = await createContactGroup(name);
    setContactGroups((prev) => [...prev, group]);
  }, []);

  // 添加好友
  const addNewFriend = useCallback(async (userId: string, message?: string) => {
    await addFriend({ userId, message });
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    friends,
    groups,
    friendRequests,
    contactGroups,
    activeTab,
    filter,
    selectedFriend,
    selectedGroup,
    searchKeyword,
    searchResults,
    isSearching,
    isLoading,
    stats,
    groupedFriends,
    sortedInitials,
    setActiveTab,
    setFilter,
    selectContact,
    search,
    clearSearch,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    updateRemark,
    createGroup,
    addNewFriend,
    refresh,
  };
}
