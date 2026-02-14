import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

export class Group {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  avatar?: string | ImageMediaResource;
  ownerId: string;
  maxMembers: number;
  announcement?: string;
  status: 'active' | 'dismissed' | 'banned';
  joinType: 'free' | 'approval' | 'forbidden';
  muteAll: boolean;
  resources?: Record<string, AnyMediaResource>;
  dismissedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class GroupMember {
  id: string;
  uuid: string;
  groupId: string;
  userId: string;
  nickname?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'joined' | 'pending' | 'kicked' | 'quit';
  muteUntil?: Date;
  lastReadSeq?: number;
  joinedAt: Date;
  updatedAt: Date;
}

export class GroupInvitation {
  id: string;
  uuid: string;
  groupId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
  expiresAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupManager {
  createGroup(group: Omit<Group, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<Group>;
  getGroupById(id: string): Promise<Group | null>;
  updateGroup(id: string, group: Partial<Group>): Promise<Group | null>;
  deleteGroup(id: string): Promise<boolean>;
  addMember(groupId: string, userId: string, role: 'admin' | 'member'): Promise<GroupMember>;
  removeMember(groupId: string, userId: string): Promise<boolean>;
  updateMemberRole(groupId: string, userId: string, role: 'admin' | 'member'): Promise<boolean>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  getGroupsByUserId(userId: string): Promise<Group[]>;
  sendGroupInvitation(groupId: string, inviterId: string, inviteeId: string, message?: string): Promise<GroupInvitation>;
  acceptGroupInvitation(invitationId: string): Promise<boolean>;
  rejectGroupInvitation(invitationId: string): Promise<boolean>;
  cancelGroupInvitation(invitationId: string): Promise<boolean>;
}
