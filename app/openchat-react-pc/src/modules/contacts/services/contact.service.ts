/**
 * 联系人服务
 *
 * 职责：
 * 1. 好友管理（添加、删除、拉黑）
 * 2. 好友申请处理
 * 3. 联系人搜索
 * 4. 联系人分组
 *
 * 注意：此服务已对接真实 API，不再使用 Mock 数据
 */

import contactsApi, {
  type Friend,
  type FriendRequest,
  type ContactGroup,
  type SearchContactsParams,
  type AddFriendParams,
  type ProcessFriendRequestParams,
  type FriendStats,
} from '@/services/contacts.api';

// 重新导出类型
export type { Friend, FriendRequest, ContactGroup, SearchContactsParams, AddFriendParams, ProcessFriendRequestParams, FriendStats };

/**
 * 搜索联系人
 */
export async function searchContacts(params: SearchContactsParams): Promise<Friend[]> {
  try {
    return await contactsApi.searchContacts(params);
  } catch (error) {
    console.error('搜索联系人失败:', error);
    throw error;
  }
}

/**
 * 获取好友列表
 */
export async function getFriends(): Promise<Friend[]> {
  try {
    return await contactsApi.getFriends();
  } catch (error) {
    console.error('获取好友列表失败:', error);
    throw error;
  }
}

/**
 * 获取好友详情
 */
export async function getFriendDetail(friendId: string): Promise<Friend | null> {
  try {
    return await contactsApi.getFriendDetail(friendId);
  } catch (error) {
    console.error('获取好友详情失败:', error);
    return null;
  }
}

/**
 * 添加好友
 */
export async function addFriend(params: AddFriendParams): Promise<{ success: boolean; error?: string }> {
  try {
    return await contactsApi.addFriend(params);
  } catch (error: any) {
    console.error('添加好友失败:', error);
    return {
      success: false,
      error: error.message || '添加好友失败',
    };
  }
}

/**
 * 删除好友
 */
export async function deleteFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  try {
    return await contactsApi.deleteFriend(friendId);
  } catch (error: any) {
    console.error('删除好友失败:', error);
    return {
      success: false,
      error: error.message || '删除好友失败',
    };
  }
}

/**
 * 获取好友申请列表
 */
export async function getFriendRequests(): Promise<FriendRequest[]> {
  try {
    return await contactsApi.getFriendRequests();
  } catch (error) {
    console.error('获取好友申请列表失败:', error);
    throw error;
  }
}

/**
 * 处理好友申请
 */
export async function processFriendRequest(
  params: ProcessFriendRequestParams
): Promise<{ success: boolean; error?: string }> {
  try {
    return await contactsApi.processFriendRequest(params);
  } catch (error: any) {
    console.error('处理好友申请失败:', error);
    return {
      success: false,
      error: error.message || '处理好友申请失败',
    };
  }
}

/**
 * 获取联系人分组
 */
export async function getContactGroups(): Promise<ContactGroup[]> {
  try {
    return await contactsApi.getContactGroups();
  } catch (error) {
    console.error('获取联系人分组失败:', error);
    throw error;
  }
}

/**
 * 创建联系人分组
 */
export async function createContactGroup(name: string): Promise<ContactGroup> {
  try {
    return await contactsApi.createContactGroup(name);
  } catch (error) {
    console.error('创建联系人分组失败:', error);
    throw error;
  }
}

/**
 * 更新联系人分组
 */
export async function updateContactGroup(
  groupId: string,
  updates: { name?: string; memberIds?: string[] }
): Promise<ContactGroup> {
  try {
    return await contactsApi.updateContactGroup(groupId, updates);
  } catch (error) {
    console.error('更新联系人分组失败:', error);
    throw error;
  }
}

/**
 * 删除联系人分组
 */
export async function deleteContactGroup(groupId: string): Promise<{ success: boolean }> {
  try {
    return await contactsApi.deleteContactGroup(groupId);
  } catch (error: any) {
    console.error('删除联系人分组失败:', error);
    return { success: false };
  }
}

/**
 * 更新好友备注
 */
export async function updateFriendRemark(
  friendId: string,
  remark: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await contactsApi.updateFriendRemark(friendId, remark);
  } catch (error: any) {
    console.error('更新好友备注失败:', error);
    return {
      success: false,
      error: error.message || '更新好友备注失败',
    };
  }
}

/**
 * 获取好友统计
 */
export async function getFriendStats(): Promise<FriendStats> {
  try {
    return await contactsApi.getFriendStats();
  } catch (error) {
    console.error('获取好友统计失败:', error);
    // 返回默认统计
    return {
      total: 0,
      online: 0,
      newToday: 0,
    };
  }
}

// 默认导出
export default {
  searchContacts,
  getFriends,
  getFriendDetail,
  addFriend,
  deleteFriend,
  getFriendRequests,
  processFriendRequest,
  getContactGroups,
  createContactGroup,
  updateContactGroup,
  deleteContactGroup,
  updateFriendRemark,
  getFriendStats,
};
