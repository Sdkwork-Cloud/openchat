/**
 * 联系人详情组件
 *
 * 职责：渲染联系人/群组详情
 */

import { memo } from 'react';
import type { Friend, Group } from '../entities/contact.entity';
import type { CallType } from '../../rtc/entities/rtc.entity';
import { FriendDetail } from './FriendDetail';
import { GroupDetail } from './GroupDetail';
import { EmptyContact } from './EmptyContact';

interface ContactDetailProps {
  friend?: Friend;
  group?: Group;
  onCall?: (callType: CallType) => void;
}

export const ContactDetail = memo(({ friend, group, onCall }: ContactDetailProps) => {
  if (friend) {
    return <FriendDetail friend={friend} onCall={onCall} />;
  }

  if (group) {
    return <GroupDetail group={group} />;
  }

  return <EmptyContact />;
});

ContactDetail.displayName = 'ContactDetail';
