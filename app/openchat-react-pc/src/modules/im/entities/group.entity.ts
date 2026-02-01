/**
 * 群聊实体
 *
 * 职责：定义群聊相关的领域模型
 */

export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: GroupRole;
  isOnline?: boolean;
  joinTime?: string;
  muteEndTime?: string; // 禁言结束时间
}

export interface GroupNotice {
  id: string;
  groupId: string;
  content: string;
  publisherId: string;
  publisherName: string;
  publishTime: string;
  isPinned: boolean;
}

export interface GroupSettings {
  allowInvite: boolean; // 允许成员邀请
  allowMemberModify: boolean; // 允许成员修改群信息
  needVerify: boolean; // 入群需要验证
  showMemberCount: boolean; // 显示成员数量
}

export interface Group {
  id: string;
  name: string;
  avatar: string;
  memberCount: number;
  maxMembers?: number;
  description?: string;
  creatorId: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: string;
  updatedAt?: string;
  settings: GroupSettings;
  notices: GroupNotice[];
}

export interface CreateGroupFormData {
  name: string;
  description?: string;
  selectedMemberIds: string[];
}

export interface GroupSearchResult {
  groups: Group[];
  total: number;
}
