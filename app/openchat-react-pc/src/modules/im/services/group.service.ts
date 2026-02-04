/**
 * 群聊服务 - SDK实现版
 *
 * 职责：
 * 1. 创建群聊（通过SDK）
 * 2. 管理群成员（添加、移除、设置角色）
 * 3. 群公告管理
 * 4. 群禁言管理
 * 5. 群设置管理
 *
 * 注意：此服务完全基于OpenChat TypeScript SDK实现，不再使用模拟数据
 */

import type { Group, GroupMember, GroupNotice, GroupSettings } from '../entities/group.entity';
import {
  getSDKClient,
  getGroupList as sdkGetGroupList,
  getGroupDetail as sdkGetGroupDetail,
  createGroup as sdkCreateGroup,
  addGroupMembers as sdkAddGroupMembers,
  removeGroupMember as sdkRemoveGroupMember,
  quitGroup as sdkQuitGroup,
  dissolveGroup as sdkDissolveGroup,
  convertSDKGroupToFrontend,
  convertSDKGroupMemberToFrontend,
} from '../adapters/sdk-adapter';

export interface CreateGroupRequest {
  name: string;
  description?: string;
  memberIds: string[];
  avatar?: string;
}

export interface CreateGroupResponse {
  success: boolean;
  group?: Group;
  error?: string;
}

export interface UpdateGroupSettingsRequest {
  groupId: string;
  settings: Partial<GroupSettings>;
}

export interface MuteMemberRequest {
  groupId: string;
  memberId: string;
  duration: number; // 禁言时长（分钟），0表示取消禁言
}

/**
 * 创建群聊
 * 通过SDK创建
 */
export async function createGroup(request: CreateGroupRequest): Promise<CreateGroupResponse> {
  // 参数校验
  if (!request.name || request.name.trim().length === 0) {
    return { success: false, error: '群名称不能为空' };
  }

  if (request.name.length > 50) {
    return { success: false, error: '群名称不能超过50个字符' };
  }

  if (request.memberIds.length < 2) {
    return { success: false, error: '至少需要选择2个成员' };
  }

  if (request.memberIds.length > 500) {
    return { success: false, error: '群成员不能超过500人' };
  }

  try {
    const group = await sdkCreateGroup(request.name.trim(), request.memberIds, {
      description: request.description,
      avatar: request.avatar,
    });

    return {
      success: true,
      group,
    };
  } catch (error: any) {
    console.error('创建群聊失败:', error);
    return { success: false, error: error.message || '创建群聊失败' };
  }
}

/**
 * 获取群聊列表
 * 通过SDK从服务器获取
 */
export async function getGroupList(): Promise<Group[]> {
  try {
    return await sdkGetGroupList();
  } catch (error) {
    console.error('获取群聊列表失败:', error);
    throw error;
  }
}

/**
 * 获取群聊详情
 * 通过SDK从服务器获取
 */
export async function getGroupDetail(groupId: string): Promise<Group | null> {
  try {
    return await sdkGetGroupDetail(groupId);
  } catch (error) {
    console.error('获取群聊详情失败:', error);
    return null;
  }
}

/**
 * 添加群成员
 * 通过SDK添加
 */
export async function addGroupMembers(
  groupId: string,
  memberIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await sdkAddGroupMembers(groupId, memberIds);
    return { success: true };
  } catch (error: any) {
    console.error('添加群成员失败:', error);
    return { success: false, error: error.message || '添加群成员失败' };
  }
}

/**
 * 移除群成员
 * 通过SDK移除
 */
export async function removeGroupMember(
  groupId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sdkRemoveGroupMember(groupId, memberId);
    return { success: true };
  } catch (error: any) {
    console.error('移除群成员失败:', error);
    return { success: false, error: error.message || '移除群成员失败' };
  }
}

/**
 * 设置成员角色
 * 通过SDK设置
 */
export async function setMemberRole(
  groupId: string,
  memberId: string,
  role: 'admin' | 'member'
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSDKClient();
    const roleValue = role === 'admin' ? 1 : 0;
    await client.im.groups.setMemberRole(groupId, memberId, roleValue);
    return { success: true };
  } catch (error: any) {
    console.error('设置成员角色失败:', error);
    return { success: false, error: error.message || '设置成员角色失败' };
  }
}

/**
 * 禁言成员
 * 通过SDK设置
 */
export async function muteMember(request: MuteMemberRequest): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSDKClient();

    if (request.duration === 0) {
      // 取消禁言
      await client.im.groups.unmuteMember(request.groupId, request.memberId);
    } else {
      // 设置禁言
      await client.im.groups.muteMember(request.groupId, request.memberId, request.duration);
    }

    return { success: true };
  } catch (error: any) {
    console.error('禁言成员失败:', error);
    return { success: false, error: error.message || '禁言成员失败' };
  }
}

/**
 * 发布群公告
 * 通过SDK发布
 */
export async function publishNotice(
  groupId: string,
  content: string,
  isPinned: boolean = false
): Promise<{ success: boolean; notice?: GroupNotice; error?: string }> {
  try {
    const client = getSDKClient();

    const notice = await client.im.groups.publishNotice(groupId, {
      content: content.trim(),
      isPinned,
    });

    return { success: true, notice };
  } catch (error: any) {
    console.error('发布公告失败:', error);
    return { success: false, error: error.message || '发布公告失败' };
  }
}

/**
 * 删除群公告
 * 通过SDK删除
 */
export async function deleteNotice(
  groupId: string,
  noticeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSDKClient();
    await client.im.groups.deleteNotice(groupId, noticeId);
    return { success: true };
  } catch (error: any) {
    console.error('删除公告失败:', error);
    return { success: false, error: error.message || '删除公告失败' };
  }
}

/**
 * 更新群设置
 * 通过SDK更新
 */
export async function updateGroupSettings(
  request: UpdateGroupSettingsRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSDKClient();
    await client.im.groups.updateGroupInfo(request.groupId, {
      settings: request.settings,
    });
    return { success: true };
  } catch (error: any) {
    console.error('更新群设置失败:', error);
    return { success: false, error: error.message || '更新群设置失败' };
  }
}

/**
 * 退出群聊
 * 通过SDK退出
 */
export async function leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sdkQuitGroup(groupId);
    return { success: true };
  } catch (error: any) {
    console.error('退出群聊失败:', error);
    return { success: false, error: error.message || '退出群聊失败' };
  }
}

/**
 * 解散群聊
 * 通过SDK解散
 */
export async function dissolveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sdkDissolveGroup(groupId);
    return { success: true };
  } catch (error: any) {
    console.error('解散群聊失败:', error);
    return { success: false, error: error.message || '解散群聊失败' };
  }
}

/**
 * 转让群主
 * 通过SDK转让
 */
export async function transferOwnership(
  groupId: string,
  newOwnerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSDKClient();
    await client.im.groups.transferOwnership(groupId, newOwnerId);
    return { success: true };
  } catch (error: any) {
    console.error('转让群主失败:', error);
    return { success: false, error: error.message || '转让群主失败' };
  }
}

/**
 * 检查用户是否被禁言
 */
export function isMemberMuted(member: GroupMember): boolean {
  if (!member.muteEndTime) return false;
  return new Date(member.muteEndTime) > new Date();
}

/**
 * 获取禁言剩余时间（分钟）
 */
export function getMuteRemainingMinutes(member: GroupMember): number {
  if (!member.muteEndTime) return 0;
  const remaining = new Date(member.muteEndTime).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 60000));
}
