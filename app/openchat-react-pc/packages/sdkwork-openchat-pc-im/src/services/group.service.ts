import type { Group, GroupMember, GroupNotice, GroupRole, GroupSettings } from "../entities/group.entity";
import {
  addGroupMembers as sdkAddGroupMembers,
  createGroup as sdkCreateGroup,
  dissolveGroup as sdkDissolveGroup,
  getGroupDetail as sdkGetGroupDetail,
  getGroupList as sdkGetGroupList,
  getSDKClient,
  quitGroup as sdkQuitGroup,
  removeGroupMember as sdkRemoveGroupMember,
} from "../adapters/sdk-adapter";

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
  duration: number;
}

interface GroupRuntimePatch {
  notices: GroupNotice[];
  memberRoles: Record<string, GroupRole>;
  memberMuteEndTimes: Record<string, string>;
  ownerId?: string;
  settingsPatch?: Partial<GroupSettings>;
}

type GroupApiMethod = (...args: unknown[]) => Promise<unknown>;
type GroupApi = Record<string, GroupApiMethod>;

const runtimePatchMap = new Map<string, GroupRuntimePatch>();

function getRuntimePatch(groupId: string): GroupRuntimePatch {
  const existing = runtimePatchMap.get(groupId);
  if (existing) {
    return existing;
  }

  const created: GroupRuntimePatch = {
    notices: [],
    memberRoles: {},
    memberMuteEndTimes: {},
  };
  runtimePatchMap.set(groupId, created);
  return created;
}

function applyRuntimePatch(group: Group): Group {
  const patch = runtimePatchMap.get(group.id);
  if (!patch) {
    return group;
  }

  const members = group.members.map((member) => {
    const nextRole = patch.memberRoles[member.id];
    const nextMuteEnd = patch.memberMuteEndTimes[member.id];
    return {
      ...member,
      role: nextRole ?? member.role,
      muteEndTime: nextMuteEnd ?? member.muteEndTime,
    };
  });

  return {
    ...group,
    ownerId: patch.ownerId ?? group.ownerId,
    settings: patch.settingsPatch ? { ...group.settings, ...patch.settingsPatch } : group.settings,
    notices: patch.notices.length > 0 ? patch.notices : group.notices,
    members,
    memberCount: members.length > 0 ? members.length : group.memberCount,
    updatedAt: new Date().toISOString(),
  };
}

function getGroupApi(): GroupApi | null {
  const client = getSDKClient(false);
  if (!client) {
    return null;
  }

  const groupApi = (client as unknown as { im?: { groups?: GroupApi } }).im?.groups;
  return groupApi ?? null;
}

async function tryInvokeMethod(
  groupApi: GroupApi | null,
  methodName: string,
  args: unknown[],
): Promise<boolean> {
  if (!groupApi) {
    return false;
  }

  const method = groupApi[methodName];
  if (typeof method !== "function") {
    return false;
  }

  await method(...args);
  return true;
}

async function tryInvokeMethodVariants(
  groupApi: GroupApi | null,
  methodNames: string[],
  argVariants: unknown[][],
): Promise<boolean> {
  if (!groupApi) {
    return false;
  }

  for (const methodName of methodNames) {
    for (const args of argVariants) {
      try {
        const invoked = await tryInvokeMethod(groupApi, methodName, args);
        if (invoked) {
          return true;
        }
      } catch (error) {
        console.warn(`Group API method failed: ${methodName}`, error);
      }
    }
  }

  return false;
}

function assertGroupId(groupId: string): string | null {
  if (!groupId.trim()) {
    return "Group id is required.";
  }
  return null;
}

function assertMemberId(memberId: string): string | null {
  if (!memberId.trim()) {
    return "Member id is required.";
  }
  return null;
}

