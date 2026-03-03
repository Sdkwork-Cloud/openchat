/**
 * 联系人详情组件
 *
 * 职责：渲染联系人/群组详情
 */

import { memo } from 'react';
import type { Friend, Group } from '../entities/contact.entity';
import { FriendDetail } from './FriendDetail';
import { GroupDetail } from './GroupDetail';
import { EmptyContact } from './EmptyContact';

type CallType = 'audio' | 'video';

interface ContactDetailProps {
  friend?: Friend;
  group?: Group;
  groupMembers?: Friend[];
  onCall?: (callType: CallType) => void;
  onStartChat?: (friend: Friend) => void;
  onGroupUpdated?: (group: Group) => void;
  onGroupDeleted?: (groupId: string) => void;
}

export const ContactDetail = memo(
  ({ friend, group, groupMembers, onCall, onStartChat, onGroupUpdated, onGroupDeleted }: ContactDetailProps) => {
    if (friend) {
      return (
        <FriendDetail
          friend={friend}
          onCall={onCall}
          onStartChat={onStartChat}
        />
      );
    }

    if (group) {
      return (
        <GroupDetail
          group={group}
          members={groupMembers}
          onGroupUpdated={onGroupUpdated}
          onGroupDeleted={onGroupDeleted}
        />
      );
    }

    return <EmptyContact />;
  },
);

ContactDetail.displayName = 'ContactDetail';
