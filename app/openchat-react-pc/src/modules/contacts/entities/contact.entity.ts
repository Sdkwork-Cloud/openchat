/**
 * 联系人实体
 *
 * 职责：定义联系人领域模型
 */

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status?: string;
  isOnline?: boolean;
  initial: string;
  region?: string;
  signature?: string;
  remark?: string; // 备注名
  phone?: string;
  email?: string;
  addTime?: string;
  lastContactTime?: string;
}

export interface Group {
  id: string;
  name: string;
  avatar: string;
  memberCount: number;
  description?: string;
  creatorId?: string;
  createdAt?: string;
}

export type ContactTab = 'friends' | 'groups' | 'requests';
export type FriendFilter = 'all' | 'online' | 'new';

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: string;
  handledAt?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  memberIds: string[];
  description?: string;
}

export interface ContactSearchResult {
  friends: Friend[];
  groups: Group[];
  total: number;
}