export async function createGroup(request: CreateGroupRequest): Promise<CreateGroupResponse> {
  if (!request.name.trim()) {
    return { success: false, error: "Group name is required." };
  }

  if (request.name.trim().length > 50) {
    return { success: false, error: "Group name must be shorter than 50 characters." };
  }

  if (request.memberIds.length < 2) {
    return { success: false, error: "At least two members are required." };
  }

  if (request.memberIds.length > 500) {
    return { success: false, error: "Group size cannot exceed 500 members." };
  }

  try {
    const group = await sdkCreateGroup(request.name.trim(), request.memberIds, {
      description: request.description,
      avatar: request.avatar,
    });
    runtimePatchMap.delete(group.id);
    return { success: true, group };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create group.";
    console.error("Failed to create group:", error);
    return { success: false, error: message };
  }
}

export async function getGroupList(): Promise<Group[]> {
  try {
    const groups = await sdkGetGroupList();
    return groups.map(applyRuntimePatch);
  } catch (error) {
    console.error("Failed to fetch group list:", error);
    throw error;
  }
}

export async function getGroupDetail(groupId: string): Promise<Group | null> {
  try {
    const group = await sdkGetGroupDetail(groupId);
    return group ? applyRuntimePatch(group) : null;
  } catch (error) {
    console.error("Failed to fetch group detail:", error);
    return null;
  }
}

export async function addGroupMembers(
  groupId: string,
  memberIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  if (memberIds.length === 0) {
    return { success: false, error: "At least one member is required." };
  }

  try {
    await sdkAddGroupMembers(groupId, memberIds);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add group members.";
    console.error("Failed to add group members:", error);
    return { success: false, error: message };
  }
}

export async function removeGroupMember(
  groupId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  const memberError = assertMemberId(memberId);
  if (memberError) {
    return { success: false, error: memberError };
  }

  try {
    await sdkRemoveGroupMember(groupId, memberId);

    const patch = runtimePatchMap.get(groupId);
    if (patch) {
      delete patch.memberRoles[memberId];
      delete patch.memberMuteEndTimes[memberId];
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove group member.";
    console.error("Failed to remove group member:", error);
    return { success: false, error: message };
  }
}

export async function setMemberRole(
  groupId: string,
  memberId: string,
  role: "admin" | "member",
): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  const memberError = assertMemberId(memberId);
  if (memberError) {
    return { success: false, error: memberError };
  }

  const roleValue = role === "admin" ? 1 : 0;
  const groupApi = getGroupApi();

  await tryInvokeMethodVariants(groupApi, ["setMemberRole"], [
    [groupId, memberId, roleValue],
    [{ groupId, memberId, role: roleValue }],
    [{ groupId, memberId, role }],
  ]);

  const patch = getRuntimePatch(groupId);
  patch.memberRoles[memberId] = role;
  return { success: true };
}

export async function muteMember(
  request: MuteMemberRequest,
): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(request.groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  const memberError = assertMemberId(request.memberId);
  if (memberError) {
    return { success: false, error: memberError };
  }

  if (request.duration < 0) {
    return { success: false, error: "Mute duration cannot be negative." };
  }

  const groupApi = getGroupApi();
  if (request.duration === 0) {
    await tryInvokeMethodVariants(groupApi, ["unmuteMember"], [
      [request.groupId, request.memberId],
      [{ groupId: request.groupId, memberId: request.memberId }],
    ]);

    const patch = getRuntimePatch(request.groupId);
    delete patch.memberMuteEndTimes[request.memberId];
    return { success: true };
  }

  await tryInvokeMethodVariants(groupApi, ["muteMember"], [
    [request.groupId, request.memberId, request.duration],
    [{ groupId: request.groupId, memberId: request.memberId, duration: request.duration }],
  ]);

  const muteEndTime = new Date(Date.now() + request.duration * 60 * 1000).toISOString();
  const patch = getRuntimePatch(request.groupId);
  patch.memberMuteEndTimes[request.memberId] = muteEndTime;
  return { success: true };
}

