import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { GroupInvitation } from './group-invitation.entity';
import { Group as GroupInterface, GroupManager } from './group.interface';
import { ContactService } from '../contact/contact.service';
import { ConversationService } from '../conversation/conversation.service';
import { GroupSyncService } from './group-sync.service';
import { BaseEntityService } from '../../common/base/entity.service';
import { EventBusService } from '../../common/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class GroupService extends BaseEntityService<Group> implements GroupManager {
  protected readonly logger = new Logger(GroupService.name);
  protected readonly entityName = 'Group';

  constructor(
    protected readonly dataSource: DataSource,
    @InjectRepository(Group)
    protected readonly repository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(GroupInvitation)
    private groupInvitationRepository: Repository<GroupInvitation>,
    private contactService: ContactService,
    private conversationService: ConversationService,
    private groupSyncService: GroupSyncService,
    eventBus: EventBusService,
    cacheService: CacheService,
  ) {
    super(dataSource, repository, eventBus, cacheService);
  }

  async createGroup(groupData: Omit<GroupInterface, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> {
    const group = this.repository.create(groupData);
    const savedGroup = await this.repository.save(group);

    const member = this.groupMemberRepository.create({
      groupId: savedGroup.id,
      userId: groupData.ownerId,
      role: 'owner',
      status: 'joined',
    });
    await this.groupMemberRepository.save(member);

    this.groupSyncService.syncGroupOnCreate(savedGroup).catch(error => {
      this.logger.error('Failed to sync group to WukongIM on create:', error);
    });

    this.groupSyncService.syncMemberOnJoin(savedGroup.id, groupData.ownerId).catch(error => {
      this.logger.error('Failed to sync owner to WukongIM channel:', error);
    });

    return savedGroup;
  }

  async getGroupById(id: string): Promise<Group | null> {
    return this.findOne(id);
  }

  async updateGroup(id: string, groupData: Partial<GroupInterface>): Promise<Group | null> {
    const group = await this.findOne(id);
    if (!group) return null;

    Object.assign(group, groupData);
    const updatedGroup = await this.repository.save(group);

    this.groupSyncService.syncGroupOnUpdate(updatedGroup).catch(error => {
      this.logger.error('Failed to sync group update to WukongIM:', error);
    });

    return updatedGroup;
  }

  async deleteGroup(id: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      this.groupSyncService.syncGroupOnDelete(id).catch(error => {
        this.logger.error('Failed to sync group delete to WukongIM:', error);
      });

      await manager.delete(GroupMember, { groupId: id });
      await manager.delete(GroupInvitation, { groupId: id });
      
      const result = await manager.delete(Group, id);
      return (result.affected || 0) > 0;
    });
  }

  async addMember(groupId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<GroupMember> {
    const group = await this.findOne(groupId);
    if (!group) throw new Error('Group not found');

    const existingMember = await this.groupMemberRepository.findOne({
      where: { groupId, userId },
    });
    if (existingMember) throw new Error('User already in group');

    const member = this.groupMemberRepository.create({
      groupId,
      userId,
      role,
      status: 'joined',
    });
    const savedMember = await this.groupMemberRepository.save(member);

    await this.createGroupContactAndConversation(userId, group);

    this.groupSyncService.syncMemberOnJoin(groupId, userId).catch(error => {
      this.logger.error('Failed to sync member join to WukongIM:', error);
    });

    return savedMember;
  }

  async removeMember(groupId: string, userId: string): Promise<boolean> {
    const result = await this.groupMemberRepository.delete({ groupId, userId });

    if (result.affected && result.affected > 0) {
      this.groupSyncService.syncMemberOnLeave(groupId, userId).catch(error => {
        this.logger.error('Failed to sync member leave to WukongIM:', error);
      });
    }

    return (result.affected || 0) > 0;
  }

  async updateMemberRole(groupId: string, userId: string, role: 'admin' | 'member'): Promise<boolean> {
    const member = await this.groupMemberRepository.findOne({ where: { groupId, userId } });
    if (!member || member.role === 'owner') return false;
    
    member.role = role;
    await this.groupMemberRepository.save(member);
    return true;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return this.groupMemberRepository.find({ where: { groupId } });
  }

  async getGroupsByUserId(userId: string): Promise<Group[]> {
    const members = await this.groupMemberRepository.find({
      where: { userId, status: 'joined' },
    });
    
    const groupIds = members.map(member => member.groupId);
    if (groupIds.length === 0) return [];
    
    return this.repository.find({ where: { id: In(groupIds), isDeleted: false } });
  }

  async sendGroupInvitation(groupId: string, inviterId: string, inviteeId: string, message?: string): Promise<GroupInvitation> {
    const group = await this.findOne(groupId);
    if (!group) throw new Error('Group not found');

    const isInviterMember = await this.groupMemberRepository.findOne({
      where: { groupId, userId: inviterId },
    });
    if (!isInviterMember) throw new Error('Inviter is not a group member');

    const isInviteeMember = await this.groupMemberRepository.findOne({
      where: { groupId, userId: inviteeId },
    });
    if (isInviteeMember) throw new Error('Invitee is already a group member');

    const existingInvitation = await this.groupInvitationRepository.findOne({
      where: { groupId, inviteeId, status: 'pending' },
    });
    if (existingInvitation) throw new Error('Invitation already sent');

    const invitation = this.groupInvitationRepository.create({
      groupId,
      inviterId,
      inviteeId,
      status: 'pending',
      message,
    });
    return this.groupInvitationRepository.save(invitation);
  }

  async acceptGroupInvitation(invitationId: string): Promise<boolean> {
    const invitation = await this.groupInvitationRepository.findOne({ where: { id: invitationId } });
    if (!invitation || invitation.status !== 'pending') return false;

    invitation.status = 'accepted';
    await this.groupInvitationRepository.save(invitation);

    const member = this.groupMemberRepository.create({
      groupId: invitation.groupId,
      userId: invitation.inviteeId,
      role: 'member',
      status: 'joined',
    });
    await this.groupMemberRepository.save(member);

    this.groupSyncService.syncMemberOnJoin(invitation.groupId, invitation.inviteeId).catch(error => {
      this.logger.error('Failed to sync member join to WukongIM on invitation accept:', error);
    });

    const group = await this.findOne(invitation.groupId);
    if (group) {
      await this.createGroupContactAndConversation(invitation.inviteeId, group);
    }

    return true;
  }

  async rejectGroupInvitation(invitationId: string): Promise<boolean> {
    const invitation = await this.groupInvitationRepository.findOne({ where: { id: invitationId } });
    if (!invitation || invitation.status !== 'pending') return false;

    invitation.status = 'rejected';
    await this.groupInvitationRepository.save(invitation);
    return true;
  }

  async cancelGroupInvitation(invitationId: string): Promise<boolean> {
    const invitation = await this.groupInvitationRepository.findOne({ where: { id: invitationId } });
    if (!invitation || invitation.status !== 'pending') return false;

    await this.groupInvitationRepository.delete(invitationId);
    return true;
  }

  private async createGroupContactAndConversation(userId: string, group: Group): Promise<void> {
    try {
      await this.contactService.createContact({
        userId,
        contactId: group.id,
        type: 'group',
        source: 'group',
        name: group.name,
      }).catch(err => {
        if (!err.message?.includes('已存在')) {
          this.logger.error('Failed to create group contact:', err);
        }
      });

      await this.conversationService.createConversation({
        type: 'group',
        userId,
        targetId: group.id,
      }).catch(err => {
        if (!err.message?.includes('已存在')) {
          this.logger.error('Failed to create group conversation:', err);
        }
      });
    } catch (error) {
      this.logger.error('Failed to auto create group contact and conversation:', error);
    }
  }

  async quitGroup(groupId: string, userId: string): Promise<boolean> {
    const group = await this.findOne(groupId);
    if (!group) throw new Error('Group not found');

    if (group.ownerId === userId) throw new Error('Group owner cannot quit the group');

    const member = await this.groupMemberRepository.findOne({ where: { groupId, userId } });
    if (!member) return false;

    member.status = 'quit';
    await this.groupMemberRepository.save(member);
    return true;
  }

  async muteMember(groupId: string, userId: string, duration: number, operatorId?: string): Promise<boolean> {
    if (operatorId) {
      const operator = await this.groupMemberRepository.findOne({
        where: { groupId, userId: operatorId, status: 'joined' },
      });
      
      if (!operator || (operator.role !== 'owner' && operator.role !== 'admin')) {
        throw new Error('Only group owner or admin can mute members');
      }
    }

    const member = await this.groupMemberRepository.findOne({
      where: { groupId, userId, status: 'joined' },
    });

    if (!member) return false;
    if (member.role === 'owner') throw new Error('Cannot mute group owner');

    if (duration <= 0) {
      member.muteUntil = undefined;
    } else {
      member.muteUntil = new Date(Date.now() + duration * 1000);
    }

    await this.groupMemberRepository.save(member);
    return true;
  }

  async transferGroup(groupId: string, operatorId: string, newOwnerId: string): Promise<Group | null> {
    const group = await this.findOne(groupId);
    if (!group) throw new Error('Group not found');

    if (group.ownerId !== operatorId) throw new Error('Only group owner can transfer the group');

    const newOwnerMember = await this.groupMemberRepository.findOne({
      where: { groupId, userId: newOwnerId, status: 'joined' },
    });

    if (!newOwnerMember) throw new Error('New owner must be a group member');

    const oldOwnerMember = await this.groupMemberRepository.findOne({
      where: { groupId, userId: operatorId },
    });

    if (oldOwnerMember) {
      oldOwnerMember.role = 'admin';
      await this.groupMemberRepository.save(oldOwnerMember);
    }

    newOwnerMember.role = 'owner';
    await this.groupMemberRepository.save(newOwnerMember);

    group.ownerId = newOwnerId;
    return this.repository.save(group);
  }
}
