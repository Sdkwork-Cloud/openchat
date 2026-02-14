/**
 * 联系人 API 服务
 * 处理好友、好友申请、联系人分组等接口
 */

import apiClient from './api.client';

// 好友类型
export interface Friend {
  id: string;
  username?: string;
  nickname: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
  isOnline?: boolean;
  remark?: string;
  signature?: string;
  region?: string;
  initial?: string;
  createdAt?: string;
}

// 好友申请类型
export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar?: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: string;
}

// 联系人分组类型
export interface ContactGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdAt?: string;
}

// 搜索联系人参数
export interface SearchContactsParams {
  keyword?: string;
  region?: string;
  isOnline?: boolean;
}

// 添加好友参数
export interface AddFriendParams {
  userId: string;
  message?: string;
}

// 处理好友申请参数
export interface ProcessFriendRequestParams {
  requestId: string;
  action: 'accept' | 'reject';
}

// 好友统计
export interface FriendStats {
  total: number;
  online: number;
  newToday: number;
}

/**
 * 获取好友列表
 */
export async function getFriends(): Promise<Friend[]> {
  return apiClient.get<Friend[]>('/friends');
}

/**
 * 搜索联系人
 */
export async function searchContacts(params: SearchContactsParams): Promise<Friend[]> {
  return apiClient.get<Friend[]>('/friends/search', { params: params as Record<string, string | number | boolean> });
}

/**
 * 获取好友详情
 */
export async function getFriendDetail(friendId: string): Promise<Friend> {
  return apiClient.get<Friend>(`/friends/${friendId}`);
}

/**
 * 添加好友
 */
export async function addFriend(params: AddFriendParams): Promise<{ success: boolean; error?: string }> {
  return apiClient.post<{ success: boolean; error?: string }>('/friends/requests', params);
}

/**
 * 删除好友
 */
export async function deleteFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.delete<{ success: boolean; error?: string }>(`/friends/${friendId}`);
}

/**
 * 获取好友申请列表
 */
export async function getFriendRequests(): Promise<FriendRequest[]> {
  return apiClient.get<FriendRequest[]>('/friends/requests');
}

/**
 * 处理好友申请
 */
export async function processFriendRequest(
  params: ProcessFriendRequestParams
): Promise<{ success: boolean; error?: string }> {
  return apiClient.post<{ success: boolean; error?: string }>(`/friends/requests/${params.requestId}/${params.action}`);
}

/**
 * 更新好友备注
 */
export async function updateFriendRemark(
  friendId: string,
  remark: string
): Promise<{ success: boolean; error?: string }> {
  return apiClient.put<{ success: boolean; error?: string }>(`/friends/${friendId}/remark`, { remark });
}

/**
 * 获取联系人分组列表
 */
export async function getContactGroups(): Promise<ContactGroup[]> {
  return apiClient.get<ContactGroup[]>('/contacts/groups');
}

/**
 * 创建联系人分组
 */
export async function createContactGroup(name: string): Promise<ContactGroup> {
  return apiClient.post<ContactGroup>('/contacts/groups', { name });
}

/**
 * 更新联系人分组
 */
export async function updateContactGroup(
  groupId: string,
  updates: { name?: string; memberIds?: string[] }
): Promise<ContactGroup> {
  return apiClient.put<ContactGroup>(`/contacts/groups/${groupId}`, updates);
}

/**
 * 删除联系人分组
 */
export async function deleteContactGroup(groupId: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/contacts/groups/${groupId}`);
}

/**
 * 获取好友统计
 */
export async function getFriendStats(): Promise<FriendStats> {
  return apiClient.get<FriendStats>('/friends/stats');
}

// 默认导出
export default {
  getFriends,
  searchContacts,
  getFriendDetail,
  addFriend,
  deleteFriend,
  getFriendRequests,
  processFriendRequest,
  updateFriendRemark,
  getContactGroups,
  createContactGroup,
  updateContactGroup,
  deleteContactGroup,
  getFriendStats,
};