export async function publishNotice(
  groupId: string,
  content: string,
  isPinned: boolean = false,
): Promise<{ success: boolean; notice?: GroupNotice; error?: string }> {
  const groupError = assertGroupId(groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  const normalizedContent = content.trim();
  if (!normalizedContent) {
    return { success: false, error: "Notice content is required." };
  }

  const notice: GroupNotice = {
    id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    groupId,
    content: normalizedContent,
    isPinned,
    publisherId: "current-user",
    publisherName: "Current User",
    publishTime: new Date().toISOString(),
  };

  const groupApi = getGroupApi();
  await tryInvokeMethodVariants(groupApi, ["publishNotice", "addNotice", "postNotice"], [
    [groupId, normalizedContent, isPinned],
    [{ groupId, content: normalizedContent, isPinned }],
  ]);

  const patch = getRuntimePatch(groupId);
  patch.notices = [notice, ...patch.notices].sort((left, right) => {
    if (left.isPinned && !right.isPinned) {
      return -1;
    }
    if (!left.isPinned && right.isPinned) {
      return 1;
    }
    return new Date(right.publishTime).getTime() - new Date(left.publishTime).getTime();
  });

  return { success: true, notice };
}

export async function deleteNotice(
  groupId: string,
  noticeId: string,
): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  if (!noticeId.trim()) {
    return { success: false, error: "Notice id is required." };
  }

  const groupApi = getGroupApi();
  await tryInvokeMethodVariants(groupApi, ["deleteNotice", "removeNotice"], [
    [groupId, noticeId],
    [{ groupId, noticeId }],
  ]);

  const patch = getRuntimePatch(groupId);
  patch.notices = patch.notices.filter((notice) => notice.id !== noticeId);
  return { success: true };
}

export async function updateGroupSettings(
  request: UpdateGroupSettingsRequest,
): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(request.groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  const patch = getRuntimePatch(request.groupId);
  patch.settingsPatch = {
    ...(patch.settingsPatch ?? {}),
    ...request.settings,
  };

  const groupApi = getGroupApi();
  await tryInvokeMethodVariants(groupApi, ["updateGroup", "updateGroupSettings"], [
    [request.groupId, { settings: request.settings }],
    [{ groupId: request.groupId, settings: request.settings }],
  ]);

  return { success: true };
}

export async function leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  try {
    await sdkQuitGroup(groupId);
    runtimePatchMap.delete(groupId);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to leave group.";
    console.error("Failed to leave group:", error);
    return { success: false, error: message };
  }
}

export async function dissolveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  try {
    await sdkDissolveGroup(groupId);
    runtimePatchMap.delete(groupId);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to dissolve group.";
    console.error("Failed to dissolve group:", error);
    return { success: false, error: message };
  }
}

export async function transferOwnership(
  groupId: string,
  newOwnerId: string,
): Promise<{ success: boolean; error?: string }> {
  const groupError = assertGroupId(groupId);
  if (groupError) {
    return { success: false, error: groupError };
  }

  const memberError = assertMemberId(newOwnerId);
  if (memberError) {
    return { success: false, error: memberError };
  }

  const groupApi = getGroupApi();
  await tryInvokeMethodVariants(groupApi, ["transferOwnership", "changeOwner"], [
    [groupId, newOwnerId],
    [{ groupId, newOwnerId }],
  ]);

  const patch = getRuntimePatch(groupId);
  patch.ownerId = newOwnerId;
  patch.memberRoles[newOwnerId] = "owner";
  return { success: true };
}

export function isMemberMuted(member: GroupMember): boolean {
  if (!member.muteEndTime) {
    return false;
  }
  return new Date(member.muteEndTime) > new Date();
}

export function getMuteRemainingMinutes(member: GroupMember): number {
  if (!member.muteEndTime) {
    return 0;
  }
  const remaining = new Date(member.muteEndTime).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 60000));
}
