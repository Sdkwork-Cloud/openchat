/**
 * 鑱旂郴浜?API 鏈嶅姟
 * 澶勭悊濂藉弸銆佸ソ鍙嬬敵璇枫€佽仈绯讳汉鍒嗙粍绛夋帴鍙? */

import apiClient from './api.client';

// 濂藉弸绫诲瀷
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

// 濂藉弸鐢宠绫诲瀷
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

// 鑱旂郴浜哄垎缁勭被鍨?export interface ContactGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdAt?: string;
}

// 鎼滅储鑱旂郴浜哄弬鏁?export interface SearchContactsParams {
  keyword?: string;
  region?: string;
  isOnline?: boolean;
}

// 娣诲姞濂藉弸鍙傛暟
export interface AddFriendParams {
  userId: string;
  message?: string;
}

// 澶勭悊濂藉弸鐢宠鍙傛暟
export interface ProcessFriendRequestParams {
  requestId: string;
  action: 'accept' | 'reject';
}

// 濂藉弸缁熻
export interface FriendStats {
  total: number;
  online: number;
  newToday: number;
}

/**
 * 鑾峰彇濂藉弸鍒楄〃
 */
export async function getFriends(): Promise<Friend[]> {
  return apiClient.get<Friend[]>('/friends');
}

/**
 * 鎼滅储鑱旂郴浜? */
export async function searchContacts(params: SearchContactsParams): Promise<Friend[]> {
  return apiClient.get<Friend[]>('/friends/search', { params: params as Record<string, string | number | boolean> });
}

/**
 * 鑾峰彇濂藉弸璇︽儏
 */
export async function getFriendDetail(friendId: string): Promise<Friend> {
  return apiClient.get<Friend>(`/friends/${friendId}`);
}

/**
 * 娣诲姞濂藉弸
 */
export async function addFriend(params: AddFriendParams): Promise<{ success: boolean; error?: string }> {
  return apiClient.post<{ success: boolean; error?: string }>('/friends/requests', params);
}

/**
 * 鍒犻櫎濂藉弸
 */
export async function deleteFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.delete<{ success: boolean; error?: string }>(`/friends/${friendId}`);
}

/**
 * 鑾峰彇濂藉弸鐢宠鍒楄〃
 */
export async function getFriendRequests(): Promise<FriendRequest[]> {
  return apiClient.get<FriendRequest[]>('/friends/requests');
}

/**
 * 澶勭悊濂藉弸鐢宠
 */
export async function processFriendRequest(
  params: ProcessFriendRequestParams
): Promise<{ success: boolean; error?: string }> {
  return apiClient.post<{ success: boolean; error?: string }>(`/friends/requests/${params.requestId}/${params.action}`);
}

/**
 * 鏇存柊濂藉弸澶囨敞
 */
export async function updateFriendRemark(
  friendId: string,
  remark: string
): Promise<{ success: boolean; error?: string }> {
  return apiClient.put<{ success: boolean; error?: string }>(`/friends/${friendId}/remark`, { remark });
}

/**
 * 鑾峰彇鑱旂郴浜哄垎缁勫垪琛? */
export async function getContactGroups(): Promise<ContactGroup[]> {
  return apiClient.get<ContactGroup[]>('/contacts/groups');
}

/**
 * 鍒涘缓鑱旂郴浜哄垎缁? */
export async function createContactGroup(name: string): Promise<ContactGroup> {
  return apiClient.post<ContactGroup>('/contacts/groups', { name });
}

/**
 * 鏇存柊鑱旂郴浜哄垎缁? */
export async function updateContactGroup(
  groupId: string,
  updates: { name?: string; memberIds?: string[] }
): Promise<ContactGroup> {
  return apiClient.put<ContactGroup>(`/contacts/groups/${groupId}`, updates);
}

/**
 * 鍒犻櫎鑱旂郴浜哄垎缁? */
export async function deleteContactGroup(groupId: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/contacts/groups/${groupId}`);
}

/**
 * 鑾峰彇濂藉弸缁熻
 */
export async function getFriendStats(): Promise<FriendStats> {
  return apiClient.get<FriendStats>('/friends/stats');
}

// 榛樿瀵煎嚭
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

